# Plamen — Mobilna aplikacija (Flutter)

> Ime aplikacije je **Plamen**; paket ostaja `si.gasilapp.gasilapp_mobile` in
> Dart paket `gasilapp_mobile`. Razlogi: `CLAUDE.md` § »Ime Plamen vs. gasilapp«.

## Setup

```bash
flutter create gasilapp_mobile
cd gasilapp_mobile

# Dodaj v pubspec.yaml:
# dependencies:
#   dio: ^5.0.0               # HTTP client
#   flutter_secure_storage: ^9.0.0
#   firebase_core: ^2.0.0
#   firebase_messaging: ^14.0.0
#   provider: ^6.0.0          # ali riverpod
#   intl: ^0.18.0
#   go_router: ^12.0.0
```

## Struktura

```
lib/
├── main.dart
├── api/
│   ├── api_client.dart
│   ├── auth_api.dart
│   ├── events_api.dart
│   └── users_api.dart
├── models/
│   ├── user.dart
│   ├── event.dart
│   └── notification.dart
├── providers/
│   ├── auth_provider.dart
│   └── events_provider.dart
├── screens/
│   ├── login_screen.dart
│   ├── dashboard_screen.dart
│   ├── events_screen.dart
│   ├── event_detail_screen.dart
│   ├── availability_screen.dart
│   └── notifications_screen.dart
└── widgets/
    ├── event_card.dart
    └── availability_badge.dart
```

## MVP zasloni (samo to za začetek)

1. **Login** — email + geslo
2. **Dashboard** — prihajajoči dogodki, moja razpoložljivost, zadnja obvestila
3. **Dogodki** — seznam + RSVP gumb
4. **Razpoložljivost** — nastavi status (available / na dopustu / ...)
5. **Obvestila** — seznam z read/unread

## Firebase FCM setup

```dart
// V main.dart
await Firebase.initializeApp();
final fcmToken = await FirebaseMessaging.instance.getToken();
// Pošlji token na API: PATCH /auth/fcm-token
```

## Zagon (dev)

```bash
cd mobile
flutter pub get
flutter run              # na priklopljeni napravi/emulatorju
```

- **Bazni URL:** `lib/api/api_client.dart` → `kApiBaseUrl`. Privzeto `http://10.0.2.2:4000/api/v1`
  (Android emulator doseže gostiteljev localhost prek `10.0.2.2`). Za fizično napravo
  zamenjaj z IP računalnika ali zaženi z `--dart-define=API_URL=http://<ip>:4000/api/v1`.
- **Test računa:** enaka kot backend (`admin@pgd-pekre.si` / `GasilApp123!`,
  `janez@pgd-pekre.si` / `Geslo1234`).

## Stanje

- ✅ Login (JWT v flutter_secure_storage, GoRouter redirect)
- ✅ Nadzorna plošča — povzetek (naslednji dogodek, št. neprebranih, usposabljanja)
- ✅ Dogodki + detajl z RSVP; seznam kaže lasten odziv (badge, brez odpiranja)
- ✅ Koledar (`table_calendar`) + povzetek »Danes« in »Naslednji dogodek«
- ✅ SPIN (zavihek »Intervencije«, bere lasten feed; NE meša z obvestili)
- ✅ Obvestila (naslov+datum, besedilo razpre ob tapu, tap = označi prebrano)
- ✅ Skeniranje opreme (QR + NFC), »Moja oprema«
- ✅ Vozila — **samo pregled**, za odgovorne (`chief_machinist`/`org_admin`);
  vnos v meniju računa (glej vzorec spodaj)
- ✅ Fotografije — vnos v meniju odpre album društva (`photoUploadLink`) prek
  `url_launcher`
- ✅ Firebase FCM — koda vgrajena (`firebase_core`/`firebase_messaging`,
  `FcmService`, žeton se pošlje ob prijavi). Aktivira se, ko `flutterfire configure`
  prepiše `lib/firebase_options.dart` s pravimi vrednostmi. Do takrat gracefully no-op.
  Navodila: `docs/FIREBASE.md`.

## Vzorec: nov pregledni (read-only) zaslon nad obstoječim API-jem

