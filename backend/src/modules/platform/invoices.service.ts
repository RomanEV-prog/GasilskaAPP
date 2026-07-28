import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import {
  addMonths,
  extendSubscription,
} from '../../common/utils/subscription.util';
import { Organization } from '../organizations/organization.entity';
import { CreateInvoiceDto, MarkInvoicePaidDto } from './dto/platform.dto';
import { PlatformInvoice, toNumber } from './invoice.entity';
import { izdajatelj, izdajateljManjka } from './izdajatelj.config';

/** `Date` → `YYYY-MM-DD` (stolpci tipa `date` v bazi so nizi). */
function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const result = new Date(base.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

export interface InvoiceTotals {
  net: number;
  vat: number;
  gross: number;
}

/** Neto, DDV in skupni znesek računa. */
export function invoiceTotals(invoice: PlatformInvoice): InvoiceTotals {
  const net = toNumber(invoice.amount);
  const vat = Math.round(net * (toNumber(invoice.vatRate) / 100) * 100) / 100;
  return { net, vat, gross: Math.round((net + vat) * 100) / 100 };
}

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(PlatformInvoice)
    private readonly invoicesRepo: Repository<PlatformInvoice>,
    @InjectRepository(Organization)
    private readonly orgsRepo: Repository<Organization>,
    private readonly dataSource: DataSource,
  ) {}

  /** Podatki izdajatelja + opozorilo, česa še ni izpolnjenega. */
  getIssuer() {
    const podatki = izdajatelj();
    return { ...podatki, missing: izdajateljManjka(podatki) };
  }

  /**
   * Izda račun za naročnino društva.
   *
   * Obdobje se privzeto začne tam, kjer se naročnina izteče (oz. danes, če je
   * že potekla) — račun tako pokriva pravo prihodnje obdobje, ne pa nazaj.
   */
  async create(
    dto: CreateInvoiceDto,
    createdByUserId: string | null,
  ): Promise<PlatformInvoice> {
    const org = await this.orgsRepo.findOne({
      where: { id: dto.organizationId },
    });
    if (!org) {
      throw new NotFoundException('Društvo ni bilo najdeno.');
    }

    const nastavitve = izdajatelj();
    const today = new Date();

    const periodFrom = dto.periodFrom
      ? new Date(dto.periodFrom)
      : org.subscriptionExpiresAt &&
          org.subscriptionExpiresAt.getTime() > today.getTime()
        ? org.subscriptionExpiresAt
        : today;
    const periodTo = addMonths(periodFrom, dto.months);
    const dueAt = addDays(today, dto.dueDays ?? nastavitve.paymentDays);

    // Številka se dodeli v transakciji z zaklepom, da dva hkratna računa ne
    // dobita iste zaporedne številke.
    return this.dataSource.transaction(async (manager) => {
      const number = await this.nextNumber(manager, today.getFullYear());
      const invoice = manager.create(PlatformInvoice, {
        number,
        organizationId: org.id,
        issuedAt: toDateString(today),
        dueAt: toDateString(dueAt),
        periodFrom: toDateString(periodFrom),
        periodTo: toDateString(periodTo),
        months: dto.months,
        amount: dto.amount.toFixed(2),
        vatRate: (dto.vatRate ?? nastavitve.vatRate).toFixed(2),
        note: dto.note ?? null,
        createdByUserId,
      });
      return manager.save(invoice);
    });
  }

  /**
   * Naslednja zaporedna številka `YYYY-NNN`.
   *
   * Zaklep na ravni transakcije (`pg_advisory_xact_lock`) — brez njega bi dva
   * hkratna računa prebrala isti maksimum in trčila ob unikatni indeks.
   */
  private async nextNumber(
    manager: { query: (sql: string, params?: unknown[]) => Promise<any> },
    year: number,
  ): Promise<string> {
    await manager.query('SELECT pg_advisory_xact_lock($1)', [
      advisoryLockKey(year),
    ]);
    const rows = await manager.query(
      `SELECT number FROM platform_invoices
        WHERE number LIKE $1
        ORDER BY number DESC
        LIMIT 1`,
      [`${year}-%`],
    );
    const lastSeq = rows.length ? parseInt(rows[0].number.slice(5), 10) : 0;
    return `${year}-${String(lastSeq + 1).padStart(3, '0')}`;
  }

  /** Vsi računi, najnovejši prvi, z imenom društva in izračunanimi zneski. */
  async list() {
    const invoices = await this.invoicesRepo.find({
      order: { issuedAt: 'DESC', number: 'DESC' },
      take: 500,
    });
    const orgs = await this.orgsRepo.find();
    const nameById = new Map(orgs.map((o) => [o.id, o.name]));
    const today = toDateString(new Date());

    return invoices.map((invoice) => ({
      ...invoice,
      organizationName: nameById.get(invoice.organizationId) ?? '(izbrisano)',
      totals: invoiceTotals(invoice),
      status: invoice.cancelledAt
        ? 'cancelled'
        : invoice.paidAt
          ? 'paid'
          : invoice.dueAt < today
            ? 'overdue'
            : 'open',
    }));
  }

  /** Posamezen račun s podatki društva in izdajatelja (za izpis). */
  async findOne(id: string) {
    const invoice = await this.invoicesRepo.findOne({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Računa ni bilo mogoče najti.');
    }
    const org = await this.orgsRepo.findOne({
      where: { id: invoice.organizationId },
    });
    return {
      invoice,
      totals: invoiceTotals(invoice),
      organization: org,
      issuer: this.getIssuer(),
    };
  }

  /**
   * Označi račun kot plačan in (privzeto) podaljša naročnino društva za
   * obdobje računa. To je edino mesto, kjer se plačilo prevede v dostop.
   */
  async markPaid(
    id: string,
    dto: MarkInvoicePaidDto,
  ): Promise<PlatformInvoice> {
    const invoice = await this.invoicesRepo.findOne({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Računa ni bilo mogoče najti.');
    }
    if (invoice.cancelledAt) {
      throw new BadRequestException('Storniran račun ne more biti plačan.');
    }
    if (invoice.paidAt) {
      throw new BadRequestException('Račun je že označen kot plačan.');
    }

    invoice.paidAt = dto.paidAt ?? toDateString(new Date());

    if (dto.extendSubscription !== false) {
      const org = await this.orgsRepo.findOne({
        where: { id: invoice.organizationId },
      });
      // Neomejene naročnine ne omejimo nazaj na 12 mesecev — podaljšanje
      // neomejenega dostopa nima pomena, plačilo pa se vseeno zabeleži.
      if (org && org.subscriptionExpiresAt) {
        org.subscriptionExpiresAt = extendSubscription(
          org.subscriptionExpiresAt,
          invoice.months,
        );
        await this.orgsRepo.save(org);
      }
    }

    return this.invoicesRepo.save(invoice);
  }

  /** Storniraj račun (neplačan) — ostane v evidenci, a se ne šteje v dolg. */
  async cancel(id: string): Promise<PlatformInvoice> {
    const invoice = await this.invoicesRepo.findOne({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('Računa ni bilo mogoče najti.');
    }
    if (invoice.paidAt) {
      throw new BadRequestException(
        'Plačanega računa ni mogoče stornirati. Izdaj dobropis.',
      );
    }
    invoice.cancelledAt = new Date();
    return this.invoicesRepo.save(invoice);
  }

  /** Skupni odprti dolg in število zapadlih računov — za pregled na vrhu. */
  async summary() {
    const open = await this.invoicesRepo.find({
      where: { paidAt: IsNull(), cancelledAt: IsNull() },
    });
    const today = toDateString(new Date());
    const outstanding = open.reduce(
      (sum, inv) => sum + invoiceTotals(inv).gross,
      0,
    );
    const paidCount = await this.invoicesRepo.count({
      where: { paidAt: Not(IsNull()) },
    });

    return {
      openCount: open.length,
      overdueCount: open.filter((inv) => inv.dueAt < today).length,
      outstanding: Math.round(outstanding * 100) / 100,
      paidCount,
    };
  }
}

/** Ključ za `pg_advisory_xact_lock` — eno leto, en zaklep številčenja. */
function advisoryLockKey(year: number): number {
  return 100_000 + year;
}
