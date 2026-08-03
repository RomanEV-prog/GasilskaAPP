# NFC — pisanje NDEF na oznake opreme (nfc_manager v4)

Iz seje Plamen 3. 8. 2026 (izdaji 1.0.17/1.0.18: zapis oznak, vnos opreme
prek nalepke, inventura vozil). Uporabi pri razširjanju NFC funkcij.
Razmejitev: `/android-naprava-vs-emulator` je o napravi/emulatorju na
splošno — ta skill je o NDEF pisanju in NFC tokovih Plamna.

## Zakaj / arhitektura

- **Vir resnice ostaja UID → oprema v bazi** (ADR-010 + dopolnilo 3. 8.).
  NDEF besedilo na oznaki je le berljiv POSNETEK stanja ob zapisu — ob
  spremembi ga upravljavec zapiše znova (aplikacija ob shranjevanju opomni).
- **Ne zaklepamo oznak** (`makeReadOnly` je nepovraten) — zadolžitve se
  spreminjajo, oznaka mora ostati prepisljiva.
- Oznake NTAG213 ≈ 144 B, **NTAG215 ≈ 504 B** (kupljene), NTAG216 ≈ 888 B.
  Naš zapis (naziv+vrsta+inv+zadolžitev+roki+vozilo) ≈ 150–200 B.
- Tok »najprej nalepka, potem podatki«: skener ob neznani oznaki (404)
  upravljavcu ponudi »Dodaj novo opremo« z že ujetim UID
  (`scan_screen._handleResult` + `equipment_create_screen`).

## Konkretni recepti

### NDEF v nfc_manager 4.x (API drugačen od v3!)
```dart
import 'package:nfc_manager/ndef_record.dart';   // re-export ndef_record paketa
// Android: NdefAndroid.from(tag) → isWritable, maxSize, writeNdefMessage(msg)
// iOS:     NdefIos.from(tag)     → status (NdefStatusIos.notSupported/readOnly/readWrite),
//                                  capacity, writeNdef(msg)
```
`ndef_record` NIMA tovarn za Text/URI — well-known Text zapis sestavi ročno:
```dart
NdefRecord(
  typeNameFormat: TypeNameFormat.wellKnown,
  type: Uint8List.fromList([0x54]),            // 'T'
  identifier: Uint8List(0),
  // statusni bajt: bit7=0 (UTF-8), spodnji biti = dolžina kode jezika
  payload: Uint8List.fromList([2, ...ascii.encode('sl'), ...utf8.encode(text)]),
)
```
Celoten ovoj: `NfcService.startWrite(message, onResult)` v
`mobile/lib/services/nfc_service.dart` — vrne `NfcWriteStatus`
(ok/notNdef/readOnly/tooLarge) + UID, da klicatelj oznako poveže tudi ob
neuspelem zapisu (UID je vedno berljiv).

### Inventura (kontinuirano branje)
`NfcService.start((uid) …)` pusti sejo odprto — vsak prislon sproži klic;
ujemanje po `equipment.nfcUid`, ročni checkbox za kose brez oznake
(`vehicle_inventory_screen.dart`). Backend `POST /vehicles/:id/equipment-check`
tuje ID-je tiho izpusti (varnost) in ob manjkih obvesti upravljavce.

## E2E verifikacija

- Emulator NIMA NFC — pisanje se preverja SAMO na pravi napravi.
- Po zapisu preberi oznako z drugim telefonom/NFC orodjem: besedilo mora
  biti sveže; nato spremeni zadolžitev → »Znova zapiši« → ponovno preberi.
- Prisloni povezano oznako v skenerju → odpre pravi kos (branje za vse člane).

## Gotchas

- **`adb shell input text` NE vtipka `!` zanesljivo** — geslo z `!` je ob
  avtomatiziranem vnosu padlo, ročni vnos dela. Za teste uporabi geslo brez
  posebnih znakov ali začasno zamenjaj hash v dev bazi (bcryptjs; POZOR:
  `$` v hashu prek `ssh "…'$HASH'…"` oddaljena lupina razširi v prazno —
  SQL podaj prek stdin: `printf … | ssh … "docker exec -i … psql"`).
- **Vnos prek dveh polj z adb**: tap na drugo polje med tipkanjem NE prime —
  uporabi `input keyevent 61` (Tab) za premik fokusa.
- **Prazna »Moja oprema« ni napaka zapisa** — kos ni zadolžen uporabniku.
  Za test dodeli kos prek `equipment_assignments` (en odprt zapis na kos).
- **Novo vnesena oprema »se ne shrani«** je bil v resnici manjkajoč seznam:
  mobilna do 1.0.18 ni imela pregleda vse opreme — vnos je uspel, kosa pa
  ni bilo kje videti. Preveri bazo, preden loviš »izgubljene« vnose.
- **Xiaomi/HyperOS blokira `adb install`** (`INSTALL_FAILED_USER_RESTRICTED`)
  → potisni v `/sdcard/Download/` (z `MSYS_NO_PATHCONV=1`, Windows pot v
  narekovajih) in uporabnik namesti iz Datotek. **Stari APK-ji v Prenosih
  zavajajo** — ob »nova različica ne dela« najprej preveri
  `dumpsys package <pkg> | grep versionName` (vse testne gradnje imajo isto
  ime različice → primerjaj md5 APK-ja).
- **Prek Play nameščene aplikacije NI mogoče nadgraditi s sideload APK** —
  Play App Signing podpiše z drugim ključem (`INSTALL_FAILed_UPDATE_INCOMPATIBLE`);
  najprej odstrani Play različico.
