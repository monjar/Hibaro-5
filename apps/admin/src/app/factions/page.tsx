'use client';

import { useEffect, useState } from 'react';
import type { AdminBuilding, AdminFaction, AdminFactionInput } from '@heliora/platform-sdk';
import { adminApi } from '../../lib/api';
import { AdminShell, StatusMessage, TextField } from '../../components/AdminShell';

const empty: AdminFactionInput = {
  name: '',
  description: '',
  ideology: '',
  headquartersBuildingId: null,
  treasury: 0,
  influence: 0,
};

export default function AdminFactionsPage() {
  const [list, setList] = useState<AdminFaction[]>([]);
  const [buildings, setBuildings] = useState<AdminBuilding[]>([]);
  const [editing, setEditing] = useState<AdminFactionInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const [factions, blds] = await Promise.all([adminApi.getFactions(), adminApi.getBuildings()]);
      setList(factions);
      setBuildings(blds);
    } catch (err) {
      flash(`- ${(err as Error).message}`);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function flash(m: string) {
    setMessage(m);
    setTimeout(() => setMessage(''), 4000);
  }

  function openNew() {
    setEditing({ ...empty });
    setEditingId(null);
  }

  function openEdit(f: AdminFaction) {
    setEditing({
      name: f.name,
      description: f.description ?? '',
      ideology: f.ideology ?? '',
      headquartersBuildingId: f.headquartersBuildingId ?? null,
      treasury: f.treasury,
      influence: f.influence,
    });
    setEditingId(f.id);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      if (editingId) await adminApi.updateFaction(editingId, editing);
      else await adminApi.createFaction(editing);
      flash(`+ Saved ${editing.name}`);
      setEditing(null);
      setEditingId(null);
      await load();
    } catch (err) {
      flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove(f: AdminFaction) {
    if (!confirm(`Delete faction "${f.name}"?`)) return;
    setBusy(true);
    try {
      await adminApi.deleteFaction(f.id);
      flash(`+ Deleted ${f.name}`);
      await load();
    } catch (err) {
      flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(false);
    }
  }

  function update<K extends keyof AdminFactionInput>(key: K, value: AdminFactionInput[K]) {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
  }

  return (
    <AdminShell
      title="Factions CRUD"
      blurb="Underground networks, civic authorities, unions. Factions claim districts and run gigs."
    >
      <div className="mb-4 flex justify-end">
        <button
          onClick={openNew}
          className="rounded border border-heliora-cyan/60 bg-heliora-cyan/10 px-4 py-2 text-sm font-bold text-heliora-cyan hover:bg-heliora-cyan/20"
        >
          + NEW FACTION
        </button>
      </div>

      <StatusMessage message={message} />

      {editing && (
        <section className="mb-6 rounded border border-heliora-cyan/40 bg-heliora-panel p-5">
          <h2 className="mb-3 text-lg font-semibold text-heliora-cyan">
            {editingId ? 'Edit' : 'Create'} Faction
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Name" value={editing.name} onChange={(v) => update('name', v)} />
            <TextField
              label="Ideology"
              value={editing.ideology ?? ''}
              onChange={(v) => update('ideology', v)}
            />
            <TextField
              label="Treasury (credits)"
              type="number"
              min={0}
              value={editing.treasury ?? 0}
              onChange={(v) => update('treasury', Number(v))}
            />
            <TextField
              label="Influence"
              type="number"
              value={editing.influence ?? 0}
              onChange={(v) => update('influence', Number(v))}
            />
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                Headquarters building (optional)
              </label>
              <select
                value={editing.headquartersBuildingId ?? ''}
                onChange={(e) =>
                  update('headquartersBuildingId', e.target.value === '' ? null : e.target.value)
                }
                className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
              >
                <option value="">— none —</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <TextField
              span={2}
              textarea
              label="Description"
              value={editing.description ?? ''}
              onChange={(v) => update('description', v)}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                setEditing(null);
                setEditingId(null);
              }}
              className="rounded border border-heliora-border px-4 py-2 text-sm text-heliora-text-dim hover:text-heliora-cyan"
            >
              CANCEL
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="rounded border border-heliora-green/60 bg-heliora-green/10 px-4 py-2 text-sm font-bold text-heliora-green hover:bg-heliora-green/20 disabled:opacity-30"
            >
              {busy ? 'SAVING...' : editingId ? 'UPDATE' : 'CREATE'}
            </button>
          </div>
        </section>
      )}

      <section className="rounded border border-heliora-border bg-heliora-panel p-4">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-heliora-text-dim">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Ideology</th>
              <th className="py-2">Treasury</th>
              <th className="py-2">Influence</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((f) => (
              <tr key={f.id} className="border-t border-heliora-border/60 hover:bg-black/20">
                <td className="py-2 font-mono">{f.name}</td>
                <td className="py-2 text-heliora-text-dim">{f.ideology ?? '-'}</td>
                <td className="py-2">{Math.round(f.treasury)}</td>
                <td className="py-2 text-heliora-yellow">{f.influence}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => openEdit(f)}
                    className="mr-2 rounded border border-heliora-cyan/40 px-2 py-1 text-xs text-heliora-cyan hover:bg-heliora-cyan/10"
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => void remove(f)}
                    disabled={busy}
                    className="rounded border border-heliora-red/40 px-2 py-1 text-xs text-heliora-red hover:bg-heliora-red/10 disabled:opacity-30"
                  >
                    DELETE
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-heliora-text-dim">
                  No factions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
