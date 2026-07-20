# Ikona aplikacije — iz logotipa do preverjene ikone v APK

Postopek zamenjave ikone Flutter aplikacije: izrez motiva iz logotipa,
generiranje vseh gostot, adaptive icon za Android 8+, PWA ikone in
**preverjanje znotraj zgrajenega APK-ja**. Zgrajen iz seje 2026-07-20b
(preimenovanje v »Plamen«). Razmejitev: `/preimenovanje-znamke` je o
besedilu in identifikatorjih, ta skill o slikah.

## Zakaj / arhitektura

- **Preveri, ali je sploh kdaj bila zamenjana.** Privzeta Flutter ikona
  ostane tiho leta. Znak: `mipmap-*/ic_launcher.png` velikosti ~440–1500 B
  (prava ikona je desetkrat večja). V tem projektu je bila privzeta še po
  osmih izdajah.
- **Besedilo iz logotipa izreži.** Pri 48 dp je neberljivo, Android pa ime
  aplikacije že izpiše pod ikono — podvojeno in packasto. Za trgovino in
  splet uporabi celoten logotip, za ikono samo motiv.
- **Dva sloja, ne eden.** Android 8+ uporablja adaptive icon: ospredje +
  ozadje, lansirnik obreže na poljubno obliko (krog, kvadrat z zaobljenimi
  robovi). Brez `mipmap-anydpi-v26/ic_launcher.xml` dobiš na sodobnih
  napravah belo/sivo podlago okoli kvadratne ikone.
- **Varna območja se razlikujejo po namenu** — motiv kot delež platna:

  | Namen | Delež | Zakaj |
  |---|---|---|
  | legacy `ic_launcher.png` | ~0,72 | kvadrat, obreže se malo |
  | adaptive `ic_launcher_foreground` | ~0,50 | lansirnik obreže na sredinskih **66 %** |
  | PWA `icon-512-maskable` | ~0,52 | varno območje je sredinskih 80 % premera |
  | PWA navadna, apple-touch | ~0,72 | brez obreza |

## Konkretni recepti

### 1. Izmeri motiv, ne ugibaj koordinat

Nasičenost loči barvit motiv od temnega ozadja **in** od belega besedila:

```python
from PIL import Image
src = Image.open(SRC).convert("RGB"); px = src.load()
minx, miny, maxx, maxy = src.width, src.height, -1, -1
for y in range(src.height):
    for x in range(src.width):
        r, g, b = px[x, y]
        mx, mn = max(r, g, b), min(r, g, b)
        if mx < 60: continue                  # ozadje
        if (mx - mn) / mx > 0.45:             # nasiceno = motiv (belo besedilo pade ven)
            minx, miny = min(minx, x), min(miny, y)
            maxx, maxy = max(maxx, x), max(maxy, y)
```

### 2. Alfa iz svetlosti (deluje, ker je končno ozadje temno)

```python
lum = 0.299*r + 0.587*g + 0.114*b
a = max(0.0, min(1.0, (lum - 10.0) / 38.0))   # <10 prosojno, >48 polno
```

Temne notranje sence motiva postanejo polprosojne — nad temnim ozadjem je
rezultat vizualno enak izvirniku. Nad svetlim ozadjem ta trik NE deluje.

### 3. Optično središče

Plamen (in večina motivov) je spodaj težji. Postavi ga **2 % višje** od
geometrijskega središča, sicer izgleda pogreznjen:

```python
canvas.alpha_composite(f, ((size-fw)//2, (size-fh)//2 - int(size*0.02)))
```

### 4. Kaj vse generirati

```
mobile/android/app/src/main/res/
  mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher.png              48/72/96/144/192
  mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher_foreground.png  108/162/216/324/432
  mipmap-anydpi-v26/ic_launcher.xml
  values/ic_launcher_background.xml
frontend/public/icons/
  icon-192.png  icon-512.png  icon-512-maskable.png  apple-touch-icon.png (180)
infra/brand/
  play-icon-512.png  <logotip>-1024.png
```

`mipmap-anydpi-v26/ic_launcher.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
```

