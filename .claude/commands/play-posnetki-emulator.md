# Posnetki zaslona za Play/marketing prek emulatorja (telefon + tablice)

Iz seje Plamen 3. 8. 2026 (29 posnetkov: telefon, tablica 10"/7", web).
Uporabi za trgovinske posnetke, spletno stran ali predstavitve.
Razmejitev: `/android-naprava-vs-emulator` je o razlikah naprava/emulator,
ta skill o proizvodnji LEPIH, POLNIH posnetkov.

## Zakaj / arhitektura

- **Demo najemnik namesto pravih podatkov**: `docs/demo-seed.sql` ustvari
  »PGD Sončni Vrh« (20 članov, 12 dogodkov, 6 vozil, 30 kosov opreme;
  datumi RELATIVNI na CURRENT_DATE ob sejanju). Prijava `demo@plamen.si` /
  `GasilApp123!` — SAMO V DEV BAZI, na produkciji ne obstaja.
- Posnetki iz **release gradnje proti lokalnemu backendu**
  (`--dart-define=API_URL=http://10.0.2.2:4000/api/v1`) — brez debug pasice.
- Play omejitve: telefon max 8 posnetkov (vsaka stran 320–3840 px);
  ločena razdelka za 7" in 10" tablico.

## Konkretni recepti

### Čist status bar (demo način SystemUI)
```bash
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0900
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
# izhod: … -e command exit   (ali reboot)
```

### Tablični posnetki BREZ tabličnega AVD
```bash
adb shell wm size 1600x2560 && adb shell wm density 320   # ~10"
adb shell wm size 1200x1920 && adb shell wm density 240   # ~7"
adb shell am force-stop <pkg> && adb shell am start -n <pkg>/.MainActivity
# … posnetki …
adb shell wm size reset && adb shell wm density reset
```

### Zajem in obreza
```bash
adb exec-out screencap -p > posnetek.png     # iz Git Bash; PowerShell '>' pokvari binarno!
```
Tablični način prikaže **taskbar z ikonami zaganjalnika na dnu** — odreži ga
s Pillow (10": crop do y=2445 od 2560; 7": do y=1832 od 1920). Po `wm size`
se demo status bar RESETIRA → broadcastaj `enter`+nastavitve znova.

### Web posnetki (Playwright, demo najemnik)
`python .claude/skills/webapp-testing/scripts/with_server.py --server
"npm run dev -- --port 3010 --strictPort" --port 3010 -- python <skripta>`
— **port 3000 na tem stroju zaseda eVersum!** Brez `--strictPort` Vite tiho
preskoči na drug port in skripta slika tujo aplikacijo. V skripti po
prijavi klikni »Preskoči vodič« (uvodni čarovnik prekrije vse strani).

## E2E verifikacija

Vsak posnetek PREGLEJ (Read PNG): šumniki, prave barve, poln podatek,
demo ura 09:00. Prazni zasloni (npr. »Moja oprema«) → dopolni demo podatke
v bazi (assignment za demo uporabnika) in ponovi.

## Gotchas

- **SPIN zavihek na emulatorju ne dela** (spin3.sos112.si nedosegljiv iz
  emulatorjevega omrežja) — izpusti ga ali slikaj na pravem telefonu.
- **`adb shell input tap` po `keyevent 4` lahko pade iz aplikacije** (tap na
  launcher odpre Google Assistant ipd.) — po vsakem koraku screenshot za
  kontrolo, ne slepo zaporedje.
- **Fotografije/zunanje povezave**: zavihek »Fotografije« brez nastavljene
  povezave društva vrže samo snackbar — ni posnetka.
- **Demo geslo z `!`**: `adb input text` ga ne vtipka zanesljivo — začasno
  zamenjaj demo hash (bcryptjs) in ga po seji VRNI (originalnega shrani prej).
- Prehodna slika kamere/dovoljenj je v NEMŠČINI, če je emulator nemški —
  sistemskih dialogov ne slikaj.
- Posnetke arhiviraj v `build-arhiv/play-posnetki-<datum>/` (gitignorirano,
  a lokalno trajno); Play: Grow → Store presence → Main store listing.
