import { Input } from 'gasilapp-frontend';

export function ZOznako() {
  return (
    <div className="max-w-sm">
      <Input label="Ime in priimek" defaultValue="Janez Novak" />
    </div>
  );
}

export function ZNapako() {
  return (
    <div className="max-w-sm">
      <Input
        label="E-pošta"
        type="email"
        defaultValue="janez.novak"
        error="Vnesite veljaven e-poštni naslov."
      />
    </div>
  );
}

export function Prazen() {
  return (
    <div className="max-w-sm">
      <Input label="Telefon" type="tel" placeholder="041 123 456" />
    </div>
  );
}

export function Obrazec() {
  return (
    <div className="max-w-sm space-y-4">
      <Input label="Uporabniško ime" defaultValue="janez.novak" />
      <Input label="Geslo" type="password" defaultValue="geslo123" />
    </div>
  );
}
