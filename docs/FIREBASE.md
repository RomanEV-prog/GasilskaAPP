# Plamen — Firebase Cloud Messaging (FCM) setup

Push obvestila so **implementirana na vseh treh nivojih**, a se aktivirajo šele,
ko vstaviš prave poverilnice iz Firebase konzole. Brez njih vse gracefully
deluje naprej (push je samo izklopljen).

Kako deluje: ko vodstvo pošlje obvestilo (`POST /notifications`) ali se ustvari/
odpove dogodek, backend prek `firebase-admin` pošlje push na FCM žetone
prejemnikov. Web in mobilna app ob prijavi registrirata svoj žeton prek
`PATCH /auth/fcm-token`.

---

## 0. Firebase projekt

1. [Firebase konzola](https://console.firebase.google.com/) → **Add project** → poimenuj `gasilapp`.
2. Vklopi **Cloud Messaging** (samodejno na voljo).

---

## 1. Backend (`backend/.env`)

Firebase konzola → **Project settings → Service accounts → Generate new private key**
(prenese JSON). Iz njega prepiši v `.env`:

```env
FIREBASE_PROJECT_ID=gasilapp
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@gasilapp.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> `FIREBASE_PRIVATE_KEY` mora biti v narekovajih; `\n` ostanejo dobesedni
> (koda jih pretvori). Ob zagonu log pokaže *"Firebase inicializiran"* namesto
> opozorila. Neveljavni žetoni se samodejno počistijo iz baze.

Koda: `backend/src/modules/notifications/firebase.service.ts`

---

## 2. Web portal (`frontend/.env` + service worker)

Firebase konzola → **Project settings → General → Your apps → Web app** (dodaj, če je ni).
Prekopiraj `firebaseConfig` vrednosti:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=gasilapp.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gasilapp
VITE_FIREBASE_STORAGE_BUCKET=gasilapp.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abc...
VITE_FIREBASE_VAPID_KEY=   # Cloud Messaging → Web configuration → Key pair (Generate)
```

Nato **enake vrednosti** vpiši še v `frontend/public/firebase-messaging-sw.js`
(service worker ne bere env spremenljivk). Web config ni skrivnost.

Koda: `frontend/src/firebase.ts`, `frontend/src/hooks/useFcm.ts`

---

## 3. Mobilna app (Flutter)

Najlažje z uradnim CLI-jem (ustvari `firebase_options.dart` + `google-services.json`
+ `GoogleService-Info.plist`):

```bash
dart pub global activate flutterfire_cli
cd mobile
flutterfire configure --project=gasilapp
```

To prepiše predlogo `mobile/lib/firebase_options.dart` s pravimi vrednostmi.
`FcmService.init()` zazna konfiguracijo (apiKey != 'ZAMENJAJ') in vklopi push.

> Android: `flutterfire` doda `google-services.json` v `android/app/`. Če Gradle
> zahteva gms plugin, sledi izpisu `flutterfire`. Pot projekta vsebuje ne-ASCII
> znake — gradi prek ASCII junction-a (glej `mobile/MOBILE.md`).

Koda: `mobile/lib/services/fcm_service.dart`, `mobile/lib/firebase_options.dart`

---

## Test

1. Prijavi se v web/mobilno (registrira žeton).
2. Kot vodstvo pošlji obvestilo (`/notifications`) ali ustvari dogodek.
3. Push naj prispe. Backend log pokaže število uspešnih pošiljanj.
