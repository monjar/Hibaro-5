'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AdminPlayer } from '@heliora/platform-sdk';
import { AdminShell, StatusMessage, TextField } from '../../components/AdminShell';
import { adminApi, getStoredAdminPlayer } from '../../lib/api';

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const currentAdmin = getStoredAdminPlayer();

  async function load() {
    try {
      const result = await adminApi.listPlayers();
      setPlayers(result);
    } catch (err) {
      setMessage(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleAdmin(player: AdminPlayer) {
    setBusyId(player.id);
    setMessage('');
    try {
      const updated = await adminApi.updatePlayerAdminStatus(player.id, !player.isAdmin);
      setPlayers((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setMessage(`+ ${updated.username} is now ${updated.isAdmin ? 'an admin' : 'a player'}`);
    } catch (err) {
      setMessage(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusyId(null);
      setTimeout(() => setMessage(''), 4000);
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return players;
    return players.filter((player) =>
      [player.username, player.email ?? '', player.character?.name ?? '', player.id]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [players, search]);

  return (
    <AdminShell
      title="Player Access"
      blurb="Review registered operators and manage which accounts have admin access in the database."
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 md:grid-cols-2 lg:w-2/3">
          <TextField
            label="Search players"
            value={search}
            onChange={setSearch}
            placeholder="Search username, email, character, or ID..."
          />
          <div className="rounded border border-heliora-border bg-heliora-panel px-3 py-2 text-xs text-heliora-text-dim">
            <div className="uppercase tracking-wider">Players loaded</div>
            <div className="mt-1 font-mono text-lg text-heliora-cyan">{filtered.length}</div>
          </div>
        </div>
      </div>

      <StatusMessage message={message} />

      <section className="rounded border border-heliora-border bg-heliora-panel p-4">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-heliora-text-dim">
            <tr>
              <th className="py-2">Username</th>
              <th className="py-2">Email</th>
              <th className="py-2">Character</th>
              <th className="py-2">Last Login</th>
              <th className="py-2">Role</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((player) => {
              const isSelf = currentAdmin?.id === player.id;
              return (
                <tr key={player.id} className="border-t border-heliora-border/60 hover:bg-black/20">
                  <td className="py-3 font-mono text-heliora-text">{player.username}</td>
                  <td className="py-3 text-heliora-text-dim">{player.email ?? '—'}</td>
                  <td className="py-3 text-heliora-text-dim">{player.character?.name ?? '—'}</td>
                  <td className="py-3 text-heliora-text-dim">
                    {new Date(player.lastLoginAt).toLocaleString()}
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded border px-2 py-1 text-xs font-mono ${
                        player.isAdmin
                          ? 'border-heliora-cyan/50 bg-heliora-cyan/10 text-heliora-cyan'
                          : 'border-heliora-border text-heliora-text-dim'
                      }`}
                    >
                      {player.isAdmin ? 'ADMIN' : 'PLAYER'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => void toggleAdmin(player)}
                      disabled={busyId === player.id || isSelf}
                      className={`rounded border px-3 py-1 text-xs font-bold ${
                        player.isAdmin
                          ? 'border-heliora-red/40 text-heliora-red hover:bg-heliora-red/10'
                          : 'border-heliora-green/40 text-heliora-green hover:bg-heliora-green/10'
                      } disabled:opacity-30`}
                      title={isSelf ? 'Self-demotion is blocked from this screen' : undefined}
                    >
                      {busyId === player.id
                        ? 'SAVING...'
                        : player.isAdmin
                          ? 'REMOVE ADMIN'
                          : 'MAKE ADMIN'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-heliora-text-dim">
                  No matching players found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}