import { Card, EmptyState } from 'gasilapp-frontend';

export function Samostojen() {
  return <EmptyState message="Ni prihajajočih dogodkov." />;
}

export function VKartici() {
  return (
    <Card title="Vozila s potekajočimi roki (30 dni)">
      <EmptyState message="Vsi roki so urejeni." />
    </Card>
  );
}
