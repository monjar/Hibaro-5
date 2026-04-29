'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthGuard } from '@/lib/session-context';
import { Panel } from '@/components/Panel';
import type { ActivityLog } from '@heliora/platform-sdk';

const ACTIVITY_ICONS: Record<string, string> = {
  REGISTERED: '🚀',
  GIG_ACCEPTED: '📋',
  GIG_COMPLETED: '✅',
  GIG_FAILED: '❌',
  JOB_ACCEPTED: '💼',
  JOB_COMPLETED: '✅',
  QUEST_STARTED: '🗺️',
  QUEST_COMPLETED: '🏆',
  LOCATION_CHANGED: '📍',
  LOGIN: '🔑',
  LOGOUT: '🔒',
  ITEM_BOUGHT: '🛍️',
  ITEM_SOLD: '💰',
  WORLD_EVENT_TRIGGERED: '⚡',
  RELATIONSHIP_CHANGED: '🤝',
  BUILDING_ENTERED: '🏚️',
};

export default function ActivityPage() {
  const session = useAuthGuard();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!session.player?.id) return;
    void (async () => {
      const r = await api.getActivity(session.player!.id, page, 30);
      setLogs(r.logs);
      setTotal(r.total);
    })();
  }, [session.player?.id, page]);

  if (!session.ready || !session.token) return null;

  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-heliora-cyan font-mono text-2xl tracking-widest">ACTIVITY LOG</h1>

      <Panel title={`Events (${total})`} accent="yellow">
        <div className="space-y-2">
          {logs.length === 0 && (
            <p className="text-heliora-text-dim text-sm">No activity recorded yet.</p>
          )}
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 text-sm border-b border-heliora-border/30 pb-2 last:border-0"
            >
              <span className="text-base shrink-0">{ACTIVITY_ICONS[log.type] || '•'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-heliora-text">{log.message}</p>
                <p className="text-heliora-text-dim text-xs">
                  {new Date(log.createdAt).toLocaleString()} · {log.type}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm font-mono">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 border border-heliora-border rounded text-heliora-text-dim hover:text-heliora-cyan disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-heliora-text-dim">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 border border-heliora-border rounded text-heliora-text-dim hover:text-heliora-cyan disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </main>
  );
}
