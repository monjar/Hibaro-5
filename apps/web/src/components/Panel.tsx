interface PanelProps {
  title: string
  children: React.ReactNode
  className?: string
  accent?: 'cyan' | 'orange' | 'green' | 'yellow' | 'red'
  glow?: boolean
}

export function Panel({ title, children, className = '', accent = 'cyan', glow = false }: PanelProps) {
  const accentMap = {
    cyan: { text: 'text-heliora-cyan', border: 'border-heliora-cyan/30', bg: '#00d4ff' },
    orange: { text: 'text-heliora-orange', border: 'border-heliora-orange/30', bg: '#ff6b35' },
    green: { text: 'text-heliora-green', border: 'border-heliora-green/30', bg: '#00ff88' },
    yellow: { text: 'text-heliora-yellow', border: 'border-heliora-yellow/30', bg: '#ffd700' },
    red: { text: 'text-heliora-red', border: 'border-heliora-red/30', bg: '#ff3b3b' },
  }

  const { text, bg } = accentMap[accent]

  return (
    <div className={`bg-heliora-panel border border-heliora-border rounded-lg overflow-hidden ${glow ? 'panel-glow' : ''} ${className}`}>
      <div className="px-4 py-2 border-b border-heliora-border flex items-center gap-2">
        <span className={`text-xs font-bold uppercase tracking-widest ${text}`}>
          {title}
        </span>
        <div className="flex-1 h-px opacity-30" style={{ background: bg }} />
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}