`values/ic_launcher_background.xml` definira `<color name="ic_launcher_background">`.
`AndroidManifest.xml` pusti pri `android:icon="@mipmap/ic_launcher"` — sistem
sam izbere XML na v26+ in PNG na starejših.

## E2E verifikacija

**`flutter analyze` NE preveri sklicev na vire.** Pokaže »No issues found!«,
tudi če `@color/ic_launcher_background` ne obstaja. Dokaz je šele build:

```powershell
cd C:\gasilapp_mobile        # ASCII junction, iz PowerShell (glej MOBILE.md)
flutter build apk --release --dart-define=API_URL=https://gasilapp.eu/api/v1
```

Nato v zgrajenem APK-ju (`aapt2` iz `$LOCALAPPDATA\Android\Sdk\build-tools\36.0.0\`):

```bash
# 1. ime + na katero ikono kaze manifest
aapt2 dump badging app-release.apk | grep -E "^package:|application-label:|application:"
#    icon='res/BW.xml' pri VSEH gostotah = adaptive icon je v uporabi

# 2. ali se sklici v XML razresijo (@0x7f... in NE @null)
aapt2 dump xmltree app-release.apk --file res/BW.xml

# 3. ID -> datoteka + barva ozadja
aapt2 dump resources app-release.apk | grep -A 8 "resource 0x7f0c0000"
aapt2 dump resources app-release.apk | grep -A 1 "color/ic_launcher_background"

# 4. POGLEJ sliko: izvleci in odpri
unzip -o -q app-release.apk "res/o-.png" && open res/o-.png
```

Predogled, kakor bo videti v lansirniku (ozadje + ospredje, obrez na 66 %,
krogla maska), sestavi v Pillow — tako vidiš obrez, preden namestiš na telefon.

## Gotchas

- **Imena virov so v release buildu skrčena** (`res/BW.xml`, `res/o-.png`) —
  `grep ic_launcher` po vsebini APK-ja ne vrne NIČ. To ni napaka. Pot je
  `dump badging` → ID → `dump resources` → obfuscirano ime datoteke.

- **`flutter analyze` je slep za vire.** Zlomljen sklic v `ic_launcher.xml`
  pade šele pri `aapt2 link` med buildom. Nikoli ne razglasi ikone za
  zamenjano brez uspešnega release builda.

- **`android:roundIcon` preveri posebej.** Če ga manifest ima in kaže na
  neobstoječ/star `ic_launcher_round`, bo del lansirnikov uporabil njega in
  ne tvoje ikone. V tem projektu ga ni — potrdi z
  `aapt2 dump xmltree <apk> --file AndroidManifest.xml | grep -i icon`.

- **»Namestil sem, ikona je stara« ni nujno napaka ikone.** Po vrsti preveri:
  1. različico v aplikaciji (star APK?),
  2. `Cache-Control` na strežniku — brskalnik lahko postreže predpomnjen
     star APK z iste poti (glej `/gasilapp-deploy`),
  3. predpomnilnik lansirnika — Samsung/Xiaomi po nadgradnji čez obstoječo
     namestitev pogosto obdržita staro ikono do odstranitve ali ponovnega
     zagona.
  Sveža namestitev po odstranitvi izloči 2 in 3 naenkrat.

- **PWA ikone brskalnik agresivno predpomni.** Kdor ima portal dodan na
  začetni zaslon, bo videl staro ikono, dokler bližnjice ne odstrani in
  doda znova. Vsebina `manifest.webmanifest` se osveži prej kot ikona.

- **Preveri bajtno ujemanje po objavi**, ne le da stran deluje:
  ```bash
  curl -sI https://gasilapp.eu/icons/icon-512.png | grep -i content-length
  ```
  primerjaj z `ls -l frontend/public/icons/`.

## Preverjeno delujoče (2026-07-20b)

Logotip 1024×1024 z besedilom → izmerjen okvir motiva `(347,181)-(674,668)`
→ 16 PNG + 2 XML → `flutter build apk` → `aapt2` potrdi `label='Plamen'`,
`icon='res/BW.xml'`, ozadje `#ff121519`, ospredje v 5 gostotah → izvlečen
`res/o-.png` vizualno potrjen kot plamen → na napravi potrjeno po sveži
namestitvi.
