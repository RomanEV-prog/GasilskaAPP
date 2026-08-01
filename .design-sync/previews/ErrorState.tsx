import { Card, ErrorState } from 'gasilapp-frontend';

export function ZGumbom() {
  return (
    <ErrorState
      message="Podatkov ni bilo mogoče naložiti. Poskusite znova."
      onRetry={() => {}}
    />
  );
}

export function BrezGumba() {
  return <ErrorState message="Seznam članov trenutno ni na voljo." />;
}

export function VKartici() {
  return (
    <Card title="Obvestila">
      <ErrorState onRetry={() => {}} />
    </Card>
  );
}
