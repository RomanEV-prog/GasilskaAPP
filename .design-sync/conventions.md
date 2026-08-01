# Plamen UI — konvencije

Plamen je slovenska SaaS platforma za prostovoljna gasilska društva (člani,
dogodki, vozila, oprema, usposabljanja, obvestila). **Vsa besedila v vmesniku so
v slovenščini** — gumbi (»Shrani«, »Prekliči«, »Dodaj člana«), oznake obrazcev,
sporočila (»Podatkov ni bilo mogoče naložiti.«).

## Postavitev in ovijanje

Ni providerja — komponente delujejo brez ovijanja. Strani sestavljaj na svetlem
ozadju: telo `bg-gray-50` (aplikacija uporablja #F8F8F8), vsebina v `Card`
komponentah, razmiki s `space-y-4`/`space-y-6` in `grid gap-4 md:grid-cols-2`.

## Stilni idiom: Tailwind razredi — SAMO prevedeni nabor

`styles.css` je **prevedeni podnabor** Tailwinda — obstajajo samo razredi, ki
jih aplikacija že uporablja. Razred zunaj tega nabora se tiho ne izriše. Drži se
tega besedišča:

- **Blagovna barva**: `bg-primary` (#CC2200, gasilska rdeča), `text-primary`,
  `border-primary`, `hover:bg-primary-dark` (#991900), `bg-primary/10`,
  `focus:border-primary focus:ring-1 focus:ring-primary`. NE uporabljaj
  `bg-red-600` za blagovno rdečo — ta je za nevarnost/napake.
- **Statusne barve** (ozadje-100 + besedilo-800): `bg-green-100 text-green-800`
  (aktivno/uspeh), `bg-yellow-100 text-yellow-800` (opozorilo/poteka),
  `bg-red-100 text-red-800` (napaka/poteklo), `bg-blue-100 text-blue-800`
  (informativno), `bg-gray-100 text-gray-700` (nevtralno). Blažja opozorila:
  `bg-amber-50 border-amber-200 text-amber-800`.
- **Besedilo**: naslovi `font-semibold text-gray-800`, telo `text-sm
  text-gray-700`, sekundarno `text-gray-500`, prigušeno `text-gray-400`;
  velikosti `text-xs`…`text-4xl`.
- **Površine**: kartice `rounded-xl bg-white p-5 shadow-sm` (to je `Card`),
  polja `rounded-lg border border-gray-300`, značke `rounded-full`.
- **Postavitev**: `flex items-center justify-between`, `grid grid-cols-2
  gap-4`, odzivno `sm:`/`md:`/`lg:` za `grid-cols-1..4`, `flex-row`/`flex-col`,
  `hidden`/`block`; seznami `divide-y divide-gray-100`; širine
  `max-w-sm`…`max-w-6xl`, `w-full`.

## Kje je resnica

Pred stiliranjem preberi `styles.css` (uvozi `_ds_bundle.css` — celoten seznam
prevedenih razredov in obe barvi `--tw`-žetonov) in `components/<skupina>/
<Ime>/<Ime>.prompt.md` za API posamezne komponente. Komponente: Button, Input,
Select, Card, Badge, Spinner, EmptyState, ErrorState (vse na
`window.PlamenUI`).

## Idiomatski primer

```jsx
<div className="mx-auto max-w-2xl space-y-4">
  <Card
    title="Prihajajoči dogodki"
    actions={<Button variant="ghost">Prikaži vse</Button>}
  >
    <ul className="divide-y text-sm text-gray-700">
      <li className="flex items-center justify-between py-2">
        <span>Operativna vaja — motorna brizgalna</span>
        <Badge color="blue">Vaja</Badge>
      </li>
    </ul>
  </Card>
  <div className="flex justify-end gap-2">
    <Button variant="secondary">Prekliči</Button>
    <Button variant="primary">Shrani</Button>
  </div>
</div>
```

Stanja podatkov: nalaganje `<Spinner />`, prazno `<EmptyState message="Ni
prihajajočih dogodkov." />`, napaka `<ErrorState onRetry={...} />`.
