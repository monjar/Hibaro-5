export function KindBadge({ kind }: { kind: string }) {
  const styles: Record<string, string> = {
    GIG: 'bg-heliora-orange/20 text-heliora-orange border-heliora-orange/40',
    JOB: 'bg-heliora-cyan/20 text-heliora-cyan border-heliora-cyan/40',
    QUEST: 'bg-heliora-yellow/20 text-heliora-yellow border-heliora-yellow/40',
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded border font-mono font-bold ${styles[kind] || 'bg-heliora-border text-heliora-text'}`}
    >
      {kind}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    IN_PROGRESS: 'bg-heliora-cyan/20 text-heliora-cyan border-heliora-cyan/40',
    COMPLETED: 'bg-heliora-green/20 text-heliora-green border-heliora-green/40',
    FAILED: 'bg-heliora-red/20 text-heliora-red border-heliora-red/40',
    ACCEPTED: 'bg-heliora-teal/20 text-heliora-teal border-heliora-teal/40',
    ACTIVE: 'bg-heliora-green/20 text-heliora-green border-heliora-green/40',
    SCHEDULED: 'bg-heliora-yellow/20 text-heliora-yellow border-heliora-yellow/40',
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded border font-mono ${styles[status] || 'bg-heliora-border text-heliora-text'}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
