# Diagnostika mobilne aplikacije na uporabnikovem telefonu (USB + strežnik)

Iz seje Plamen 3. 8. 2026: »seznam društev se ne naloži« se je izkazal za
DVE ločeni napaki (mrtvo omrežje; nato pokvarjena obnovljena šifrirana
shramba). Uporabi, ko aplikacija na PRAVEM telefonu »ne dela«, na tvoji
strani pa je vse zeleno. Razmejitev: `/android-naprava-vs-emulator` je o
emulatorju in namestitvah — ta skill je o diagnozi V ŽIVO, po plasteh.

## Zakaj / arhitektura

Napaka v vmesniku tipa »Preverite povezavo« zlije v eno vrečo: mrtvo
omrežje, DNS, TLS, strežniško napako, rate-limit IN lokalne izjeme
(shramba!). Diagnosticiraj po plasteh od zunaj navznoter in vsako plast
POTRDI z meritvijo, ne z ugibanjem.

## Konkretni recepti (po vrsti)

```bash
export PATH="$PATH:$LOCALAPPDATA/Android/Sdk/platform-tools"
# 0. Kaj sploh teče na telefonu?
adb shell dumpsys package si.gasilapp.gasilapp_mobile | grep -E "versionName|lastUpdateTime|installerPackageName"
#    installerPackageName=com.android.vending → Play build (split APK-ji, Playov podpis)

# 1. Omrežje telefona (poglej tudi statusno vrstico na screenshotu: "E" = EDGE!)
adb exec-out screencap -p > stanje.png            # ikone: Wi-Fi? E/H+? klicaj?
adb shell "ping -c 3 -W 5 plamenapp.si"          # DNS + izguba paketov s telefona

# 2. Ali promet telefona sploh PRIDE do strežnika? (telefon na istem Wi-Fi kot PC)
MYIP=$(curl -s ifconfig.me)
ssh root@178.104.67.229 "timeout 25 tcpdump -n -i eth0 host $MYIP and port 443 | head -40" &
adb shell am force-stop <pkg>; adb shell am start -n <pkg>/.MainActivity
#    SYN+SYN/ACK+dolžine >0 = TLS in HTTP izmenjava potekata → napaka je V aplikaciji

# 3. Dnevnik samo od aplikacije
PID=$(adb shell pidof <pkg>); adb logcat -d --pid=$PID -v time | tail -40
#    release Flutter NE loga požrtih izjem (catch (_) {}) — prazen dnevnik NI dokaz zdravja

# 4. Potrdilna operacija: pm clear = "Izbriši podatke"
adb shell pm clear <pkg>   # če po tem dela → vzrok je bil v shranjenih podatkih
```

## Past: Auto Backup + flutter_secure_storage (ugriznila 3. 8. 2026)

**Simptom:** po ODSTRANITVI in ponovni namestitvi (Play) del aplikacije
javlja »omrežno« napako, drugi del (prijava) dela; omrežje in strežnik OK.
**Vzrok:** Googlov Auto Backup ob ponovni namestitvi obnovi šifrirane
nastavitve (flutter_secure_storage), ključ v Android Keystore pa je bil z
odstranitvijo IZBRISAN → vsako branje shrambe vrže izjemo; skupni
`catch (_)` okoli omrežnega klica IN branja shrambe napako pripiše omrežju.
**Rešitev (v 1.0.18):**
- `android:allowBackup="false"` + `android:fullBackupContent="false"` +
  `android:dataExtractionRules="@xml/data_extraction_rules"` (Android 12+ svoja
  pravila; datoteka z `exclude` za vse domene, glej repo),
- branje shrambe LOČI od omrežnega klica; ob izjemi `storage.deleteAll()`
  in nadaljuj,
- ob napaki seznama ponudi »Poskusi znova« (prej se je enkratna napaka
  ob zagonu obdržala do ponovnega zagona).
Za PRIZADETE uporabnike (nameščeno pred popravkom): Nastavitve → Aplikacije
→ Plamen → Izbriši podatke (ali `pm clear`).

## Gotchas

- **»Ponovno pognal« pri uporabniku pogosto pomeni obuditev iz nedavnih** —
  initState se NE izvede znova in stara napaka obvisi. Prek USB naredi
  `am force-stop` + `am start`, da je hladni zagon zares hladen.
- **Ohranjeno vpisano besedilo po »ponovni namestitvi« razkrije, da podatki
  niso bili pobrisani** — hitrejši indic kot spraševanje.
- **`pm clear` ne pobriše vnosov v Keystore** (skill android-naprava), a za
  backup-past je dovolj: pobriše obnovljeno šifrirano DATOTEKO.
- **tcpdump filtriraj po domačem IP** (telefon na Wi-Fi deli javni IP s PC).
  Mobilni podatki imajo drug IP — takrat filtriraj obratno (port 443 + SNI).
- **Chrome »dela«, aplikacija ne** ni protislovje: Chrome ima predpomnilnik
  in potrpljenje; ping s telefona (`100 % packet loss` na EDGE) je merodajen.
- **Konzolni toast »Prišlo je do nepričakovane napake (66E6E334)« v Play
  Console po objavi** je kozmetika — merodajno je stanje tracka
  (»Aktivno · Najnovejša izdaja: N«).
