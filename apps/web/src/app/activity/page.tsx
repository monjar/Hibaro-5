'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthGuard } from '@/lib/session-context';
import { Panel } from '@/components/Panel';
import { formatUiError } from '@/lib/ui-presenters';
import type { AchievementView, ActivityLog } from '@heliora/platform-sdk';

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
  LEVEL_UP: '⬆️',
  STAT_TRAINED: '🏋️',
  DECISION_MADE: '🎲',
  COMBAT_EVENT: '⚔️',
  DAILY_CLAIMED: '📦',
  ACHIEVEMENT_EARNED: '🏆',
};

export default function ActivityPage() {
  const session = useAuthGuard();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [achievements, setAchievements] = useState<AchievementView[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const reloadAchievements = useCallback(async () => {
    if (!session.player?.id) return;
    try {
      setAchievements(await api.getAchievements(session.player.id));
    } catch {
      // soft fail
    }
  }, [session.player?.id]);

  useEffect(() => {
    if (!session.player?.id) return;
    void (async () => {
      const r = await api.getActivity(session.player!.id, page, 30);
      setLogs(r.logs);
      setTotal(r.total);
    })();
  }, [session.player?.id, page]);

  useEffect(() => {
    void reloadAchievements();
  }, [reloadAchievements]);

  async function claim(achievement: AchievementView) {
    if (!session.player?.id) return;
    setClaiming(achievement.id);
    setMessage('');
    try {
      const result = await api.claimAchievement(session.player.id, achievement.id);
      const levelNote = result.levelUp ? ` · ⬆ LEVEL UP! Now level ${result.levelUp.level}` : '';
      setMessage(
        `✅ "${achievement.title}" claimed — +$${result.reward.credits}, +${result.reward.xp} XP${levelNote}`,
      );
      await reloadAchievements();
    } catch (e) {
      setMessage(`❌ ${formatUiError(e)}`);
    } finally {
      setClaiming(null);
      setTimeout(() => setMessage(''), 7000);
    }
  }

  if (!session.ready || !session.token) return null;

  const totalPages = Math.max(1, Math.ceil(total / 30));
  const unlockedUnclaimed = achievements.filter((a) => a.unlocked && !a.claimed).length;

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-heliora-cyan font-mono text-2xl tracking-widest">ACTIVITY LOG</h1>

      {message && (
        <div
          className={`border rounded p-3 text-sm font-mono ${
            message.startsWith('✅')
              ? 'border-heliora-green/40 bg-heliora-green/10 text-heliora-green'
              : 'border-heliora-red/40 bg-heliora-red/10 text-heliora-red'
          }`}
        >
          {message}
        </div>
      )}

      <Panel
        title={`Achievements (${achievements.filter((a) => a.claimed).length}/${achievements.length})${unlockedUnclaimed > 0 ? ` — ${unlockedUnclaimed} ready to claim!` : ''}`}
        accent="yellow"
      >
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`rounded border p-2 ${
                achievement.claimed
                  ? 'border-heliora-green/40 bg-heliora-green/5'
                  : achievement.unlocked
                    ? 'border-heliora-yellow/60 bg-heliora-yellow/10'
                    : 'border-heliora-border bg-heliora-dark opacity-80'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-mono text-sm text-heliora-text">
                    {achievement.icon} {achievement.title}
                    {achievement.claimed ? ' ✓' : ''}
                  </div>
                  <p className="truncate text-xs text-heliora-text-dim">
                    {achievement.description}
                  </p>
                </div>
                {achievement.unlocked && !achievement.claimed ? (
                  <button
                    onClick={() => void claim(achievement)}
                    disabled={claiming !== null}
                    className="shrink-0 rounded border border-heliora-yellow/60 bg-heliora-yellow/20 px-3 py-1 text-xs font-mono font-bold text-heliora-yellow hover:bg-heliora-yellow/30 disabled:opacity-50"
                  >
                    {claiming === achievement.id ? '…' : 'CLAIM'}
                  </button>
                ) : (
                  <span className="shrink-0 text-[11px] font-mono text-heliora-text-dim">
                    {achievement.claimed
                      ? `+$${achievement.rewardCredits}`
                      : `${achievement.progress}/${achievement.target}`}
                  </span>
                )}
              </div>
              {!achievement.claimed && (
                <div className="mt-1.5 h-1 overflow-hidden rounded bg-heliora-border/40">
                  <div
                    className={`h-full ${achievement.unlocked ? 'bg-heliora-yellow' : 'bg-heliora-cyan/60'}`}
                    style={{
                      width: `${Math.min(100, (achievement.progress / Math.max(1, achievement.target)) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>

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
