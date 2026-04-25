interface StatBarProps {
  label: string;
  value: number;
  max: number;
  color?: string;
}

export function StatBar({ label, value, max, color = 'bg-heliora-cyan' }: StatBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-heliora-text-dim uppercase tracking-wider">{label}</span>
        <span className="text-heliora-cyan font-mono">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 bg-heliora-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface StatPillProps {
  label: string;
  value: number;
}

export function StatPill({ label, value }: StatPillProps) {
  const color =
    value >= 15
      ? 'text-heliora-green'
      : value >= 10
        ? 'text-heliora-cyan'
        : value >= 5
          ? 'text-heliora-text'
          : 'text-heliora-text-dim';

  return (
    <div className="flex flex-col items-center bg-heliora-dark rounded p-2 border border-heliora-border">
      <span className={`text-lg font-bold font-mono ${color}`}>{value}</span>
      <span className="text-xs text-heliora-text-dim uppercase tracking-wider">{label}</span>
    </div>
  );
}
