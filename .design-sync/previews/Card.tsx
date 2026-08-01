import { Badge, Button, Card } from 'gasilapp-frontend';

export function ZNaslovom() {
  return (
    <Card title="Osnovni podatki">
      <dl className="space-y-2 text-sm text-gray-700">
        <div className="flex justify-between">
          <dt className="text-gray-500">Ime</dt>
          <dd>Janez Novak</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Funkcija</dt>
          <dd>Poveljnik</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Status</dt>
          <dd>
            <Badge color="green">Aktiven</Badge>
          </dd>
        </div>
      </dl>
    </Card>
  );
}

export function ZAkcijami() {
  return (
    <Card
      title="Prihajajoči dogodki"
      actions={<Button variant="ghost">Prikaži vse</Button>}
    >
      <ul className="divide-y text-sm text-gray-700">
        <li className="flex items-center justify-between py-2">
          <span>Operativna vaja — motorna brizgalna</span>
          <Badge color="blue">Vaja</Badge>
        </li>
        <li className="flex items-center justify-between py-2">
          <span>Občni zbor 2026</span>
          <Badge color="gray">Zbor</Badge>
        </li>
      </ul>
    </Card>
  );
}

export function BrezNaslova() {
  return (
    <Card>
      <p className="text-sm text-gray-700">
        Preprosta kartica brez naslova — samo vsebina z zaobljenimi robovi in
        senco.
      </p>
    </Card>
  );
}
