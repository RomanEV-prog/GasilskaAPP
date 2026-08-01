import { Button } from 'gasilapp-frontend';

export function Variante() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">Shrani</Button>
      <Button variant="secondary">Prekliči</Button>
      <Button variant="danger">Izbriši</Button>
      <Button variant="ghost">Uredi</Button>
    </div>
  );
}

export function Onemogoceni() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary" disabled>
        Shrani
      </Button>
      <Button variant="secondary" disabled>
        Prekliči
      </Button>
      <Button variant="danger" disabled>
        Izbriši
      </Button>
    </div>
  );
}

export function VObrazcu() {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" type="button">
        Nazaj
      </Button>
      <Button variant="primary" type="submit">
        Dodaj člana
      </Button>
    </div>
  );
}
