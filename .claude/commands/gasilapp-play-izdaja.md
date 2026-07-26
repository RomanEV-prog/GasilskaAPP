# Plamen — nova mobilna izdaja (beta + Google Play interno)

Celoten cikel objave nove različice mobilne aplikacije Plamen: bump verzije →
release build → beta APK na gasilapp.eu/beta → nalaganje na Google Play (interno
preizkušanje). Zgrajen iz seje 26. 7. 2026 (izdaja 1.0.13+14). Razmejitev:
`/gasilapp-deploy` je o objavi backend+splet na prod; `/play-release-internal`
(GreenHeart) je splošna tehnika klikanja po Play Console — **ta skill je
Plamen-specifičen: ID-ji, vrstni red in pasti prav te aplikacije.**

## Plamen Play ID-ji (TOČNO)

- developer: `5046106616640158875`
- app: `4973541200399618968`
- interni track: `4701224842560389717`
- opt-in povezava za testerje: `https://play.google.com/apps/internaltest/4701224842560389717`
- track stran: `https://play.google.com/console/u/0/developers/5046106616640158875/app/4973541200399618968/tracks/4701224842560389717`
- **aktivni seznam testerjev je »Plamen – interni testerji«** (obkljukan), NE
  »Interni testerji« (14, neobkljukan — star, ni za ta track).

## Vrstni red

```
bump verzije (2 mesti) → release build (APK + AAB) → verifikacija verzije →
varnostne kopije → beta scp + verifikacija SHA-256 → Play upload → publish
```

## 1. Bump verzije — DVE mesti

- `mobile/pubspec.yaml`: `version: X.Y.Z+BUILD` (npr. `1.0.12+13` → `1.0.13+14`)
- `infra/beta/index.html`: `Različica X.Y.Z` (vrstica z `class="ver"`)

Če pozabiš beta stran, beta kaže staro verzijo (deploy je NE posodobi — glej
`/gasilapp-deploy`).

## 2. Release build (PowerShell, iz `C:\gasilapp_mobile`)

```powershell
Set-Location C:\gasilapp_mobile
flutter build apk --release --dart-define=API_URL=https://gasilapp.eu/api/v1
flutter build appbundle --release --dart-define=API_URL=https://gasilapp.eu/api/v1
```

- APK (za beta) → `build\app\outputs\flutter-apk\app-release.apk` (~69 MB)
- AAB (za Play) → `build\app\outputs\bundle\release\app-release.aab` (~61 MB)
- Release podpis: `mobile/android/key.properties` mora obstajati (keystore).
  Če ga ni, build tiho podpiše z debug ključem in Play ga zavrne.
- APK build je dolg (assembleRelease ~8 min), AAB potem hiter (~75 s).

## 3. Preveri verzijo v artefaktu (aapt2)

```bash
export MSYS2_ARG_CONV_EXCL="*"
AAPT=$(ls "$LOCALAPPDATA"/Android/Sdk/build-tools/*/aapt2.exe | sort | tail -1)
"$AAPT" dump badging "C:\gasilapp_mobile\build\app\outputs\flutter-apk\app-release.apk" | grep -E "package:|application-label:"
# pricakovano: versionCode='14' versionName='1.0.13' ... application-label:'Plamen'
```

## 4. Varnostne kopije PRED objavo

```bash
# lokalno arhiviraj artefakta (flutter clean bi ju sicer izbrisal)
cp app-release.aab build-arhiv/plamen-X.Y.Z-BUILD.aab
cp app-release.apk build-arhiv/plamen-X.Y.Z-BUILD.apk
# na strežniku: kopija baze (skill /gasilapp-deploy §1) + arhiv beta APK
ssh root@178.104.67.229 'cp /opt/gasilapp/downloads/gasilapp.apk /opt/gasilapp/downloads/gasilapp-X.Y.Z.apk'
```

Rollback: Play → »Dodaj iz knjižnice« s staro kodo · beta → arhiv APK · baza →
`gunzip -c /root/backup/pred-*.sql.gz | docker exec -i gasilapp-db-1 psql -U postgres gasilapp`.

## 5. Beta (scp + verifikacija SHA-256)

Beta stran s šumniki v poti — index.html najprej kopiraj na ASCII pot, sicer
scp iz Git Bash pomangla znake:

