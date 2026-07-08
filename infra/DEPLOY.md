# GasilApp — namestitev v produkcijo (Hetzner)

## 1. Ustvari strežnik (Hetzner Cloud)

1. [console.hetzner.cloud](https://console.hetzner.cloud) → New Project → Add Server
2. Lokacija: **Nürnberg/Falkenstein** · Slika: **Ubuntu 24.04** · Tip: **CX22** (2 vCPU / 4 GB — dovolj)
3. Dodaj svoj SSH ključ (ali si zapiši root geslo iz e-pošte)
4. Firewall (Hetzner Cloud → Firewalls): dovoli **22, 80, 443** TCP

## 2. Domena

DNS **A zapis** domene (npr. `app.gasilapp.si`) → IP strežnika.
Brez domene HTTPS (in s tem FCM push + Play objava) ne deluje.

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
DOMAIN=app.gasilapp.si
DB_PASS=<dolgo naključno geslo>
JWT_SECRET=<openssl rand -hex 48>
JWT_REFRESH_SECRET=<openssl rand -hex 48>
FIREBASE_PROJECT_ID=gasilapp
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@gasilapp.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
EOF
chmod 600 .env.prod
```

Naključne vrednosti: `openssl rand -hex 48`. `FIREBASE_PRIVATE_KEY` prekopiraj
iz service-account JSON (polje `private_key`, z `\n` kot dobesednim besedilom, v narekovajih).

## 5. Zagon

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

- Shema baze se ustvari samodejno iz `docs/schema.sql` (prvi zagon).
- Caddy sam pridobi HTTPS certifikat (Let's Encrypt) — DNS mora že kazati na strežnik.
- Preveri: `https://<DOMAIN>` (portal) in `https://<DOMAIN>/api/docs` (Swagger).

Prvo društvo ustvari stranka prek `https://<DOMAIN>/register` (ali ti zanjo).

## 6. Posodobitev na novo verzijo

```bash
cd gasilapp && git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

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
flutter build appbundle --release --dart-define=API_BASE_URL=https://<DOMAIN>/api/v1
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
