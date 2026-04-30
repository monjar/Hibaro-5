'use client';

import { useEffect, useState } from 'react';
import type {
  AdminWorldEvent,
  AdminWorldEventInput,
  WorldEventScope,
  WorldEventStatus,
} from '@heliora/platform-sdk';
import { adminApi } from '../../lib/api';
import {
  AdminShell,
  JsonField,
  SelectField,
  StatusMessage,
  TextField,
} from '../../components/AdminShell';

const SCOPES: WorldEventScope[] = [
  'CHARACTER',
  'BUILDING',
  'DISTRICT',
  'PLANET',
  'FACTION',
  'CORPORATION',
  'WORLD',
];

const STATUSES: WorldEventStatus[] = ['SCHEDULED', 'ACTIVE', 'RESOLVED', 'CANCELLED'];

const empty: AdminWorldEventInput = {
  title: '',
  description: '',
  scope: 'WORLD',
  triggeredByType: null,
  triggeredById: null,
  affectedEntities: [],
  requirements: [],
  effects: [],
  startsAt: null,
  endsAt: null,
  status: 'SCHEDULED',
};

function toLocalInput(value: string | null | undefined) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

export default function AdminWorldEventsPage() {
  const [list, setList] = useState<AdminWorldEvent[]>([]);
  const [editing, setEditing] = useState<AdminWorldEventInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const events = await adminApi.getWorldEvents();
      setList(events);
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

  function openEdit(e: AdminWorldEvent) {
    setEditing({
      title: e.title,
      description: e.description ?? '',
      scope: e.scope,
      triggeredByType: e.triggeredByType ?? null,
      triggeredById: e.triggeredById ?? null,
      affectedEntities: e.affectedEntities ?? [],
      requirements: e.requirements ?? [],
      effects: e.effects ?? [],
      startsAt: e.startsAt ?? null,
      endsAt: e.endsAt ?? null,
      status: e.status,
    });
    setEditingId(e.id);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      const payload = {
        ...editing,
        startsAt: editing.startsAt ? new Date(editing.startsAt).toISOString() : null,
        endsAt: editing.endsAt ? new Date(editing.endsAt).toISOString() : null,
      };
      if (editingId) await adminApi.updateWorldEvent(editingId, payload);
      else await adminApi.createWorldEvent(payload);
      flash(`+ Saved ${editing.title}`);
      setEditing(null);
      setEditingId(null);
      await load();
    } catch (err) {
      flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove(e: AdminWorldEvent) {
    if (!confirm(`Delete world event "${e.title}"?`)) return;
    setBusy(true);
    try {
      await adminApi.deleteWorldEvent(e.id);
      flash(`+ Deleted ${e.title}`);
      await load();
    } catch (err) {
      flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(false);
    }
  }

  function update<K extends keyof AdminWorldEventInput>(key: K, value: AdminWorldEventInput[K]) {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
  }

  return (
    <AdminShell
      title="World Events CRUD"
      blurb="Schedule news, riots, market shocks, blockades. Active events influence the next world tick."
    >
      <div className="mb-4 flex justify-end">
        <button
          onClick={openNew}
          className="rounded border border-heliora-cyan/60 bg-heliora-cyan/10 px-4 py-2 text-sm font-bold text-heliora-cyan hover:bg-heliora-cyan/20"
        >
          + NEW WORLD EVENT
        </button>
      </div>

      <StatusMessage message={message} />

      {editing && (
        <section className="mb-6 rounded border border-heliora-cyan/40 bg-heliora-panel p-5">
          <h2 className="mb-3 text-lg font-semibold text-heliora-cyan">
            {editingId ? 'Edit' : 'Create'} World Event
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Title" value={editing.title} onChange={(v) => update('title', v)} />
            <SelectField
              label="Scope"
              value={editing.scope}
              onChange={(v) => update('scope', v)}
              options={SCOPES}
            />
            <SelectField
              label="Status"
              value={editing.status ?? 'SCHEDULED'}
              onChange={(v) => update('status', v)}
              options={STATUSES}
            />
            <TextField
              label="Triggered by type (optional)"
              value={editing.triggeredByType ?? ''}
              onChange={(v) => update('triggeredByType', v === '' ? null : v)}
              placeholder="FACTION, CORPORATION, ..."
            />
            <TextField
              label="Triggered by id (optional)"
              value={editing.triggeredById ?? ''}
              onChange={(v) => update('triggeredById', v === '' ? null : v)}
            />
            <div>
              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                Starts at
              </label>
              <input
                type="datetime-local"
                value={toLocalInput(editing.startsAt)}
                onChange={(e) => update('startsAt', e.target.value === '' ? null : e.target.value)}
                className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                Ends at
              </label>
              <input
                type="datetime-local"
                value={toLocalInput(editing.endsAt)}
                onChange={(e) => update('endsAt', e.target.value === '' ? null : e.target.value)}
                className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
              />
            </div>
            <TextField
              span={2}
              textarea
              label="Description"
              value={editing.description ?? ''}
              onChange={(v) => update('description', v)}
            />
            <JsonField
              label="Affected entities (JSON array)"
              value={editing.affectedEntities ?? []}
              onChange={(v) => update('affectedEntities', (v as unknown[]) ?? [])}
              example='[{"type":"PLANET","id":"..."}]'
            />
            <JsonField
              label="Requirements (JSON array)"
              value={editing.requirements ?? []}
              onChange={(v) => update('requirements', (v as unknown[]) ?? [])}
              example="[]"
            />
            <JsonField
              label="Effects (JSON array)"
              value={editing.effects ?? []}
              onChange={(v) => update('effects', (v as unknown[]) ?? [])}
              example='[{"type":"DEMAND_INDEX","planetId":"...","value":1.2}]'
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
              <th className="py-2">Title</th>
              <th className="py-2">Scope</th>
              <th className="py-2">Status</th>
              <th className="py-2">Starts</th>
              <th className="py-2">Ends</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} className="border-t border-heliora-border/60 hover:bg-black/20">
                <td className="py-2 font-mono">{e.title}</td>
                <td className="py-2 text-heliora-yellow">{e.scope}</td>
                <td className="py-2 text-heliora-text-dim">{e.status}</td>
                <td className="py-2 text-xs">
                  {e.startsAt ? new Date(e.startsAt).toLocaleString() : '-'}
                </td>
                <td className="py-2 text-xs">
                  {e.endsAt ? new Date(e.endsAt).toLocaleString() : '-'}
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => openEdit(e)}
                    className="mr-2 rounded border border-heliora-cyan/40 px-2 py-1 text-xs text-heliora-cyan hover:bg-heliora-cyan/10"
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => void remove(e)}
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
                <td colSpan={6} className="py-6 text-center text-heliora-text-dim">
                  No world events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
