# GasilApp — skilli

Postopki, ki so v tem projektu stali več poskusov in jih ni vredno odkrivati
znova. Uporabi jih z `/` + ime v terminalu, kjer delaš na GasilApp.

```
/gasilapp-deploy   → objava na produkcijo: vrstni red, override za Caddy,
                     verifikacija prek 401-namesto-404, APK + beta stran
/gasilapp-shema    → spremembe sheme: dvojno mesto (schema.sql + migracija),
                     idempotentnost, delni unikatni indeksi, e2e izolacija
```

## Kaj sodi kam

- **Skill** — ponovljiv postopek s pastmi (objava, migracija, integracija).
- **CLAUDE.md** — kar mora vedeti VSAKA seja že ob zagonu (ukazi za dev okolje,
  poti, znane pasti orodij).
- **`docs/DECISIONS.md`** — arhitekturne odločitve in njihovi razlogi (ADR).
- **Komentar v kodi** — kar velja samo za tisto vrstico.

## Izvor

Prva dva skilla sta nastala iz seje 2026-07-20 (zadolžitve opreme z zgodovino,
NFC oznake, zasebnost članov). Vzorec je prevzet iz projekta GreenHeart, kjer se
je izkazalo, da naslednja seja začne z recepti namesto z raziskovanjem.
