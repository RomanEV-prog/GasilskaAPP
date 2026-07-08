import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTarget } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Organization } from '../organizations/organization.entity';
import { SpinIntervention } from './spin-intervention.entity';

/** Javni RSS SPIN — "True" = takojšnji feed aktiviranih intervencij. */
const SPIN_FEED_URL = 'https://spin3.sos112.si/Javno/ODApi/True';
const SPIN_OBMOCJE_URL = 'https://spin3.sos112.si/api/javno/odObmocje';

interface SpinItem {
  guid: string;
  title: string;
  link?: string;
  description?: string;
  pubDate?: string;
}

export interface Obcina {
  id: number;
  naziv: string;
  regija: string;
}

/** Odstrani šumnike + male črke — za robustno ujemanje imen občin. */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

@Injectable()
export class SpinService implements OnModuleInit {
  private readonly logger = new Logger(SpinService.name);
  private obcineCache: { at: number; data: Obcina[] } | null = null;

  constructor(
    @InjectRepository(SpinIntervention)
    private readonly interventionsRepo: Repository<SpinIntervention>,
    @InjectRepository(Organization)
    private readonly orgsRepo: Repository<Organization>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Ob zagonu "napolni" bazo obstoječih guid-ov, da ob prvem zagonu
    // ne pošljemo poplave obvestil za stare intervencije.
    if (process.env.NODE_ENV === 'test') return;
    try {
      const existing = await this.interventionsRepo.count();
      if (existing === 0) {
        const items = await this.fetchFeed();
        for (const it of items) {
          await this.interventionsRepo.save(this.toEntity(it));
        }
        this.logger.log(
          `SPIN inicializacija: shranjenih ${items.length} obstoječih intervencij (brez obvestil).`,
        );
      }
    } catch (err) {
      this.logger.warn(`SPIN inicializacija ni uspela: ${(err as Error).message}`);
    }
  }

  /** Vsaki 2 minuti preveri nove intervencije in obvesti pristojna društva. */
  @Cron('*/2 * * * *')
  async pollInterventions(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    let items: SpinItem[];
    try {
      items = await this.fetchFeed();
    } catch (err) {
      this.logger.warn(`SPIN feed nedosegljiv: ${(err as Error).message}`);
      return;
    }

    // Društva, ki imajo nastavljeno občino (za obveščanje).
    const orgs = await this.orgsRepo.find({ where: { isActive: true } });
    const orgsWithObcina = orgs.filter((o) => !!o.spinObcina);

    for (const item of items) {
      const exists = await this.interventionsRepo.findOne({
        where: { spinGuid: item.guid },
      });
      if (exists) continue;

      const entity = this.toEntity(item);
      await this.interventionsRepo.save(entity);

      for (const org of orgsWithObcina) {
        if (this.itemMatchesObcina(item, org.spinObcina as string)) {
          await this.notifyOrg(org, entity).catch((err) =>
            this.logger.error(
              `SPIN obvestilo za ${org.slug} ni uspelo: ${(err as Error).message}`,
            ),
          );
        }
      }
    }
  }

  private async notifyOrg(
    org: Organization,
    it: SpinIntervention,
  ): Promise<void> {
    const type = it.spinType ?? 'Intervencija';
    const kraj = it.obcina ?? org.spinObcina;
    await this.notificationsService.create(org.id, null, {
      title: `🚨 SPIN: ${type}`,
      body: kraj ? `${type} — ${kraj}` : type,
      type: 'spin',
      target: NotificationTarget.OPERATIVE,
      data: {
        spinGuid: it.spinGuid,
        link: it.link,
        obcina: it.obcina,
        occurredAt: it.occurredAt?.toISOString(),
      },
    });
    this.logger.log(`SPIN obvestilo (${type}, ${kraj}) → ${org.slug}`);
  }

