'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'

export function SimulationButton() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function runTick() {
    setRunning(true)
    setResult(null)
    try {
      const data = await apiFetch<{ opportunitiesResolved: number }>('/simulation/tick', { method: 'POST' })
      setResult(`✅ Tick: ${data.opportunitiesResolved} resolved`)
      setTimeout(() => setResult(null), 4000)
    } catch {
      setResult('❌ Tick failed')
      setTimeout(() => setResult(null), 3000)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className={`text-xs font-mono ${result.startsWith('✅') ? 'text-heliora-green' : 'text-heliora-red'}`}>
          {result}
        </span>
      )}
      <button
        onClick={runTick}
        disabled={running}
        className="px-3 py-1.5 bg-heliora-teal/20 border border-heliora-teal/50 rounded text-heliora-teal text-xs font-mono font-bold hover:bg-heliora-teal/30 transition-colors disabled:opacity-50 uppercase tracking-wider"
      >
        {running ? '◌ TICKING...' : '▶ SIM TICK'}
      </button>
    </div>
  )
}
