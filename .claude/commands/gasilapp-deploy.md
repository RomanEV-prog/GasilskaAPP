# Plamen — objava nove različice na produkcijo

Celoten postopek objave (backend + splet + baza + beta APK) na Hetzner
`178.104.67.229`. Zgrajen iz realne seje 2026-07-20 (zadolžitve opreme + NFC).
Razmejitev: `infra/DEPLOY.md` je referenca za posamezne ukaze — ta skill je o
**vrstnem redu in pasteh**, zaradi katerih objava tiho pokvari aplikacijo.

## Zakaj / arhitektura

- Prod teče **za zunanjim `eversum-caddy-1`**, ki zaseda port 80/443. Zato je
  override `infra/compose.behind-proxy.yml` **obvezen** — brez njega `web`
  poskusi objaviti port 80 in odpove (`Bind for 0.0.0.0:80 failed`).
- `DB_SYNCHRONIZE=false` na produkciji → **shema se NE ustvari sama**. Migracije
  iz `docs/migrations/` je treba pognati ročno.
- Vsebniki: `gasilapp-web`, `gasilapp-backend-1`, `gasilapp-db-1` (pozor na
  nedosledno poimenovanje — `web` je brez `-1`, ostala dva z njim).

## Vrstni red je obvezen

```
kopija baze → git pull → migracija → rebuild → verifikacija → APK + beta stran
```

**Nikoli ne naloži samo APK-ja.** Nova mobilna različica kliče endpointe, ki jih
stara produkcija nima; uporabnik dobi napako namesto funkcije. Ta past je
udarila v seji 2026-07-20: uporabnik je rekel »naloži APK«, a bi to Darjanu
zlomilo »Mojo opremo«, ker prod ni imel ne tabele ne poti.

## Konkretni recepti

### 1. Varnostna kopija PRED migracijo
```bash
ssh root@178.104.67.229 'mkdir -p /root/backup && \
  docker exec gasilapp-db-1 pg_dump -U postgres gasilapp | \
  gzip > /root/backup/pred-<opis>-$(date +%Y%m%d-%H%M).sql.gz'
```
Obnova: `gunzip -c <kopija>.sql.gz | docker exec -i gasilapp-db-1 psql -U postgres gasilapp`

### 2. Koda + migracija
```bash
ssh root@178.104.67.229 'cd /opt/gasilapp && git pull && \
  docker exec -i gasilapp-db-1 psql -U postgres -d gasilapp -v ON_ERROR_STOP=1 \
  < docs/migrations/<datum>-<opis>.sql'
```
`ON_ERROR_STOP=1` je pomemben — brez njega psql tiho nadaljuje po napaki.
`NOTICE: ... already exists, skipping` NI napaka (migracije so idempotentne).

### 3. Rebuild (override je obvezen!)
```bash
ssh root@178.104.67.229 'cd /opt/gasilapp && \
  docker compose -f docker-compose.prod.yml -f infra/compose.behind-proxy.yml \
  --env-file .env.prod up -d --build'
```
Traja nekaj minut. Poženi z daljšim timeoutom (900000 ms).

### 4. APK + beta stran
```bash
scp mobile/build/app/outputs/flutter-apk/app-release.apk \
  root@178.104.67.229:/opt/gasilapp/downloads/gasilapp.apk
scp infra/beta/index.html \
  root@178.104.67.229:/opt/gasilapp/downloads/index.html
```

## E2E verifikacija

```bash
# 1. Zivljenjski znak (javni endpoint)
curl -s -o /dev/null -w "%{http_code}\n" https://gasilapp.eu/api/v1/spin/obcine   # 200

# 2. NOVI endpointi brez prijave -> 401, NE 404
#    401 = pot obstaja in je zascitena. 404 = rebuild ni prijel!
curl -s -o /dev/null -w "%{http_code}\n" https://gasilapp.eu/api/v1/equipment/my-assignments

# 3. Shema res obstaja
ssh root@178.104.67.229 "docker exec gasilapp-db-1 psql -U postgres -d gasilapp -c '\d <nova_tabela>'"

# 4. Splet in APK
curl -s -o /dev/null -w "%{http_code}\n" https://gasilapp.eu/
curl -sI https://gasilapp.eu/beta/gasilapp.apk | grep -i "content-length"   # primerjaj z lokalno velikostjo
curl -s https://gasilapp.eu/beta | grep -o "Različica [0-9.]*"
```

