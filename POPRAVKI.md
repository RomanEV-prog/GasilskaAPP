# Popravki in predlogi — Plamen

Tekoč seznam popravkov in predlogov, ki jih sproti vpisujeva. Nove vpiši pod
**Odprto**; ko je rešeno, premakni v **Rešeno** z datumom in commitom.

Legenda pomembnosti: 🔴 hrošč · 🟡 izboljšava · 🔵 predlog / za razmislek

---

## Odprto

| # | ⚑ | Področje | Opis | Zabeleženo |
|---|---|---|---|---|
| — | — | — | (trenutno prazno) | — |

---

## Rešeno

| # | ⚑ | Področje | Kaj je bilo narejeno | Rešeno |
|---|---|---|---|---|
| 1 | 🟡 | Naslovna stran / registracija | Emoji 🔥 zamenjan z brand ikono Plamen (zaobljena ploščica, ujema se z app ikono): web `LoginPage` + `RegisterPage` (`/plamen-icon.png`), mobilna `login_screen.dart` (`assets/plamen-icon.png`). | 22. 7. 2026 |
| 2 | 🟡 | Dogodki (splet + mobilna) | Dodano odštevanje do dogodka (badge **danes / jutri / čez N dni**), barvno kot roki: web `EventsPage` (`eventCountdown`), mobilna `event_card.dart` (`_countdown`). | 22. 7. 2026 |
| 3 | 🟡 | Vozila — opomniki (backend) | Opomnik za roke vozil (registracija/zavarovanje/servis) se zdaj pošlje **vsakih 5 dni, ko je do izteka ≤ 30 dni** (30, 25, … 5) namesto le 7 in 3 dni. `scheduler/reminders.service.ts` (`VEHICLE_DEADLINE_DAYS`). Oprema ostane na 7/3. | 22. 7. 2026 |
| 4 | 🔴 | SPIN v spletu (regresija) | Dodan **zavihek SPIN v spletu** (`/spin`, `SpinPage`): nov backend endpoint `GET /spin/interventions` bere iz predpomnjene tabele (polni jo cron prek relaya) in filtrira po občinah društva. Živo preverjeno (23 intervencij za Ljubljano). | 22. 7. 2026 |
| 5 | 🟡 | Ikona znamke (splet + mobilna) | Emoji 🔥 zamenjan z ikono Plamen povsod, kjer je bil fallback za manjkajoč logotip: mobilna `OrgLogo` (nadzorna plošča), splet `AppLayout` (stranska vrstica, mobilni meni), uvodni vodič `OnboardingTour`, nastavitve društva. Živo potrjeno v mobilni in web portalu. Commita `95f8faf`, `884a7a5`. | 24. 7. 2026 |
| 6 | 🔴 | Pull-to-refresh vrgel izjemo (mobilna) | `setState(() => _future = ...)` je vračal Future → Flutterjeva napaka »setState() callback argument returned a Future« ob vsakem povleku navzdol na 6 zaslonih (plošča, obvestila, SPIN, dogodki, moja oprema, vozila). Blokovno telo vrne void. Živo: 0 izjem po osvežitvi. Commit `091d0eb`. | 24. 7. 2026 |
| 7 | 🔴 | Varnostne izboljšave | (a) CORS v produkciji strogo na `FRONTEND_URL`, v dev localhost na katerem koli portu; (b) JWT modulski privzetek poenoten na `JWT_ACCESS_EXPIRES` (1h) namesto mrtvega `JWT_EXPIRES_IN` (7d); (c) `backend/.env.schema` (varlock) — tipi + `@sensitive`. Preverjeno: E2E 71/71, žeton 1h, CORS preflight OK/tuj zavrnjen. Commit `7db0842`. | 25. 7. 2026 |
| 8 | 🔴 | Odziv na dogodek ni bil viden na Nadzorni plošči (mobilna) | `GET /dashboard/member` je vračal `upcomingEvents` **brez** `myRsvpStatus` (`findUpcoming` ga ni pripel) → kartica »Naslednji dogodek« je vedno pisala »Brez odziva«. Dodan `EventsService.findUpcomingWithMyRsvp()`. Poleg tega zavihki živijo v `IndexedStack` in se po prvem nalaganju niso osvežili: dodan signal `providers/events_bus.dart` (plošča, dogodki, koledar se osvežijo ob oddanem odzivu in ob vrnitvi z detajla). V koledarju `RsvpButtons` dobil `ValueKey(e.id)` — brez njega je ob menjavi dneva kljukica ostala pri napačnem dogodku. Živo: pred RSVP `myRsvpStatus=[]` → po RSVP `[attending]`. | 29. 7. 2026 |
| 9 | 🟡 | SPIN — povezava na izvorno stran (mobilna) | Tap na intervencijo v zavihku SPIN odpre originalno stran dogodka na `spin3.sos112.si` (`<link>` iz feeda, rezerva `<guid>`; dovoljena samo http/https). Na kartici oznaka »Odpri na SPIN ↗«. **Enako ob tapu na push obvestilo**: `fcm_service.dart` obravnava `onMessageOpenedApp`, `getInitialMessage` in tap na obvestilo v ospredju (podatki v payloadu) — SPIN obvestilo odpre svojo stran, brez povezave preklopi na zavihek SPIN, ostala obvestila na zavihek Obvestila (`providers/app_nav.dart`). Živo na emulatorju: testni push → tap → Chrome na `…/javno/zemljevid/465730`. | 29. 7. 2026 |
| 10 | 🟡 | Gumbi odziva se niso ločili (mobilna) | Izbrani in neizbrani gumb sta se razlikovala le v prosojnosti (0,85 vs 1,0) + kljukici v besedilu — vtis, da odziv ni bil zabeležen. Zdaj je izbrani **poln** (barva, bela pisava, ikona ✓, debelejša obroba), neizbrani samo obrobljen na svetli podlagi. Testa `test/rsvp_buttons_test.dart`. | 29. 7. 2026 |
| 11 | 🟡 | Oprema + NFC (mobilna, 1.0.17) | Zapis NDEF vsebine na NFC oznake (vrsta, zadolžitev, roki — berljivo s katerimkoli NFC bralnikom), vnos nove opreme prek neznane nalepke, urejanje podatkov, zadolži/vrni z iskalnikom članov, zgodovina zadolžitev, seznam opreme z iskalnikom, ločen NFC/QR skener (brez kamere pri NFC). Backend: osebni opomniki zadolženim članom o pregledih/rokih. Mimogrede: SPIN relay nginx mrtev od 28. 7. (DNS ob rebootu) — obnovljen + systemd utrditev. Živo preverjeno na Redmi Note 13 Pro (zapis, branje, vnos). | 3. 8. 2026 |

Točke 1–4 rešene v seji 22. 7. 2026; točke 5–7 v seji 24.–25. 7. 2026;
točke 8–10 v seji 29. 7. 2026; točka 11 v seji 3. 8. 2026 (izdaja 1.0.17, koda 18).
Preverjeno: backend `tsc` + E2E 71/71 (29. 7. 2026: 92/92), frontend `tsc` +
`build`, `flutter analyze` (No issues found), `flutter test` 6/6, živi testi
(prijava, CORS, Playwright prijava v portal 3/3; 29. 7. 2026 na emulatorju
Pixel 6: odziv → plošča, tap na SPIN kartico in na push obvestilo → SPIN stran).
