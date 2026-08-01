import { Badge } from 'gasilapp-frontend';

export function Barve() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge color="green">Aktiven</Badge>
      <Badge color="yellow">Poteče 15. 9. 2026</Badge>
      <Badge color="red">3 neprebranih</Badge>
      <Badge color="gray">trajno</Badge>
      <Badge color="blue">Operativna vaja</Badge>
    </div>
  );
}

export function VKontekstu() {
  return (
    <ul className="max-w-md divide-y text-sm text-gray-700">
      <li className="flex items-center justify-between py-2">
        <span>Tečaj za gasilca pripravnika</span>
        <Badge color="gray">trajno</Badge>
      </li>
      <li className="flex items-center justify-between py-2">
        <span>Zdravniški pregled</span>
        <Badge color="yellow">poteče 12. 10. 2026</Badge>
      </li>
      <li className="flex items-center justify-between py-2">
        <span>Izpit za voznika C</span>
        <Badge color="red">potekel</Badge>
      </li>
    </ul>
  );
}
