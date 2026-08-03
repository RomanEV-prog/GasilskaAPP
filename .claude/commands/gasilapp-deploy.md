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

### Rate-limit po klientovem IP — test z DVEH IP-jev (po spremembi proxy verige)

Konfiguracija sama ni dokaz. Z lokalnega stroja sproži 6× napačno prijavo
(šesta → 429), TAKOJ nato z drugega IP (SI relay je pri roki) ena napačna
prijava → mora vrniti **401, NE 429**:
```bash
for i in 1 2 3 4 5 6; do curl -s -o /dev/null -w "%{http_code} " -X POST \
  https://plamenapp.si/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"username":"test@ne-obstaja.si","password":"napacno"}'; done
ssh root@152.89.232.161 'curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://plamenapp.si/api/v1/auth/login -H "Content-Type: application/json" \
  -d "{\"username\":\"test@ne-obstaja.si\",\"password\":\"napacno\"}"'
```
Če relay dobi 429 → limit je spet globalen. Past (udarila 2026-07-30):
`TRUST_PROXY_HOPS` na backendu NI dovolj — notranji Caddy (gasilapp-web)
prejeti `X-Forwarded-For` od eversuma ZAVRŽE, dokler nima v
`frontend/Caddyfile` globalne opcije `servers { trusted_proxies static
private_ranges }`. Sprememba Caddyfile = rebuild `web` vsebnika.

## Gotchas

- **Beta stran gre v `/opt/gasilapp/downloads/index.html`**, ne v
  `/opt/gasilapp/beta/`. Caddy jo streže prek `handle_path /beta` iz iste mape
  kot APK. V seji sem jo najprej kopiral v napačno mapo — stran se ni spremenila,
  brez napake.
- **Brez `infra/compose.behind-proxy.yml` rebuild odpove** na zasedenem portu 80.
- **`sed -i` na datoteki, ki je bind-priklopljena v Docker vsebnik, spremembe
  NE dostavi.** `sed -i` zapiše novo datoteko in jo preimenuje → nov inode,
  priklop posamezne datoteke pa je vezan na starega. Gostitelj kaže novo
  vsebino, vsebnik staro, `caddy reload` javi `config is unchanged` — vse
  izgleda opravljeno, a ni. Enako velja za `docker cp` na tako pot.
  Rešitev brez ponovnega zagona (ta bi vzel dol tudi eversum):
  ```bash
  ssh root@178.104.67.229 'docker exec -i eversum-caddy-1 \
    sh -c "cat > /etc/caddy/Caddyfile" < /opt/eversum/Caddyfile'
  # nato OBVEZNO primerjaj:
  ssh root@178.104.67.229 'diff <(docker exec eversum-caddy-1 cat /etc/caddy/Caddyfile) /opt/eversum/Caddyfile'
  ```
  Udarilo 2026-07-29 pri dodajanju domene `plamenapp.si`.

- **Caddy za novo domeno certifikat pridobi sam, ko DNS zaživi — do 30 dni.**
  `"will retry" … "max_duration":2592000`. Zato je site blok mogoče dodati
  vnaprej in ni treba čakati ob računalniku; napaka
  `SERVFAIL … nameservers may be malfunctioning` v dnevniku je le odsev tega,
  da delegacija še ne kaže na delujočo cono, in izgine sama.

- **Nova spremenljivka okolja mora iti na DVE mesti.** `docker-compose.prod.yml`
  spremenljivke **našteva** (nima `env_file`) — vnos v `.env.prod` brez ustrezne
  vrstice v `environment:` v vsebnik NE pride. Backend ne javi ničesar, funkcija
  pa tiho teče brez nastavitve. Udarilo 2026-07-28 (`INVOICE_ISSUER_*` za račune;
  ujeto pred rebuildom, ker sem prebral compose namesto ugibal). Preveri:
  `docker exec gasilapp-backend-1 printenv | grep <PREFIX>`.

- **»Uporabnik vidi staro aplikacijo« pri SPLETU = predpomnjen `index.html`.**
  Sredstva imajo zgoščeno vrednost v imenu (`index-CbYY9cFt.js`), zato nova
  objava = novo ime; `index.html` pa leži na isti poti in je do 2026-07-29
  hodil brez glave `Cache-Control`. Brskalnik ga je obdržal in nalagal sredstva
  PREJŠNJE različice — na strežniku nova koda, uporabnik stara, brez sledi v
  dnevniku. Popravljeno v `frontend/Caddyfile` (`no-cache` za vse razen
  `/assets/*`, ki dobijo `immutable` za leto dni). Preveri po objavi:
  ```bash
  curl -sI https://gasilapp.eu/ | grep -i cache-control          # no-cache
  JS=$(curl -s https://gasilapp.eu/ | grep -o '/assets/index-[A-Za-z0-9_-]*\.js')
  curl -sI "https://gasilapp.eu$JS" | grep -i cache-control      # immutable
  ```
  **Popravek glave ne odreši uporabnikov, ki imajo star `index.html` že v
  predpomnilniku** — ti potrebujejo enkraten Ctrl+Shift+R. Povej jim to
  naravnost, namesto da čakaš, da »se samo uredi«.

