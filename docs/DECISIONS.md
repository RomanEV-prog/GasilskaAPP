# GasilApp — Arhitekturne odločitve (ADR)

## ADR-001: Multi-tenant z shared database

**Odločitev:** En PostgreSQL database, vsaka tabela ima `organization_id`.

**Razlogi:**
- Manjši operativni overhead (ne rabimo N baz)
- Lažji deployment za MVP
- Enostavnejše backup strategije

**Kompromisi:**
- Row-level isolation samo na aplikacijskem nivoju (ne DB)
- Počasnejše query-ji brez pravilnih indexov → dodali indexe na vse `organization_id` kolumne

---

## ADR-002: NestJS namesto Express ali ASP.NET

**Odločitev:** NestJS z TypeScriptom.

**Razlogi:**
- TypeScript type safety
- Vgrajen dependency injection
- Modularnost (vsak modul je encapsuliran)
- Odlična Swagger integracija
- Hiter MVP razvoj

---

## ADR-003: JWT namesto Sessions

**Odločitev:** Stateless JWT tokeni, expiry 7 dni.

**Razlogi:**
- Deluje za mobilno aplikacijo (Flutter) in web brez problemov
- Ne potrebujemo session store
- `organizationId` in `roles` v payloadu → manj DB klicev

**Varnost:**
- Secret v `.env`, ne v kodi
- Refresh token TODO za v2

---

## ADR-004: TypeORM namesto Prisma

**Odločitev:** TypeORM.

**Razlogi:**
- Boljša integracija z NestJS decoratorji
- Zrelejši za PostgreSQL
- Team izkušnje

---

## ADR-005: Firebase FCM za push obvestila

**Odločitev:** Firebase Cloud Messaging.

**Razlogi:**
- Brezplačen za naše obseg
- Podpira iOS + Android + Web
- `fcm_token` shranjen na userju
- Subscription na `topic` za bulk pošiljanje

**Opomba:** Zahteva Firebase projekt + Apple Developer Account za iOS.

---

## ADR-006: Soft delete namesto hard delete

**Odločitev:** `is_active = false` namesto `DELETE FROM`.

**Razlogi:**
- Ohranimo zgodovino (audit)
- Član ki zapusti društvo ostane v evidenci prisotnosti preteklih važ
- Enostavnejše obnoviti

---

## ADR-007: organizationId iz JWT, ne iz URL

**Odločitev:** `organizationId` se bere iz JWT payloada, ne iz URL parametrov.

**Razlogi:**
- Prepreči da bi user dostopil do podatkov druge organizacije z manipulacijo URL-ja
- Vsak authenticated request avtomatično scoped na pravo organizacijo

```typescript
// ✅ PRAVILNO
@Get()
findAll(@CurrentUser('organizationId') orgId: string) {
  return this.service.findAll(orgId);
}

// ❌ NAROBE — user lahko poda katerikoli orgId
@Get(':orgId/members')
findAll(@Param('orgId') orgId: string) {
  return this.service.findAll(orgId);
}
```

---

## ADR-008: File storage — lokalno za MVP

**Odločitev:** Multer + lokalni disk za MVP, S3-compatible pozneje.

**Razlogi:**
- Hitrejši MVP
- Brez dodatnih storitev in stroškov

**Migracija na S3:**
- Abstraktiraj za `StorageService` interface
- MVP implementacija: `LocalStorageService`
- V2: `S3StorageService` (Minio ali AWS S3)

---

## ADR-009: Zadolžitve opreme — invarianta v bazi, ne v aplikaciji

**Odločitev:** Trenutni imetnik se bere z `LEFT JOIN` na `equipment_assignments`
(odprta zadolžitev = `returned_at IS NULL`). Brez denormaliziranega stolpca
`assigned_to` na `equipment`. Pravilo »en kos = največ ena odprta zadolžitev«
vsili delni unikatni indeks `idx_eq_assign_open`.

**Razlogi:**
- Aplikacijsko preverjanje ob hkratnih zahtevkih ne zdrži — dva klika na
  »Zadolži« bi ustvarila dve odprti vrstici. Indeks tak vpis zavrne (23505).
- Brez dvojnega pisanja ni razreda napak »stolpec kaže na že vrnjeno zadolžitev«.
- Delni indeks je majhen (le trenutno izdani kosi); društvo ima 10²–10³ kosov.

**Cena:** vsak seznam potrebuje join. Zanemarljivo pri tej velikosti.

---

## ADR-010: NFC oznake — hranimo UID, ne pišemo NDEF

**Odločitev:** Na opremo shranimo tovarniški UID nalepke (`equipment.nfc_uid`),
na oznako ne pišemo ničesar. Preslikava UID → oprema živi v bazi.

**Razlogi:**
- Deluje s prazno nalepko iz vrečke — ni koraka pisanja ob uvedbi.
- UID je tovarniško zaklenjen; nihče ga ne prepiše z »NFC Tools«.
- Ena resnica v bazi, skupaj s QR kodo.

**Kompromisi (zavestni):**
- **UID ni varnostni žeton** — klonirljive »magic« oznake obstajajo. Za evidenco
  inventarja zadošča, za dostopni nadzor NE.
- Brez baze je nalepka nema (NDEF z URL-jem bi se odprl na tujem telefonu).
  Sprejemljivo — aplikacija je zaprta za člane.
- QR kode obdržimo kot rezervo za naprave brez NFC.

**Strojna oprema:** kupljene NTAG213 nalepke (13,56 MHz) so za tiskovine in
**niso pralno odporne** — primerne za čelade, škornje, IDA, orodje. Za obleke in
rokavice bodo potrebne všivne/termo-lepljene pralne oznake; shema je enaka,
zamenjava ne zahteva sprememb kode.

---

## TODO za V2

- [ ] Refresh tokeni
- [ ] Row Level Security na PostgreSQL
- [ ] Bull Queue za email/push opomniki namesto cron
- [ ] WebSocket za real-time razpoložljivost
- [ ] S3 file storage
- [ ] Google/Apple/Outlook kalendar sync
- [ ] Rate limiting
- [ ] GZS API integracija (export poročil)
