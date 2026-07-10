import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { NotificationTarget } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Organization } from '../organizations/organization.entity';
import { OBCINE, Obcina } from './obcine.data';
import { SpinIntervention } from './spin-intervention.entity';

export { Obcina };

/**
 * Bazni URL SPIN. SPIN (URSZR) geo-omejuje dostop na slovenske IP-je, zato
 * strežnik v tujini (npr. Hetzner DE) portala ne doseže. V tem primeru nastavi
 * `SPIN_BASE_URL` na slovenski reverse-proxy (relay), ki zrcali spin3.sos112.si.
 */
const SPIN_BASE_URL = (
  process.env.SPIN_BASE_URL || 'https://spin3.sos112.si'
).replace(/\/+$/, '');
/** Javni RSS SPIN — "True" = takojšnji feed aktiviranih intervencij. */
const SPIN_FEED_URL = `${SPIN_BASE_URL}/Javno/ODApi/True`;

interface SpinItem {
  guid: string;
  title: string;
  link?: string;
  description?: string;
  pubDate?: string;
}

/** Odstrani šumnike + male črke — za robustno ujemanje imen občin. */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Varno razčleni RFC 1123 datum; neveljaven → undefined (ne Invalid Date). */
function parseDate(s?: string): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
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
  /** Tabela dedup guid-ov je napolnjena → od zdaj naprej pošiljamo obvestila. */
  private primed = false;
  /** Preprečuje prekrivanje cron ciklov (če je feed počasen). */
  private polling = false;

  constructor(
    @InjectRepository(SpinIntervention)
    private readonly interventionsRepo: Repository<SpinIntervention>,
    @InjectRepository(Organization)
    private readonly orgsRepo: Repository<Organization>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Ob zagonu napolni bazo obstoječih guid-ov, da prvi poll ne pošlje
    // poplave obvestil za stare intervencije. Če feed ob zagonu ni dosegljiv,
    // ostane `primed=false` in prvi uspešni poll napolni bazo TIHO (brez obvestil).
    if (process.env.NODE_ENV === 'test') return;
    try {
      if ((await this.interventionsRepo.count()) > 0) {
        this.primed = true;
        return;
      }
      const items = await this.fetchFeed();
      await this.saveNew(items);
      this.primed = true;
      this.logger.log(
        `SPIN inicializacija: shranjenih ${items.length} obstoječih intervencij (brez obvestil).`,
      );
    } catch (err) {
      this.logger.warn(`SPIN inicializacija ni uspela: ${(err as Error).message}`);
    }
  }

  /** Vsaki 2 minuti preveri nove intervencije in obvesti pristojna društva. */
  @Cron('*/2 * * * *')
  async pollInterventions(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    if (this.polling) return; // ne prekrivaj ciklov ob počasnem feedu
    this.polling = true;
    try {
      const items = await this.fetchFeed();
      if (items.length === 0) return;

      // Bulk dedup: v eni poizvedbi ugotovi, kateri guid-i so že znani.
      const known = new Set(
        (
          await this.interventionsRepo.find({
            where: { spinGuid: In(items.map((i) => i.guid)) },
            select: ['spinGuid'],
          })
        ).map((r) => r.spinGuid),
      );
      const fresh = items.filter((i) => !known.has(i.guid));
      if (fresh.length === 0) return;

      const saved = await this.saveNew(fresh);

      // Prvi uspešni poll po neuspeli inicializaciji: samo napolni, brez obvestil.
      if (!this.primed) {
        this.primed = true;
        this.logger.log(
          `SPIN inicializacija (poll): shranjenih ${saved.length} intervencij (brez obvestil).`,
        );
        return;
      }

      // Društva z nastavljeno občino (filtrirano v SQL).
      const orgs = await this.orgsRepo.find({
        where: { isActive: true, spinObcina: Not(IsNull()) },
      });
      for (const entity of saved) {
        for (const org of orgs) {
          if (
            this.itemMatchesObcina(
              { guid: entity.spinGuid, title: entity.title, description: entity.description },
              org.spinObcina as string,
            )
          ) {
            await this.notifyOrg(org, entity).catch((err) =>
              this.logger.error(
                `SPIN obvestilo za ${org.slug} ni uspelo: ${(err as Error).message}`,
              ),
            );
          }
        }
      }
    } catch (err) {
      this.logger.warn(`SPIN poll ni uspel: ${(err as Error).message}`);
    } finally {
      this.polling = false;
    }
  }

  /** Shrani nove intervencije (varno ob morebitni tekmi na unikatnem guid-u). */
  private async saveNew(items: SpinItem[]): Promise<SpinIntervention[]> {
    const saved: SpinIntervention[] = [];
    for (const item of items) {
      try {
        saved.push(await this.interventionsRepo.save(this.toEntity(item)));
      } catch (err) {
        // Npr. unikatna kršitev ob vzporednem zagonu — preskoči, ne prekini serije.
        this.logger.warn(
          `SPIN shranjevanje ${item.guid} preskočeno: ${(err as Error).message}`,
        );
      }
    }
    return saved;
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
   * Sveže intervencije (na katere alarmiramo) imajo v opisu GOLO ime občine →
   * točno ujemanje. Za opisno besedilo ujamemo ime kot celo besedo (npr.
   * "občina Ljubljana"). Zavestno NE ujemamo sklonjenih oblik ("v Ljubljani"):
   * stemanje bi povzročilo lažno-pozitivna obvestila med sosednjimi občinami
   * (npr. "Kranj" ↔ "Kranjska Gora"), kar je pri alarmiranju hujše od zgrešitve.
   * Ker alarmiramo na sveže (golo ime), je to v praksi zanesljivo.
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
      occurredAt: parseDate(item.pubDate),
    });
  }

  private async fetchFeed(): Promise<SpinItem[]> {
    // Timeout obvezen: brez njega bi viseča povezava na relay lahko blokirala
    // zagon (onModuleInit) ali cron cikel.
    const res = await fetch(SPIN_FEED_URL, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
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

  /**
   * Seznam občin za nastavitve. Vgrajen statični seznam (obcine.data.ts),
   * ker SPIN geo-omejuje dostop in ga strežnik v tujini ne doseže; seznam
   * občin se tako rekoč ne spreminja.
   */
  listObcine(): Obcina[] {
    return OBCINE;
  }

  /** Občina društva (za mobilni prikaz, ki bere SPIN neposredno). */
  async obcinaForOrg(
    organizationId: string,
  ): Promise<{ obcina: string | null }> {
    const org = await this.orgsRepo.findOne({ where: { id: organizationId } });
    return { obcina: org?.spinObcina ?? null };
  }
}
