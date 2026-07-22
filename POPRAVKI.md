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

Vse štiri rešene v seji 22. 7. 2026; preverjeno: backend `tsc` + živi test SPIN
endpointa, frontend `tsc` + `build`, `flutter analyze` (No issues found).
