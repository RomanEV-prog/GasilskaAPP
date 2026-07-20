# Preimenovanje blagovne znamke — kaj zamenjati in kaj se NE sme dotakniti

Postopek preimenovanja aplikacije, ko staro ime ostane vgrajeno v
identifikatorje. Zgrajen iz seje 2026-07-20b (»GasilApp« → »Plamen«, domena
in vsi identifikatorji ostali). Razmejitev: `/ikona-aplikacije` je o slikah,
ta skill o besedilu.

## Zakaj / arhitektura

Ime znamke se v zrelem projektu pojavi na štirih vrstah mest. Samo **prva**
se sme zamenjati; ostale so podatki, ki naključno vsebujejo isto besedo.

| Vrsta | Primer | Ukrep |
|---|---|---|
| Vidno ime | `<title>`, `android:label`, prijavni zaslon | **zamenjaj** |
| Identifikator | `applicationId`, ime paketa, projekt Firebase | pusti |
| Infrastruktura | domena, vsebniki, ime baze, poti na strežniku | pusti |
| **Podatek, ki ime le vsebuje** | geslo, format QR kode, ključ v localStorage | **pusti — najnevarnejše** |

Zadnja vrsta je past: izgleda kot ime, je pa vsebina. Slepa zamenjava
`GasilApp` → `Plamen` bi v tej seji pokvarila troje.

## Konkretni recepti

### 1. Popiši obseg — po celem drevesu, ne po dokumentaciji

```bash
git grep -n -i -E "<staro-ime>" -- ':!*.lock' ':!*package-lock.json'
```

Dokumentaciji ne zaupaj kot viru obsega — `git grep` najde pojavitve, ki jih
noben dokument ne omenja. (V tej seji sem `docs/` izključil iz obsega in
dokumentacija je ostala nepreimenovana skozi tri commite.)

### 2. Za vsak zadetek preveri, ali je res ime

Preden zamenjaš karkoli, kar ni očitno besedilo v vmesniku:

```bash
git grep -n "GasilApp123" -- backend/src     # -> seed.ts:60 bcrypt.hash(...) = GESLO
git grep -n "GASILAPP-"   -- backend/src     # -> equipment.service.ts:79 = FORMAT QR KODE
```

Če se niz pojavi v kodi kot **vrednost** (in ne kot besedilo za prikaz), ni
ime znamke.

### 3. Kaj je v tem projektu nedotakljivo

- `si.gasilapp.gasilapp_mobile` — `applicationId`, `namespace`, pot
  `MainActivity.kt`, `iosBundleId`. **Play Console ga po prvi objavi zaklene**;
  nov ID = nova aplikacija, izgubljeni preizkuševalci in ocene.
- `pubspec.yaml` `name: gasilapp_mobile` — Dart ime paketa; sprememba zahteva
  popravek vsakega `import 'package:gasilapp_mobile/...'`.
- Firebase `projectId`, `authDomain`, `storageBucket` — pravi projekt.
- `gasilapp.eu`, `/opt/gasilapp`, `gasilapp-db-1`, `gasilapp-web`, ime baze.
- `gasilapp.tour.v1.<userId>` (`OnboardingTour.tsx`) — ključ v localStorage;
  nov ključ pomeni, da se **uvodni vodič znova prikaže vsem** obstoječim
  uporabnikom.
- `GasilApp123!` — geslo testnega računa (bcrypt v `seed.ts:60`).
- `GASILAPP-{org_slug}-{inventory_number}` — format QR kode
  (`equipment.service.ts:79`), **že natisnjen na fizičnih nalepkah opreme**.
- Podpisni certifikat `CN=GasilApp` — vgrajen v keystore, nespremenljiv;
  nov certifikat pomeni, da nadgradnja čez obstoječo namestitev ni mogoča.
  Uporabniku ni viden nikjer.

### 4. Kaj zamenjati (vidno ime)

```
frontend/index.html                     <title>, apple-mobile-web-app-title
frontend/public/manifest.webmanifest    name, short_name
frontend/public/zasebnost.html          naslov, telo, noga
frontend/src/components/layout/AppLayout.tsx   stranska vrstica (2×), fallback naslova
frontend/src/pages/auth/LoginPage.tsx   naslov nad obrazcem
frontend/src/components/OnboardingTour.tsx     BESEDILO koraka (NE ključ!)
frontend/src/components/IosInstallHint.tsx
mobile/android/app/src/main/AndroidManifest.xml   android:label
mobile/lib/main.dart                    MaterialApp title (+ ime razreda)
mobile/lib/screens/login_screen.dart
mobile/lib/services/fcm_service.dart    opis kanala obvestil
infra/beta/index.html                   naslov, h1, noga
```

`android:label` je bil pred to sejo `gasilapp_mobile` — surovo ime projekta.
Ob preimenovanju preveri, ali ni bil vseskozi napačen.

## E2E verifikacija

```bash
# 1. nic vidnega ni ostalo (docs izkljuci LOCENO, ne pozabi nanje)
git grep -n "<staro-ime>" -- frontend/src frontend/public frontend/index.html \
  mobile/lib mobile/android infra/beta
#    exit 1 / prazno = ok

# 2. identifikatorji so NEDOTAKNJENI
grep -E "applicationId|namespace" mobile/android/app/build.gradle.kts
grep "^name:" mobile/pubspec.yaml
grep "tour.v1" frontend/src/components/OnboardingTour.tsx

# 3. prevede se
cd frontend && npx tsc --noEmit && npm run build
cd mobile && flutter analyze

# 4. ime je RES v paketu (ne le v izvorni kodi)
aapt2 dump badging app-release.apk | grep -E "^package:|application-label:"
#    label = novo ime, package = STARI identifikator

# 5. po objavi, v zivo
curl -s https://gasilapp.eu/ | grep -o "<title>[^<]*</title>"
curl -s https://gasilapp.eu/manifest.webmanifest | grep '"name"'
```

## Gotchas

- **Ključi v localStorage/SharedPreferences.** Preimenovanje ključa je tiha
  ponastavitev stanja za vse obstoječe uporabnike (vodiči, nastavitve,
  zavrnjeni namigi). Preveri `git grep -n "localStorage\.\|SharedPreferences"`.

- **Nizi, natisnjeni na fizične medije** (QR kode, nalepke, natisnjeni
  obrazci). Koda jih lahko spremeni, papir ne. Preveri, ali format kje
  zapušča sistem.

- **Gesla in testni podatki, ki vsebujejo ime.** `<Ime>123!` je pogost vzorec
  seed gesel — v dokumentaciji ga pusti dobesedno, sicer navodila ne delujejo.

- **Domena običajno ostane.** Neujemanje imena in domene (Plamen na
  `gasilapp.eu`) je normalno in zavestno — zapiši ga, sicer bo naslednja seja
  »popravljala«.

- **Zapiši razmejitev v `CLAUDE.md`.** Brez nje bo naslednja seja iz najboljših
  namenov »poenotila« identifikatorje. Ta skill obstaja zato, ker je bila
  razmejitev enkrat že raziskana.

- **Ime datoteke skilla ni ime znamke.** `/gasilapp-deploy` ostane — je ukaz,
  ki ga uporabnik tipka, in je naveden v `CLAUDE.md`.

## Preverjeno delujoče (2026-07-20b)

`git grep` → 4 kategorije → zamenjano 13 datotek vidnega imena, 0
identifikatorjev → `tsc` čist, `flutter analyze` brez napak → `aapt2` potrdi
`application-label:'Plamen'` ob `package: si.gasilapp.gasilapp_mobile` →
objava → portal in manifest kažeta »Plamen«.
