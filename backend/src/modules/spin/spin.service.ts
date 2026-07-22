import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

      // Društva z vsaj eno izbrano občino (jsonb → filtriramo v JS).
      const orgs = (await this.orgsRepo.find({ where: { isActive: true } })).filter(
        (o) => o.spinObcine && o.spinObcine.length > 0,
      );
      for (const entity of saved) {
        for (const org of orgs) {
          const matched = this.matchedObcina(
            { guid: entity.spinGuid, title: entity.title, description: entity.description },
            org.spinObcine as string[],
          );
          if (matched) {
            await this.notifyOrg(org, entity, matched).catch((err) =>
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
    matchedObcina?: string,
  ): Promise<void> {
    const type = it.spinType ?? 'Intervencija';
    const kraj = it.obcina ?? matchedObcina;
    // Samo push, brez zapisa v obvestila — SPIN ima svoj zavihek (mobilna).
    // FCM data mora biti Record<string,string>, zato izpustimo prazne vrednosti.
    const data: Record<string, string> = { spinGuid: it.spinGuid };
    if (it.link) data.link = it.link;
    if (it.obcina) data.obcina = it.obcina;
    if (it.occurredAt) data.occurredAt = it.occurredAt.toISOString();
    await this.notificationsService.sendSpinPush(org.id, {
      title: `🚨 SPIN: ${type}`,
      body: kraj ? `${type} — ${kraj}` : type,
      data,
    });
    this.logger.log(`SPIN push (${type}, ${kraj}) → ${org.slug}`);
  }

  /**
   * Vrne prvo izbrano občino društva, v katero spada intervencija (ali null).
   * Sveže intervencije (na katere alarmiramo) imajo v opisu GOLO ime občine →
   * točno ujemanje. Opisna poročila lokacijo skoraj vedno navedejo kot
   * "občina X" → verjamemo IZKLJUČNO temu (poročila pogosto omenjajo enote iz
   * drugih občin — "GB Maribor", "UKC Maribor" — kar je prej ustvarjalo lažne
   * zadetke). Če besede "občina" ni, ujamemo sklonjeno obliko za krajevnim
   * predlogom ("v Mariboru", "na Ptuju"); pripona je omejena na 2 znaka, da
   * "Kranj" ne ujame "v Kranjski Gori".
   */
  private matchedObcina(item: SpinItem, obcine: string[]): string | null {
    const desc = normalize(item.description ?? '');
    if (!desc) return null;
    const hasObcinaWord = /\bobcin/.test(desc);
    for (const obcina of obcine) {
      const target = normalize(obcina);
      if (!target) continue;
      if (desc === target) return obcina; // golo ime — sveža intervencija
      const esc = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (hasObcinaWord) {
        // "obcina X" / "obcini X" — edini zanesljivi vir lokacije v poročilu.
        if (new RegExp(`\\bobcin\\w{0,3}\\s+${esc}\\b`).test(desc)) {
          return obcina;
        }
        continue; // občina je izrecno navedena in ni naša → ne ugibaj naprej
      }
      // Brez "občina": sklonjena oblika za predlogom, po besedah (brez končnega
      // samoglasnika + do 2 znaka pripone): "Ruše" → "v Rušah", "Celje" → "v Celju".
      const stemmed = target
        .split(/\s+/)
        .map(
          (w) =>
            `${w.replace(/[aeiou]$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w{0,2}`,
        )
        .join('\\s+');
      if (new RegExp(`\\b(v|na|pri)\\s+${stemmed}\\b`).test(desc)) {
        return obcina;
      }
    }
    return null;
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

  /** Občine društva (za mobilni prikaz, ki bere SPIN neposredno). */
  async obcineForOrg(
    organizationId: string,
  ): Promise<{ obcine: string[] }> {
    const org = await this.orgsRepo.findOne({ where: { id: organizationId } });
    return { obcine: org?.spinObcine ?? [] };
  }

  /**
   * Nedavne intervencije za občine društva — za **spletni** zavihek SPIN
   * (brskalnik SPIN feeda geo-omejeno ne doseže, zato bere iz predpomnjene
   * tabele, ki jo polni cron prek relaya). Mobilna bere feed neposredno.
   */
  async interventionsForOrg(
    organizationId: string,
  ): Promise<SpinInterventionView[]> {
    const org = await this.orgsRepo.findOne({ where: { id: organizationId } });
    const obcine = org?.spinObcine ?? [];
    if (obcine.length === 0) return [];
    const recent = await this.interventionsRepo
      .createQueryBuilder('i')
      .orderBy('i.occurred_at', 'DESC', 'NULLS LAST')
      .limit(300)
      .getMany();
    return recent
      .filter((it) =>
        this.matchedObcina(
          { guid: it.spinGuid, title: it.title, description: it.description },
          obcine as string[],
        ),
      )
      .slice(0, 100)
      .map((it) => ({
        id: it.id,
        spinType: it.spinType ?? null,
        obcina: it.obcina ?? null,
        title: it.title,
        description: it.description ?? null,
        link: it.link ?? null,
        occurredAt: it.occurredAt ? it.occurredAt.toISOString() : null,
      }));
  }
}

/** Projekcija intervencije za odjemalce (usklajeno z mobilnim modelom). */
export interface SpinInterventionView {
  id: string;
  spinType: string | null;
  obcina: string | null;
  title: string;
  description: string | null;
  link: string | null;
  occurredAt: string | null;
}