- **Popravek vmesnika, ki je odvisen od poizvedbe, preveri z zakasnjenim
  odgovorom.** Pogoj `if (!user || isPlatformOrg) return` se je izvedel, dokler
  je poizvedba še tekla → `isPlatformOrg` je bil `false` → vodič se je odprl in
  ga poznejša sprememba ni zaprla. Vedno počakaj na `isPending`, kadar odločitev
  visi na podatku s strežnika. Udarilo 2026-07-29.

- **»Tester ima star build« = najprej posumi na predpomnilnik, ne na objavo.**
  APK vedno leži na ISTI poti `/beta/gasilapp.apk`, zato brskalnik brez
  `Cache-Control` postreže predpomnjeno staro datoteko — objava izgleda
  neuspešna, čeprav je na strežniku prava. Glava je od `7240966` nastavljena
  v `frontend/Caddyfile` (`header @apk { … Cache-Control "no-cache" }`).
  `no-cache` NE pomeni ponovnega prenosa 75 MB: ob nespremenjeni datoteki
  ETag vrne 304. Preveri:
  ```bash
  curl -sI https://gasilapp.eu/beta/gasilapp.apk | grep -i "cache-control\|etag"
  ET=$(curl -sI https://gasilapp.eu/beta/gasilapp.apk | grep -i etag | tr -d '\r' | cut -d' ' -f2)
  curl -s -o /dev/null -w "%{http_code} %{size_download}B\n" -H "If-None-Match: $ET" \
    https://gasilapp.eu/beta/gasilapp.apk    # pricakovano: 304 0B
  ```
  **Caddyfile je v sliki `web`** → sprememba zahteva `up -d --build web`,
  ne le kopiranja datoteke.
  Ta past je udarila 2026-07-20b: ikona je bila pravilna v APK-ju na strežniku,
  tester pa je videl staro — vzrok je bil predpomnjen prenos, ne build.
- **`git push` pred `git pull` na strežniku** — sicer prod potegne staro kodo in
  vse ostalo (migracija, verifikacija) izgleda uspešno, a teče stara koda.
- **Netracked datoteka na strežniku tiho blokira `git pull` → rebuild zgradi
  STARO kodo.** Če na prod ročno `scp`-jaš datoteko (npr. `izbris-racuna.html`
  v `frontend/public/`), ki jo kasneje tudi commitaš, `git pull` odpove z
  »untracked working tree files would be overwritten by merge … Aborting«, a
  če v isti verigi slepo poženeš rebuild, ta zgradi **nespremenjeno** kodo in
  vse izgleda uspešno. Rešitev: `ssh … 'cd /opt/gasilapp && rm -f <pot> &&
  git pull'` (vsebina je identična commitani), nato **rebuild ZNOVA**. Vedno
  preveri `git log -1` na strežniku, da je HEAD res tvoj zadnji commit, PREDEN
  zaupaš rebuildu. Udarilo 2026-07-23 (Darjanov sklop popravkov).
- **Vsebnik baze je `gasilapp-db-1`, splet pa `gasilapp-web`** (brez `-1`).
  Preveri z `docker ps --format "{{.Names}}"`, preden pišeš ukaze na pamet.
- **Prijava v račun pravega društva za test ni potrebna in ni zaželena** —
  verifikacija prek 401 + `\d tabela` zadošča. Zadnji korak (dejanski tok skozi
  vmesnik) prepusti uporabniku ali testerju.
- **SPIN geo-omejitev:** prod (Hetzner DE) ne doseže spin3.sos112.si; teče prek
  SI relay `152.89.232.161` (env `SPIN_BASE_URL`). Če SPIN po objavi ne dela,
  preveri relay, ne backend.
- **Relay nginx po ponovnem zagonu strežnika lahko obleži** — `nginx -t` ob
  zagonu pade z `host not found in upstream "spin3.sos112.si"`, če DNS še ne
  dela, in nginx OSTANE dol (udarilo 28. 7.–3. 8. 2026: 6 dni brez novih
  intervencij, tiho). Od 3. 8. je na relayu systemd drop-in
  (`/etc/systemd/system/nginx.service.d/override.conf`: `Restart=on-failure`
  + `After/Wants=network-online.target`). Zdravje preveri s podatki:
  `max(created_at)` v `spin_interventions` mora biti svež; feed test s prod:
  `curl http://152.89.232.161/Javno/ODApi/True` → 200 (drugod 403 — allowlist
  dovoli samo prod IP, zato test z lokalnega stroja LAŽE).
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