Trik z **401-namesto-404** je najhitrejši dokaz, da je nova koda res zagnana,
brez prijave v račun pravega društva.

## Gotchas

- **Beta stran gre v `/opt/gasilapp/downloads/index.html`**, ne v
  `/opt/gasilapp/beta/`. Caddy jo streže prek `handle_path /beta` iz iste mape
  kot APK. V seji sem jo najprej kopiral v napačno mapo — stran se ni spremenila,
  brez napake.
- **Brez `infra/compose.behind-proxy.yml` rebuild odpove** na zasedenem portu 80.
- **`git push` pred `git pull` na strežniku** — sicer prod potegne staro kodo in
  vse ostalo (migracija, verifikacija) izgleda uspešno, a teče stara koda.
- **Vsebnik baze je `gasilapp-db-1`, splet pa `gasilapp-web`** (brez `-1`).
  Preveri z `docker ps --format "{{.Names}}"`, preden pišeš ukaze na pamet.
- **Prijava v račun pravega društva za test ni potrebna in ni zaželena** —
  verifikacija prek 401 + `\d tabela` zadošča. Zadnji korak (dejanski tok skozi
  vmesnik) prepusti uporabniku ali testerju.
- **SPIN geo-omejitev:** prod (Hetzner DE) ne doseže spin3.sos112.si; teče prek
  SI relay `152.89.232.161` (env `SPIN_BASE_URL`). Če SPIN po objavi ne dela,
  preveri relay, ne backend.
- **Tišina SPIN-a v dnevniku po objavi je NORMALNA — ne lovi je.** Sporočilo
  `SPIN inicializacija: shranjenih N …` se izpiše **samo ob prazni tabeli**:
  `onModuleInit` ob `count() > 0` nastavi `primed=true` in se vrne brez zapisa
  (`spin.service.ts:81`), `pollInterventions` pa tiho konča, kadar ni novih
  (vrstici 104, 116). Na delujoči produkciji je tabela vedno polna, zato po
  vsakem rebuildu **ni pričakovati nobene SPIN vrstice**. Da poller res teče,
  preveri podatke, ne dnevnika:
  ```bash
  ssh root@178.104.67.229 "docker exec gasilapp-db-1 psql -U postgres -d gasilapp \
    -t -c 'SELECT count(*), max(created_at) FROM spin_interventions;'"
  ```
  `max(created_at)` mlajši od zagona vsebnika = poller dela. (Ta gotcha je
  stala nekaj minut v seji 2026-07-20b — prejšnja različica tega skilla je
  navajala, da je zapis znak uspeha, kar drži le ob prvi postavitvi.)

## Preverjeno delujoč zaključek seje 2026-07-20

Kopija 72K → migracija (tabela + 3 indeksi + 2 stolpca) → rebuild → 401 na obeh
novih poteh → APK 75.552.969 B na `gasilapp.eu/beta` → stran kaže »Različica 1.0.7«.

## Objava BREZ migracije (seja 2026-07-20b, preimenovanje v »Plamen«)

Kadar sprememba ne zadene sheme (besedilo, ikone, blagovna znamka), koraka
kopije baze in migracije **odpadeta** — vrstni red je `push → git pull →
rebuild → verifikacija → APK + beta stran`. Kopija baze pred rebuildom brez
migracije ni potrebna: rebuild vsebnika `db` ne dotakne.

Verifikacija preimenovanja (namesto trika 401-namesto-404, ki velja za nove
endpointe):
```bash
curl -s https://gasilapp.eu/ | grep -o "<title>[^<]*</title>"      # <title>Plamen</title>
curl -s https://gasilapp.eu/manifest.webmanifest | head -3          # "name": "Plamen"
curl -sI https://gasilapp.eu/icons/icon-512.png | grep -i length    # ujemanje z lokalno
```

**Pri APK vedno primerjaj SHA-256, ne le velikosti** — velikost ujame skrajšan
prenos, ne pa tihe okvare:
```bash
sha256sum /c/gasilapp_mobile/build/app/outputs/flutter-apk/app-release.apk
ssh root@178.104.67.229 'sha256sum /opt/gasilapp/downloads/gasilapp.apk'
```

Preverjeno delujoče: `9698650` → rebuild → portal in manifest kažeta »Plamen«,
4/4 ikone bajtno enake → APK 75.727.829 B, SHA-256 identičen, `aapt2` potrjuje
`label='Plamen'`, versionCode 9 → beta stran »Različica 1.0.8«.
