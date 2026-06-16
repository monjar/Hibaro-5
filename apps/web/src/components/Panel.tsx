interface PanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  accent?: 'cyan' | 'orange' | 'green' | 'yellow' | 'red';
  glow?: boolean;
}

function PanelDots({ accent }: { accent: PanelProps['accent'] }) {
  const live = accent === 'red' ? 'danger' : accent === 'yellow' ? 'warn' : 'live';
  return (
    <span className="hib-panel__dots" aria-hidden="true">
      <span className={`hib-panel__dot ${live === 'live' ? 'hib-panel__dot--live' : ''}`} />
      <span className={`hib-panel__dot ${live === 'warn' ? 'hib-panel__dot--warn' : ''}`} />
      <span className={`hib-panel__dot ${live === 'danger' ? 'hib-panel__dot--danger' : ''}`} />
    </span>
  );
}

export function Panel({
  title,
  children,
  className = '',
  accent = 'cyan',
  glow = false,
}: PanelProps) {
  return (
    <section
      className={`hib-panel hib-panel--accent-${accent} ${glow ? 'panel-glow' : ''} ${className}`}
    >
      <header className="hib-panel__head">
        <PanelDots accent={accent} />
        <span className="hib-panel__title">{title}</span>
        <span className="hib-panel__rule" />
      </header>
      <div className="hib-panel__body">{children}</div>
    </section>
  );
}
