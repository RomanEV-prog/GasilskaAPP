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

Točke 1–4 rešene v seji 22. 7. 2026; točke 5–7 v seji 24.–25. 7. 2026.
Preverjeno: backend `tsc` + E2E 71/71, frontend `tsc` + `build`,
`flutter analyze` (No issues found), živi testi (prijava, CORS, Playwright
prijava v portal 3/3).
