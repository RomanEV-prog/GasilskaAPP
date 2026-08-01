# design-sync — zapiski za Plamen UI

- Frontend NI knjižnica (ni `dist` vstopa, ni `main`/`module` v package.json) —
  pretvornik potrebuje `--entry frontend/src/components/ui/index.tsx`
  (zapisano tudi kot `entry` v config.json); brez tega išče
  `node_modules/gasilapp-frontend` in pade z ENOENT.
- Vse komponente so v ENI datoteki `frontend/src/components/ui/index.tsx` —
  `componentSrcMap` vse pripne nanjo. Nova komponenta v tej datoteki → dodaj
  vnos v `componentSrcMap`.
- CSS je prevedeni Tailwind podnabor: `cfg.buildCmd` ga zgradi v
  `frontend/dist/ds-tailwind.css`. Pomembno: buildCmd teče **iz `frontend/`**.
  V `--content` NE uporabljaj zavitih oklepajev `{ts,tsx}` — CLI deli po
  vejicah in vzorec razpade; vzorci so našteti posebej.
- `.design-sync/tailwind-safelist.txt` doda odzivne (`sm:`/`md:`/`lg:`)
  variante, ki jih app še ne uporablja — je v buildCmd `--content`. Če
  oblikovnemu agentu manjka kak razred, ga dodaj tja in požene se ob rebuildu.
- Playwright: repo pin 1.62.0 → chromium-1234 je v predpomnilniku
  (`%LOCALAPPDATA%\ms-playwright`). V `.ds-sync/` je nameščen
  `playwright@1.62.0` — ob svežem klonu ponovi
  `npm i esbuild ts-morph @types/react typescript playwright@1.62.0` v `.ds-sync/`.
- Validate izpiše »typescript not in node_modules« (preskok .d.ts parse
  preverbe) — nekritično; typescript je sicer v `frontend/node_modules`.
- Znana render opozorila: (trenutno nobenih — 8/8 čisto).

## Re-sync tveganja

- **Prevedeni CSS zastari tiho**: nov Tailwind razred v aplikaciji ali v
  predogledih obstaja šele po ponovnem `buildCmd` — driver sam NE požene
  buildCmd; pred re-sync ga poženi ročno iz `frontend/`.
- Barvna shema (#CC2200/#991900) živi v `frontend/tailwind.config.js` —
  sprememba tam zahteva rebuild CSS in ponovno validacijo conventions.md
  (glava našteva konkretne razrede in hex vrednosti).
- Predogledi vsebujejo slovensko vsebino z gasilskimi termini — pri
  spremembah komponent preveri, da propsi v predogledih še ustrezajo
  `<Name>.d.ts`.
- Mobilna app (Flutter) NI del sinhronizacije — samo web portal.