Zgrajen iz zavihka Vozila (2026-07-21). Ko web že upravlja neko entiteto in v
mobilni rabiš samo pregled, ne podvajaj urejanja — zrcali ta vzorec (predloga:
`screens/my_equipment_screen.dart`, `screens/vehicles_screen.dart`):

1. **Model** `models/<x>.dart` — `fromJson`, ki zrcali serializacijo backend
   entitete (TypeORM polja so camelCase). Ne ugibaj oznak/label — če je surova
   vrednost že berljiva (npr. GZS oznaka `GVC-1`), jo prikaži kot je.
2. **API** `api/<x>_api.dart` — samo `list()` / `get(id)` proti obstoječemu
   `GET`. Preveri RBAC v `<x>.controller.ts`: `GET` je pogosto odprt vsem članom,
   pisanje pa `@Roles(...)`.
3. **Zaslona** `screens/<x>_screen.dart` (`Scaffold`+`AppBar`+`RefreshIndicator`+
   `FutureBuilder`, stanja waiting/error/empty) in `<x>_detail_screen.dart`
   (ob odprtju osveži z `get(id)`, ker je `extra` iz seznama lahko zastarel).
4. **Poti** v `main.dart`: `/<x>` in `/<x>/:id` (`state.extra as <X>`).
5. **Vstopna točka:** dno ima že 5 zavihkov (max) — dodatne vnose daj v zgornji
   `PopupMenuButton` v `home_shell.dart`, **pogojno po vlogi**. Vloge zrcali
   backend `@Roles` prek getterja v `models/user.dart`
   (`canManageVehicles => roles.any(vehicleManageRoles.contains)`), NE skrivaj
   samo v UI brez preverbe pravice na backendu.

**Zunanje povezave:** `url_launcher` (`launchUrl(uri, mode:
LaunchMode.externalApplication)`); vrednost potegni ob kliku (npr.
`OrganizationsApi().me()['photoUploadLink']`), obravnavaj prazno/neveljavno s
snackbarjem.

## ⚠️ Gradle in ne-ASCII pot

Pot projekta vsebuje `GASILSKO DRUŠTVO` (Š). Android build (shader compiler + Gradle)
odpove na ne-ASCII poti. Rešitev — gradi prek ASCII junction-a:

```powershell
New-Item -ItemType Junction -Path 'C:\gasilapp_mobile' `
  -Target 'C:\Users\adler\Desktop\proizvodnja\GASILSKO DRUŠTVO\gasilapp\mobile'
Set-Location 'C:\gasilapp_mobile'; flutter build apk --debug
```

`android/gradle.properties` že vsebuje `android.overridePathCheck=true`.
`flutter analyze` in `flutter test` delujeta neposredno v pravi mapi.

## POZNEJE (še ni)

- Vozila: urejanje iz mobilne (zdaj samo pregled — urejanje v spletu)
- Offline mode
- Biometric login

## Release (Google Play)

- **Podpisovanje:** `android/key.properties` + `android/upload-keystore.jks` (oba **gitignorana** — geslo hrani lastnik projekta; brez njega ni posodobitev aplikacije!). `build.gradle.kts` ju samodejno uporabi; brez njiju pade nazaj na debug podpis (CI).
- **Build** (PowerShell, iz junction mape):
  ```powershell
  cd C:\gasilapp_mobile
  flutter build appbundle --release --dart-define=API_URL=https://<DOMENA>/api/v1
  ```
  Izhod: `build\app\outputs\bundle\release\app-release.aab`
- **Play Console:** aplikacija `si.gasilapp.gasilapp_mobile` → Production/Internal testing → naloži `.aab`. Obvezno: URL zasebnostne politike `https://<DOMENA>/zasebnost.html`, obrazec Data safety (zbiramo: ime/e-pošto — račun; FCM žeton — obvestila; ni deljenja s tretjimi), posnetki zaslona + ikona 512×512.
- **Verzija:** pred vsako objavo povečaj `version:` v `pubspec.yaml` (npr. `1.0.1+2` — `+N` je versionCode, mora biti vedno večji).