```bash
export MSYS2_ARG_CONV_EXCL="*"
cp "infra/beta/index.html" /tmp/beta-index.html   # ASCII pot
scp "C:\gasilapp_mobile\build\app\outputs\flutter-apk\app-release.apk" root@178.104.67.229:/opt/gasilapp/downloads/gasilapp.apk
scp /tmp/beta-index.html root@178.104.67.229:/opt/gasilapp/downloads/index.html
# verifikacija: SHA-256 se MORA ujemati (velikost ujame skrajšan prenos, ne tihe okvare)
sha256sum "C:\gasilapp_mobile\build\app\outputs\flutter-apk\app-release.apk"
ssh root@178.104.67.229 'sha256sum /opt/gasilapp/downloads/gasilapp.apk'
curl -s https://gasilapp.eu/beta | grep -o "Različica [0-9.]*"   # nova verzija
```

## 6. Google Play — nalaganje AAB

Tehnika klikanja je v `/play-release-internal`. Vrstni red za Plamen:

1. Track stran (URL zgoraj) → **»Ustvari novo izdajo«** → stran `.../releases/N/prepare`.
2. **AAB nalaganje mora uporabnik fizično povleči** (orodja ne morejo, ~61 MB
   > 10 MB limit). Odpri mu Raziskovalca z označeno datoteko:
   `Start-Process explorer.exe -ArgumentList "/select,`"C:\gasilapp_mobile\build\app\outputs\bundle\release\app-release.aab`""`
   Polna pot za »Prenesi«: `C:\gasilapp_mobile\build\app\outputs\bundle\release\app-release.aab`
3. Opombe ob izdaji: predloga ima `<sl>` / besedilo / `</sl>` v treh vrsticah —
   zamenjaj SAMO srednjo vrstico. Uspeh = »Opombe ob izdaji za 1 jezik«.
4. »Naprej« → predogled → **»Shrani in objavi«** + potrdi V DIALOGU (brez klika
   v dialogu ostane osnutek). Objave NE izvedi brez potrditve uporabnika.
5. Uspeh: track kaže »Aktivno · Najnovejša izdaja: N (X.Y.Z)«.

## E2E verifikacija

- Beta: SHA-256 ujemanje strežnik↔lokalno, `curl .../beta` kaže novo verzijo,
  `curl -sI .../beta/gasilapp.apk | grep -i content-length` = velikost artefakta.
- Play: track »Aktivno · Najnovejša izdaja: N«, testerji dobijo prek opt-in
  povezave (auto-update).

## Gotchas (vse so ugriznile 26. 7. 2026)

- **Po povleku AAB renderer zamrzne** (screenshot timeout »renderer frozen«) —
  NE ponavljaj; nov tab / navigate na isti `.../prepare` URL. **Upload se ob
  tem »izgubi« iz okvira, a je v knjižnici artefaktov** → v okviru za svežnje
  klikni **»Dodaj iz knjižnice«** in izberi kodo N (brez ponovnega nalaganja).
  Ista rešitev velja za napako »Koda različice N je že bila uporabljena«.
- **Seznam društev v prijavi (in podobni async seznami) se ne prikaže takoj** —
  pri Playwright/testih počakaj `wait_for_function(... options.length > 1)`.
- **Opozorilo »Spremembe podprtih naprav« NI napaka.** 1.0.13 je z minSdk 23
  skočil na 24 (`flutter pub upgrade` dvignil floor; glej CLAUDE.md) → −8 %
  modelov telefonov (Android 6.0). Za gasilce zanemarljivo; objava ni blokirana.
- **`?tab=testers` v URL-ju preusmeri na app-list** — do seznama testerjev
  pridi prek track strani → klik zavihek »Preizkuševalci«.
- **AAB build včasih pade z `flutter_native_splash does not exist`** (zastarel
  GeneratedPluginRegistrant) → `flutter clean && flutter pub get && build`.
- **Nikoli ne naloži samo APK/nove app brez backenda** — če nova različica kliče
  endpoint, ki ga prod nima, uporabnik dobi napako (glej `/gasilapp-deploy`).
  Vrstni red je vedno backend/splet PRVI, nato mobilna.

## Branje pošte za kontekst izdaje (Windows recept)

Pred sporočilom testerjem preveri, kaj je že bilo sporočeno (Gmail MCP).
`get_thread` velikih niti vrne >25k tokenov → shrani se v datoteko. Parsaj z
**python, ne jq** (jq ni nameščen v Git Bash):

```bash
export PYTHONIOENCODING=utf-8   # sicer cp1250 crash na šumnikih/→ v izpisu
python -c "import json; d=json.load(open(r'C:\pot\do\rezultata.txt',encoding='utf-8')); ..."
# python na Windows NE razume /c/... poti — uporabi C:\ ali C:/ obliko
```
