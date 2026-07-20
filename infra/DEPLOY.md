# Plamen — namestitev v produkcijo (Hetzner)

## 1. Ustvari strežnik (Hetzner Cloud)

1. [console.hetzner.cloud](https://console.hetzner.cloud) → New Project → Add Server
2. Lokacija: **Nürnberg/Falkenstein** · Slika: **Ubuntu 24.04** · Tip: **CX22** (2 vCPU / 4 GB — dovolj)
3. Dodaj svoj SSH ključ (ali si zapiši root geslo iz e-pošte)
4. Firewall (Hetzner Cloud → Firewalls): dovoli **22, 80, 443** TCP

## 2. Domena

DNS **A zapis** domene → IP strežnika. Brez domene HTTPS (in s tem FCM push
+ Play objava) ne deluje.

**Produkcija teče na `gasilapp.eu`** (ne `.si` — ta je bila prvotno načrtovana,
a ni v uporabi). Ime aplikacije je od 20. 7. 2026 »Plamen«, domena pa ostaja
`gasilapp.eu`; neujemanje je zavestno.

## 3. Priprava strežnika (enkratno)

```bash
ssh root@<IP>
apt update && apt install -y docker.io docker-compose-v2 git
git clone https://github.com/RomanEV-prog/GasilskaAPP.git gasilapp
cd gasilapp
```

## 4. Skrivnosti — `.env.prod` (NIKOLI v git)

```bash
cat > .env.prod <<'EOF'
DOMAIN=gasilapp.eu
DB_PASS=<dolgo naključno geslo>
JWT_SECRET=<openssl rand -hex 48>
JWT_REFRESH_SECRET=<openssl rand -hex 48>
FIREBASE_PROJECT_ID=gasilapp
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@gasilapp.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
REGISTRATION_KEY=<openssl rand -hex 32>
SPIN_BASE_URL=http://<IP_SI_RELAYA>
EOF
chmod 600 .env.prod
```

Naključne vrednosti: `openssl rand -hex 48`. `FIREBASE_PRIVATE_KEY` prekopiraj
iz service-account JSON (polje `private_key`, z `\n` kot dobesednim besedilom, v narekovajih).

`REGISTRATION_KEY` je master ključ za izdajo aktivacijskih kod (§9) — brez njega
ni mogoče registrirati novega društva. `SPIN_BASE_URL` kaže na slovenski relay
(§10); brez njega SPIN na produkciji tiho ne dela, ker Hetzner DE ne doseže
feeda. Oba sta v `.env.prod` na produkciji dejansko nastavljena.

## 5. Zagon

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

- Shema baze se ustvari samodejno iz `docs/schema.sql` (prvi zagon).
- Caddy sam pridobi HTTPS certifikat (Let's Encrypt) — DNS mora že kazati na strežnik.
- Preveri: `https://<DOMAIN>` (portal) in `https://<DOMAIN>/api/docs` (Swagger).

Prvo društvo ustvari stranka prek `https://<DOMAIN>/register` (ali ti zanjo).

## 6. Posodobitev na novo verzijo

Prod teče **za zunanjim eversum Caddy** (port 80/443 zaseda `eversum-caddy-1`),
zato MORAŠ vedno navesti tudi override `infra/compose.behind-proxy.yml` — sicer
`web` poskusi objaviti port 80 in odpove (`Bind for 0.0.0.0:80 failed`).

```bash
cd /opt/gasilapp && git pull
docker compose -f docker-compose.prod.yml -f infra/compose.behind-proxy.yml \
  --env-file .env.prod up -d --build
```

**Migracije sheme** (`DB_SYNCHRONIZE=false` → ročno na obstoječih bazah). Po `git pull`
zaženi nove datoteke iz `docs/migrations/` (idempotentne):

```bash
for f in docs/migrations/*.sql; do
  docker exec -i $(docker ps -qf name=gasilapp-db) psql -U postgres -d gasilapp < "$f"
done
```

(npr. `2026-07-08-spin.sql` doda SPIN občino + tabelo intervencij.)

## 7. Backup baze (dnevno, cron)

```bash
crontab -e
# dodaj:
0 3 * * * docker exec $(docker compose -f /root/gasilapp/docker-compose.prod.yml ps -q db) pg_dump -U postgres gasilapp | gzip > /root/backup/gasilapp-$(date +\%u).sql.gz
```

(`mkdir -p /root/backup` prej; `%u` = dan v tednu → 7 rotirajočih kopij.)

Obnova: `gunzip -c backup.sql.gz | docker exec -i <db-container> psql -U postgres gasilapp`

## 8. Mobilna aplikacija (release)

Build mora kazati na produkcijski API:

```powershell
cd C:\gasilapp_mobile
flutter build appbundle --release --dart-define=API_URL=https://<DOMAIN>/api/v1
```

Podpisovanje in objava na Google Play: glej `mobile/MOBILE.md` → Release.

## 9. Aktivacijske kode za nova društva

Registracija društva zahteva aktivacijsko kodo. Izdaš jo z master ključem
(`REGISTRATION_KEY` v `.env.prod`):

```bash
ssh root@<IP> 'KEY=$(grep REGISTRATION_KEY /opt/gasilapp/.env.prod | cut -d= -f2); \
  curl -s https://gasilapp.eu/api/v1/auth/registration-codes -X POST \
  -H "x-master-key: $KEY" -H "Content-Type: application/json" \
  -d "{\"count\":1,\"note\":\"PGD Ime — kontaktna oseba\"}"'
```

Vrne `{"codes": ["GASIL-XXXX-XXXX"]}` — kodo pošlješ društvu; vsaka je enkratna.
Pregled izdanih/porabljenih kod:

```bash
docker exec $(docker ps -qf name=gasilapp-db) psql -U postgres -d gasilapp \
  -c "SELECT code, note, used_at FROM registration_codes ORDER BY created_at DESC;"
```

## 10. SPIN push obvestila — slovenski relay

SPIN (spin3.sos112.si) pušča le **slovenske IP-je**, zato produkcijski strežnik
(Hetzner DE) feeda ne doseže sam. Za takojšnja push obvestila operativcem
postavi majhen **slovenski VPS** kot posrednik (nginx reverse-proxy).

**Ponudniki SI VPS** (~2–5 €/mes): Hostko, Neoserv, DomKing, Domenca (izberi
najmanjši paket; dovolj je 1 vCPU / 512 MB, Ubuntu/Debian).

**Postavitev relaya** (na SI VPS):

```bash
apt update && apt install -y nginx
# prekopiraj infra/spin-relay.nginx.conf na strežnik:
scp infra/spin-relay.nginx.conf root@<IP_RELAYA>:/etc/nginx/sites-available/spin-relay
ssh root@<IP_RELAYA> '
  ln -sf /etc/nginx/sites-available/spin-relay /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl restart nginx'
```

(Config posreduje le `/Javno/ODApi/` in dovoli le IP produkcijskega strežnika.)

**Vklop na produkciji** — dodaj v `/opt/gasilapp/.env.prod`:

```
SPIN_BASE_URL=http://<IP_RELAYA>
```

Nato redeploy backenda:

```bash
cd /opt/gasilapp && docker compose -f docker-compose.prod.yml \
  -f infra/compose.behind-proxy.yml --env-file .env.prod up -d backend
```

**Preveri**, da relay deluje in poller bere feed:

```bash
docker logs $(docker ps -qf name=gasilapp-backend) 2>&1 | grep -i SPIN | tail
# uspeh: "SPIN inicializacija: shranjenih N ..." (brez "fetch failed")
```

Odslej cron vsaki 2 min pošlje FCM push operativcem ob novi intervenciji v
občini njihovega društva. Preizkus: v feedu se pojavi nova intervencija v
nastavljeni občini → operativci s prijavljeno aplikacijo dobijo obvestilo.
