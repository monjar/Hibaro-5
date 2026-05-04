const KIND_TONE: Record<string, 'orange' | 'cyan' | 'yellow' | 'green' | 'red'> = {
  GIG: 'orange',
  JOB: 'cyan',
  QUEST: 'yellow',
};

const STATUS_TONE: Record<string, 'orange' | 'cyan' | 'yellow' | 'green' | 'red'> = {
  IN_PROGRESS: 'cyan',
  COMPLETED: 'green',
  FAILED: 'red',
  ACCEPTED: 'cyan',
  ACTIVE: 'green',
  SCHEDULED: 'yellow',
};

export function KindBadge({ kind }: { kind: string }) {
  const tone = KIND_TONE[kind] ?? 'cyan';
  return <span className={`hib-badge hib-badge--${tone}`}>{kind}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'cyan';
  return <span className={`hib-badge hib-badge--${tone}`}>{status.replace(/_/g, ' ')}</span>;
}
