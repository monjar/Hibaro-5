'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthGuard } from '@/lib/session-context';
import { useCharacter } from '@/lib/use-character';
import { Panel } from '@/components/Panel';
import { Tooltip } from '@/components/Tooltip';
import { formatUiError } from '@/lib/ui-presenters';
import type {
  Duel,
  LeaderboardRow,
  NearbyPlayer,
  PlayerBounty,
} from '@heliora/platform-sdk';

const WAGER_OPTIONS = [25, 50, 100, 250];
const BOUNTY_OPTIONS = [50, 100, 250, 500];

export default function PlayersPage() {
  const session = useAuthGuard();
  const { character, refresh } = useCharacter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [nearby, setNearby] = useState<NearbyPlayer[]>([]);
  const [bounties, setBounties] = useState<PlayerBounty[]>([]);
  const [duels, setDuels] = useState<Duel[]>([]);
  const [wager, setWager] = useState(50);
  const [bountyAmount, setBountyAmount] = useState(100);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const reload = useCallback(async () => {
    if (!session.characterId) return;
    try {
      const [board, near, open, history] = await Promise.all([
        api.getLeaderboard(),
        api.getNearbyPlayers(session.characterId),
        api.getOpenBounties(),
        api.getDuelHistory(session.characterId, 10),
      ]);
      setLeaderboard(board);
      setNearby(near);
      setBounties(open);
      setDuels(history);
    } catch {
      // soft fail; sections render empty states
    }
  }, [session.characterId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function flash(text: string, ms = 7000) {
    setMessage(text);
    setTimeout(() => setMessage(''), ms);
  }

  async function duel(target: NearbyPlayer) {
    if (!session.characterId) return;
    setBusy(`duel:${target.id}`);
    setMessage('');
    try {
      const outcome = await api.startDuel(session.characterId, target.id, wager);
      const r = outcome.result;
      flash(
        r.attackerWins
          ? `✅ You beat ${target.name} — ${r.attacker.total} vs ${r.defender.total}. +$${r.creditsTransferred}${r.attackerHeat ? ' · +1 wanted (high-law district)' : ''}`
          : `❌ ${target.name} won — ${r.defender.total} vs ${r.attacker.total}. -$${r.creditsTransferred}${r.attackerHeat ? ' · +1 wanted (high-law district)' : ''}`,
      );
      await Promise.all([reload(), refresh()]);
    } catch (e) {
      flash(`❌ ${formatUiError(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function postBounty(target: NearbyPlayer) {
    if (!session.characterId) return;
    setBusy(`bounty:${target.id}`);
    setMessage('');
    try {
      await api.postBounty(session.characterId, target.id, bountyAmount);
      flash(`✅ Bounty of $${bountyAmount} posted on ${target.name}`);
      await Promise.all([reload(), refresh()]);
    } catch (e) {
      flash(`❌ ${formatUiError(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function claim(bounty: PlayerBounty) {
    if (!session.characterId) return;
    setBusy(`claim:${bounty.id}`);
    setMessage('');
    try {
      const result = await api.claimBounty(bounty.id, session.characterId);
      flash(
        result.claimed
          ? `✅ Bounty claimed! ${result.targetName} taken down for $${result.amount} (${result.contest.attacker.total} vs ${result.contest.defender.total})`
          : `❌ ${result.targetName} slipped away (${result.contest.attacker.total} vs ${result.contest.defender.total}). You lost some health in the scuffle.`,
      );
      await Promise.all([reload(), refresh()]);
    } catch (e) {
      flash(`❌ ${formatUiError(e)}`);
    } finally {
      setBusy(null);
    }
  }

  async function cancel(bounty: PlayerBounty) {
    if (!session.characterId) return;
    setBusy(`cancel:${bounty.id}`);
    try {
      await api.cancelBounty(bounty.id, session.characterId);
      flash('✅ Bounty cancelled — escrow refunded');
      await Promise.all([reload(), refresh()]);
    } catch (e) {
      flash(`❌ ${formatUiError(e)}`);
    } finally {
      setBusy(null);
    }
  }

  if (!session.ready || !session.token) return null;

  const myLevel = character?.level ?? 1;
  const pvpLocked = myLevel < 3;

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-heliora-cyan font-mono text-2xl tracking-widest">OPERATORS</h1>

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

      {pvpLocked && (
        <div className="rounded border border-heliora-yellow/40 bg-heliora-yellow/10 p-3 text-xs font-mono text-heliora-yellow">
          🛡 Rookie protection: PVP unlocks at level 3. Until then nobody can touch you — and you
          can&apos;t touch them.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="District: who's here" accent="orange">
          {nearby.length === 0 ? (
            <p className="py-4 text-center text-sm text-heliora-text-dim">
              No other operators in your district right now. Bounty targets show their planet on
              the board below — go hunting.
            </p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-heliora-text-dim">Duel wager:</span>
                {WAGER_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setWager(option)}
                    className={`rounded border px-2 py-0.5 ${
                      wager === option
                        ? 'border-heliora-orange/70 bg-heliora-orange/20 text-heliora-orange'
                        : 'border-heliora-border text-heliora-text-dim hover:text-heliora-text'
                    }`}
                  >
                    ${option}
                  </button>
                ))}
                <span className="ml-3 text-heliora-text-dim">Bounty:</span>
                {BOUNTY_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setBountyAmount(option)}
                    className={`rounded border px-2 py-0.5 ${
                      bountyAmount === option
                        ? 'border-heliora-red/70 bg-heliora-red/20 text-heliora-red'
                        : 'border-heliora-border text-heliora-text-dim hover:text-heliora-text'
                    }`}
                  >
                    ${option}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {nearby.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded border border-heliora-border bg-heliora-dark p-2"
                  >
                    <div>
                      <span className="font-mono text-sm text-heliora-text">{player.name}</span>
                      <span className="ml-2 text-xs text-heliora-text-dim">
                        LVL {player.level}
                        {player.wantedLevel > 0 ? ` · ${'★'.repeat(player.wantedLevel)}` : ''}
                        {player.pvpProtected ? ' · 🛡 protected' : ''}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Tooltip content={`Duel for $${wager}: combat + agility contest. Costs 10 energy. Loser pays and takes the bigger hit. High-law districts add +1 wanted.`}>
                        <button
                          onClick={() => void duel(player)}
                          disabled={busy !== null || player.pvpProtected || pvpLocked}
                          className="rounded border border-heliora-orange/50 bg-heliora-orange/15 px-3 py-1 text-xs font-mono font-bold text-heliora-orange hover:bg-heliora-orange/30 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          {busy === `duel:${player.id}` ? '…' : `DUEL $${wager}`}
                        </button>
                      </Tooltip>
                      <Tooltip content={`Escrow $${bountyAmount} for anyone who takes this operator down.`}>
                        <button
                          onClick={() => void postBounty(player)}
                          disabled={busy !== null || player.pvpProtected || pvpLocked}
                          className="rounded border border-heliora-red/50 bg-heliora-red/15 px-3 py-1 text-xs font-mono font-bold text-heliora-red hover:bg-heliora-red/30 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          {busy === `bounty:${player.id}` ? '…' : 'BOUNTY'}
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>

        <Panel title={`Bounty Board (${bounties.length})`} accent="red">
          {bounties.length === 0 ? (
            <p className="py-4 text-center text-sm text-heliora-text-dim">
              No open bounties. Post one on a rival from the district list.
            </p>
          ) : (
            <div className="space-y-2">
              {bounties.map((bounty) => {
                const mine = bounty.postedById === session.characterId;
                const onMe = bounty.targetId === session.characterId;
                return (
                  <div
                    key={bounty.id}
                    className={`rounded border p-2 ${
                      onMe
                        ? 'border-heliora-red/60 bg-heliora-red/10'
                        : 'border-heliora-border bg-heliora-dark'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-sm font-bold text-heliora-red">
                          ${bounty.amount}
                        </span>
                        <span className="ml-2 font-mono text-sm text-heliora-text">
                          {bounty.target?.name ?? 'Unknown'}
                        </span>
                        <span className="ml-2 text-xs text-heliora-text-dim">
                          LVL {bounty.target?.level ?? '?'} ·{' '}
                          {bounty.target?.currentPlanet?.name ?? 'off-grid'}
                          {onMe ? ' · THIS IS YOU' : ''}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {mine ? (
                          <button
                            onClick={() => void cancel(bounty)}
                            disabled={busy !== null}
                            className="rounded border border-heliora-border px-3 py-1 text-xs font-mono text-heliora-text-dim hover:text-heliora-text disabled:opacity-40"
                          >
                            {busy === `cancel:${bounty.id}` ? '…' : 'CANCEL'}
                          </button>
                        ) : onMe ? null : (
                          <Tooltip content="You must be in the target's district. Combat + agility vs their stealth + agility. Costs 12 energy; failing hurts.">
                            <button
                              onClick={() => void claim(bounty)}
                              disabled={busy !== null || pvpLocked}
                              className="rounded border border-heliora-red/50 bg-heliora-red/15 px-3 py-1 text-xs font-mono font-bold text-heliora-red hover:bg-heliora-red/30 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              {busy === `claim:${bounty.id}` ? '…' : 'CLAIM'}
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                    {bounty.reason && (
                      <p className="mt-1 text-xs text-heliora-text-dim">“{bounty.reason}”</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Leaderboard" accent="cyan">
        {leaderboard.length === 0 ? (
          <p className="py-4 text-center text-sm text-heliora-text-dim">No operators ranked yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-heliora-border text-heliora-text-dim">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">OPERATOR</th>
                  <th className="py-2 pr-3">LVL</th>
                  <th className="py-2 pr-3">CREDITS</th>
                  <th className="py-2 pr-3">DUELS W/L</th>
                  <th className="py-2 pr-3">BOUNTIES</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row) => (
                  <tr
                    key={row.characterId}
                    className={`border-b border-heliora-border/40 ${
                      row.characterId === session.characterId
                        ? 'bg-heliora-cyan/10 text-heliora-cyan'
                        : 'text-heliora-text'
                    }`}
                  >
                    <td className="py-1.5 pr-3">{row.rank}</td>
                    <td className="py-1.5 pr-3">{row.name}</td>
                    <td className="py-1.5 pr-3">{row.level}</td>
                    <td className="py-1.5 pr-3 text-heliora-green">${row.credits}</td>
                    <td className="py-1.5 pr-3">
                      {row.duelsWon}/{row.duelsLost}
                    </td>
                    <td className="py-1.5 pr-3">{row.bountiesClaimed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {duels.length > 0 && (
        <Panel title="Your recent duels" accent="orange">
          <div className="space-y-1 text-xs font-mono">
            {duels.map((entry) => {
              const iAmAttacker = entry.attackerId === session.characterId;
              const iWon = entry.winnerId === session.characterId;
              const opponent = iAmAttacker ? entry.defender?.name : entry.attacker?.name;
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded border border-heliora-border/50 bg-heliora-dark px-2 py-1"
                >
                  <span className={iWon ? 'text-heliora-green' : 'text-heliora-red'}>
                    {iWon ? '✔ WON' : '✘ LOST'} vs {opponent ?? 'unknown'}
                  </span>
                  <span className="text-heliora-text-dim">
                    {iAmAttacker
                      ? `${entry.attackerTotal} vs ${entry.defenderTotal}`
                      : `${entry.defenderTotal} vs ${entry.attackerTotal}`}{' '}
                    · ${entry.creditsTransferred} · {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <p className="text-center text-[11px] text-heliora-text-dim">
        Duels: combat + agility contest, ties defend. 15m cooldown between duels, 1h per rival.
        Bounties escrow your credits until claimed or cancelled. Operators under level 3 are
        untouchable.
      </p>
    </main>
  );
}
