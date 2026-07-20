# Plamen — mobilna aplikacija

Flutter odjemalec za platformo Plamen (interna organizacija prostovoljnih
gasilskih društev). Android v beta razdeljevanju, iOS ni objavljen.

**Navodila so v [`MOBILE.md`](MOBILE.md)** — zagon, Firebase, podpisovanje,
izdaja. Ta datoteka je samo kazalo.

## Hitri zagon

```bash
flutter pub get
flutter run    # Android emulator doseže gostitelja prek 10.0.2.2
```

## Kar te bo ugriznilo, če ne prebereš MOBILE.md

- **Pot projekta vsebuje `Š`** (`GASILSKO DRUŠTVO`) → Android build odpove
  (`aapt: Illegal byte sequence`). Gradi prek ASCII junction-a **iz
  PowerShell**, ne iz Git Bash — ta junction razreši nazaj na šumnično pot:
  ```powershell
  New-Item -ItemType Junction -Path 'C:\gasilapp_mobile' `
    -Target '<...>\GASILSKO DRUŠTVO\gasilapp\mobile'
  Set-Location 'C:\gasilapp_mobile'; flutter build apk --release
  ```
  `flutter analyze` in `flutter test` delujeta neposredno v pravi mapi.

- **Dart-define je `API_URL`, ne `API_BASE_URL`.** Napačno ime se prevede brez
  napake, aplikacija pa kaže na privzeti naslov.

- **Ime paketa ostaja `gasilapp_mobile`**, čeprav se aplikacija imenuje Plamen.
  Prav tako `si.gasilapp.gasilapp_mobile`. Razlogi: `CLAUDE.md` § »Ime Plamen
  vs. identifikator gasilapp«.

- **Brez `android/key.properties` + `upload-keystore.jks`** (oba gitignorana)
  build pade nazaj na debug podpis. Z debug podpisom **nadgradnja čez obstoječo
  namestitev ni mogoča**.