  /**
   * Ali intervencija spada v občino društva.
   * Sveže intervencije imajo v opisu golo ime občine (točno ujemanje);
   * pozneje se opis nadomesti z opisnim besedilom (podniz kot rezerva).
   */
  private itemMatchesObcina(item: SpinItem, obcina: string): boolean {
    const target = normalize(obcina);
    if (!target) return false;
    const desc = normalize(item.description ?? '');
    if (!desc) return false;
    if (desc === target) return true; // golo ime — sveža intervencija
    // Opisno besedilo: ime občine kot cela beseda ("obcina Ljubljana", ...).
    return new RegExp(`\\b${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(
      desc,
    );
  }

  private toEntity(item: SpinItem): SpinIntervention {
    // "Požar, eksplozija 8. 07. 2026 11:21" → vrsta = del pred datumom.
    const type = item.title.replace(/\s+\d{1,2}\.\s*\d{1,2}\.\s*\d{4}.*$/, '').trim();
    const descRaw = (item.description ?? '').trim();
    // Golo ime občine = kratek opis brez stavčnih ločil.
    const isBareObcina = descRaw.length > 0 && descRaw.length < 60 && !/[.]/.test(descRaw);
    return this.interventionsRepo.create({
      spinGuid: item.guid,
      spinType: type || undefined,
      obcina: isBareObcina ? descRaw : undefined,
      title: item.title.slice(0, 500),
      description: descRaw || undefined,
      link: item.link?.slice(0, 500),
      occurredAt: item.pubDate ? new Date(item.pubDate) : undefined,
    });
  }

  private async fetchFeed(): Promise<SpinItem[]> {
    const res = await fetch(SPIN_FEED_URL, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return this.parseRss(xml);
  }

  private parseRss(xml: string): SpinItem[] {
    const items: SpinItem[] = [];
    const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/g;
    const field = (block: string, tag: string): string | undefined => {
      const m = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(block);
      if (!m) return undefined;
      let v = m[1];
      const cdata = /<!\[CDATA\[([\s\S]*?)\]\]>/.exec(v);
      if (cdata) v = cdata[1];
      return decodeEntities(v);
    };
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(xml)) !== null) {
      const block = m[1];
      const guid = field(block, 'guid') ?? field(block, 'link');
      const title = field(block, 'title');
      if (!guid || !title) continue;
      items.push({
        guid,
        title,
        link: field(block, 'link'),
        description: field(block, 'description'),
        pubDate: field(block, 'pubDate'),
      });
    }
    return items;
  }

  /** Seznam občin za nastavitve (predpomnjen 24 h). */
  async listObcine(): Promise<Obcina[]> {
    if (this.obcineCache && Date.now() - this.obcineCache.at < 86_400_000) {
      return this.obcineCache.data;
    }
    const res = await fetch(SPIN_OBMOCJE_URL, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`SPIN občine HTTP ${res.status}`);
    const json = (await res.json()) as {
      value: { id: number; naziv: string; items: { id: number; naziv: string }[] }[];
    };
    const list: Obcina[] = [];
    for (const regija of json.value ?? []) {
      for (const o of regija.items ?? []) {
        list.push({ id: o.id, naziv: o.naziv, regija: regija.naziv });
      }
    }
    list.sort((a, b) => a.naziv.localeCompare(b.naziv, 'sl'));
    this.obcineCache = { at: Date.now(), data: list };
    return list;
  }

  /** Nedavne intervencije za občino društva. */
  async recentForOrg(organizationId: string, limit = 30): Promise<SpinIntervention[]> {
    const org = await this.orgsRepo.findOne({ where: { id: organizationId } });
    if (!org?.spinObcina) return [];
    const rows = await this.interventionsRepo.find({
      order: { occurredAt: 'DESC' },
      take: 300,
    });
    return rows
      .filter((r) =>
        this.itemMatchesObcina(
          { guid: r.spinGuid, title: r.title, description: r.description },
          org.spinObcina as string,
        ),
      )
      .slice(0, limit);
  }
}
