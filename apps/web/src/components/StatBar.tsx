interface StatBarProps {
  label: string;
  value: number;
  max: number;
  /** legacy tailwind class like "bg-heliora-red"; mapped to design tone */
  color?: string;
}

const COLOR_TO_TONE: Record<string, 'cyan' | 'red' | 'green' | 'yellow'> = {
  'bg-heliora-red': 'red',
  'bg-heliora-green': 'green',
  'bg-heliora-yellow': 'yellow',
  'bg-heliora-cyan': 'cyan',
};

export function StatBar({ label, value, max, color = 'bg-heliora-cyan' }: StatBarProps) {
  const tone = COLOR_TO_TONE[color] ?? 'cyan';
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="hib-bar" style={{ marginBottom: 8 }}>
      <div className="hib-bar__head">
        <span>{label}</span>
        <span className="hib-bar__val">
          {value}/{max}
        </span>
      </div>
      <div className="hib-bar__track">
        <div className={`hib-bar__fill hib-bar__fill--${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface StatPillProps {
  label: string;
  value: number;
}

export function StatPill({ label, value }: StatPillProps) {
  const tier = value >= 15 ? 'high' : value >= 10 ? 'mid' : 'low';
  return (
    <div className="hib-stat">
      <span className={`hib-stat__val hib-stat__val--${tier}`}>
        {String(value).padStart(2, '0')}
      </span>
      <span className="hib-stat__label">{label}</span>
    </div>
  );
}
