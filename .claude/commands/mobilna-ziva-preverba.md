# Plamen — živa preverba mobilne spremembe na emulatorju

Kako spremembo v mobilni aplikaciji **res videti delovati** (ne le prevesti):
zagon na emulatorju, posnetki zaslona, klikanje prek `adb` in **nadzorovan
testni push**. Zgrajeno v seji 29. 7. 2026 (odziv na dogodek + SPIN povezava).
Razmejitev: `/gasilapp-play-izdaja` je o objavi; ta skill je o preverjanju
pred njo.

## Vrstni red

```powershell
# 1. Backend na dev (emulator ga doseže prek 10.0.2.2)
Set-Location 'C:\Users\adler\Desktop\proizvodnja\GASILSKO DRUŠTVO\gasilapp\backend'
Start-Process cmd.exe -ArgumentList "/c npm run start:dev > C:\pot\do\backend.log 2>&1" -WindowStyle Hidden
# počakaj ~60 s in preveri, da res odgovarja — »Nest application started« v logu ni dovolj:
Invoke-RestMethod -Uri 'http://localhost:4000/api/v1/auth/organizations' -TimeoutSec 10

# 2. Emulator
Set-Location 'C:\gasilapp_mobile'      # ASCII junction, OBVEZNO iz PowerShell
flutter emulators --launch Pixel_6
flutter run -d emulator-5554 --dart-define=API_URL=http://10.0.2.2:4000/api/v1
```

## Pasti

- **`adb` ni v PATH.** Polna pot: `$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe`.
- **`adb exec-out screencap -p > slika.png` iz PowerShell pokvari sliko** —
  preusmeritev vrine BOM in prekodira bajte (datoteka se začne z `ef bb bf`,
  ne s `PNG`). Delujoče: posnetek na napravo, nato `pull`:
  ```powershell
  & $adb shell screencap -p /sdcard/s.png
  & $adb pull /sdcard/s.png "$dir\s.png"
  ```
- **Koordinate za `adb shell input tap` so v ločljivosti naprave (1080×2400)**,
  posnetek pa se v pogledu prikaže pomanjšan (npr. 900×2000) → koordinate iz
  slike pomnoži s faktorjem (tu 1,2). Spodnja navigacija je pri y ≈ 2244.
- **Backend log v isto datoteko iz dveh zagonov** — če stari proces datoteko še
  drži, nov zapis ne pride skozi in log kaže staro sejo. Za vsak zagon nova
  datoteka.
- **Prijava prek API-ja:** polje je **vedno `username`** — e-pošto vpiši vanj
  (`organizationId` takrat ni potreben). Telesa z `email` backend zavrne
  (`property email should not exist`). Odgovor je ovit: `$r.data.accessToken`,
  seznam društev `$r.data`. Prijava je rate-limitana 5/min.

## Nadzorovan testni push (FCM)

Čakanje na pravi SPIN push ni preverba — pošlji svojega. `firebase-admin` je
nameščen **le v `backend/node_modules`**, zato mora skripta teči iz mape
`backend` (kopiraj jo tja, po uporabi pobriši).

```javascript
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(
  JSON.parse(fs.readFileSync('gasilapp-firebase-adminsdk-fbsvc-289f7e1880.json','utf8'))) });
admin.messaging().send({
  token,                                   // iz baze, glej spodaj
  notification: { title: '🚨 SPIN: TEST', body: 'Testna intervencija' },
  data: { type: 'spin', link: 'https://spin3.sos112.si/javno/zemljevid/465730' },
  android: { priority: 'high' },
});
```

Žeton naprave iz razvojne baze:
```powershell
docker exec gasilapp-db psql -U postgres -d gasilapp -t -A -c "select fcm_token from users where username='demo';"
```

Preverba, **katero povezavo** je tap dejansko odprl (zanesljiveje od posnetka):
```powershell
& $adb shell dumpsys activity activities | Select-String 'act=android.intent.action.VIEW'
# → Intent { act=...VIEW dat=https://spin3.sos112.si/javno/zemljevid/465730 ... }
```

Push tapni **z app v ozadju** (`input keyevent KEYCODE_HOME`), sicer preizkusiš
le pot v ospredju. Vse tri poti so ločene: ospredje (payload lokalnega
obvestila), ozadje (`onMessageOpenedApp`), zagon iz obvestila
(`getInitialMessage`).

## Ko app ne kaže svežih podatkov

Zavihki so v `IndexedStack` — **vsi ostanejo živi in se po prvem nalaganju sami
ne osvežijo**. Sprememba, oddana v enem zavihku, v drugem ne bo vidna brez
signala (`providers/events_bus.dart`) ali osvežitve ob vrnitvi z detajla.
Če se torej vrednost »ne shrani«, najprej preveri, ali jo endpoint sploh vrača
(`curl`/`Invoke-RestMethod`), šele nato išči napako v vmesniku.
