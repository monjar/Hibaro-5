'use client';

import { useEffect, useState } from 'react';
import { createApiClient, type OpportunityDefinition, type AdminOpportunityInput } from '@heliora/platform-sdk';

const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

const OPPORTUNITY_TYPES = [
  'DELIVERY',
  'BOUNTY',
  'ESCORT',
  'HACKING',
  'SMUGGLING',
  'ASSASSINATION',
  'INVESTIGATION',
  'MINING',
  'TRADING',
  'DIPLOMACY',
  'SECURITY',
  'REPAIR',
  'STORY',
  'WORLD',
];

const KINDS = ['GIG', 'JOB', 'QUEST'] as const;

const empty: AdminOpportunityInput = {
  title: '',
  description: '',
  kind: 'GIG',
  type: 'DELIVERY',
  difficulty: 1,
  durationMinutes: 60,
  requirements: [],
  rewards: [{ type: 'CREDITS', value: 100 }],
  risks: [],
};

export default function AdminOpportunitiesPage() {
  const [list, setList] = useState<OpportunityDefinition[]>([]);
  const [editing, setEditing] = useState<AdminOpportunityInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const result = await api.getOpportunities();
      setList(result);
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openNew() {
    setEditingId(null);
    setEditing({ ...empty });
  }

  function openEdit(opp: OpportunityDefinition) {
    setEditingId(opp.id);
    setEditing({
      title: opp.title,
      description: opp.description ?? '',
      kind: opp.kind,
      type: opp.type,
      difficulty: opp.difficulty,
      durationMinutes: opp.durationMinutes ?? 60,
      requirements: opp.requirements,
      rewards: opp.rewards,
      risks: opp.risks,
      repeatability: opp.repeatability,
    });
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setMessage('');
    try {
      if (editingId) {
        await api.updateOpportunity(editingId, editing);
        setMessage(`✓ Updated ${editing.title}`);
      } else {
        await api.createOpportunity(editing);
        setMessage(`✓ Created ${editing.title}`);
      }
      setEditing(null);
      setEditingId(null);
      await load();
    } catch (err) {
      setMessage(`✗ ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(false);
      setTimeout(() => setMessage(''), 4000);
    }
  }

  async function remove(opp: OpportunityDefinition) {
    if (!confirm(`Delete "${opp.title}"? This cannot be undone.`)) return;
    setBusy(true);
    setMessage('');
    try {
      await api.deleteOpportunity(opp.id);
      setMessage(`✓ Deleted ${opp.title}`);
      await load();
    } catch (err) {
      setMessage(`✗ ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(false);
      setTimeout(() => setMessage(''), 4000);
    }
  }

  function updateField<K extends keyof AdminOpportunityInput>(
    key: K,
    value: AdminOpportunityInput[K],
  ) {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
  }

  return (
    <main className="min-h-screen bg-heliora-dark text-heliora-text">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-heliora-cyan">Heliora Admin</p>
            <h1 className="mt-2 text-3xl font-bold">Opportunities CRUD</h1>
            <p className="mt-2 text-sm text-heliora-text-dim">
              Create and manage gigs, jobs, and quests. Deletes cascade to instances and
              employments — be careful.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/"
              className="rounded border border-heliora-border px-4 py-2 text-sm hover:border-heliora-cyan"
            >
              ← OVERVIEW
            </a>
            <button
              onClick={openNew}
              className="rounded border border-heliora-cyan/60 bg-heliora-cyan/10 px-4 py-2 text-sm font-bold text-heliora-cyan hover:bg-heliora-cyan/20"
            >
              + NEW OPPORTUNITY
            </button>
          </div>
        </header>

        {message && (
          <div
            className={`mb-4 rounded border p-3 text-sm font-mono ${
              message.startsWith('✓')
                ? 'border-heliora-green/40 bg-heliora-green/10 text-heliora-green'
                : 'border-heliora-red/40 bg-heliora-red/10 text-heliora-red'
            }`}
          >
            {message}
          </div>
        )}

        {editing && (
          <section className="mb-6 rounded border border-heliora-cyan/40 bg-heliora-panel p-5">
            <h2 className="mb-3 text-lg font-semibold text-heliora-cyan">
              {editingId ? 'Edit' : 'Create'} Opportunity
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                  Title
                </label>
                <input
                  className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                  value={editing.title}
                  onChange={(e) => updateField('title', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                  Kind
                </label>
                <select
                  className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                  value={editing.kind}
                  onChange={(e) =>
                    updateField('kind', e.target.value as 'GIG' | 'JOB' | 'QUEST')
                  }
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                  Type
                </label>
                <select
                  className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                  value={editing.type}
                  onChange={(e) => updateField('type', e.target.value)}
                >
                  {OPPORTUNITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                  Difficulty (1–10)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                  value={editing.difficulty ?? 1}
                  onChange={(e) => updateField('difficulty', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                  value={editing.durationMinutes ?? 60}
                  onChange={(e) => updateField('durationMinutes', Number(e.target.value))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm text-heliora-text"
                  value={editing.description ?? ''}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </div>
              <JsonField
                label="Requirements (JSON array)"
                value={editing.requirements ?? []}
                onChange={(v) => updateField('requirements', (v as unknown[]) ?? [])}
                example='[{"type":"STAT_MIN","key":"hacking","value":5}]'
              />
              <JsonField
                label="Rewards (JSON array)"
                value={editing.rewards ?? []}
                onChange={(v) => updateField('rewards', (v as unknown[]) ?? [])}
                example='[{"type":"CREDITS","value":100}]'
              />
              <JsonField
                label="Risks (JSON array)"
                value={editing.risks ?? []}
                onChange={(v) => updateField('risks', (v as unknown[]) ?? [])}
                example='[{"probability":0.3,"consequences":[{"type":"MODIFY_WANTED_LEVEL","value":1}]}]'
              />
              <JsonField
                label="Repeatability (JSON object, JOB cadence here)"
                value={editing.repeatability ?? null}
                onChange={(v) => updateField('repeatability', v)}
                example='{"cadenceHours":24}'
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
                {busy ? 'SAVING…' : editingId ? 'UPDATE' : 'CREATE'}
              </button>
            </div>
          </section>
        )}

        <section className="rounded border border-heliora-border bg-heliora-panel p-4">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-heliora-text-dim">
              <tr>
                <th className="py-2">Title</th>
                <th className="py-2">Kind</th>
                <th className="py-2">Type</th>
                <th className="py-2">Diff</th>
                <th className="py-2">Dur</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((opp) => (
                <tr
                  key={opp.id}
                  className="border-t border-heliora-border/60 hover:bg-black/20"
                >
                  <td className="py-2 font-mono">{opp.title}</td>
                  <td className="py-2 text-heliora-yellow">{opp.kind}</td>
                  <td className="py-2 text-heliora-text-dim">{opp.type}</td>
                  <td className="py-2">{opp.difficulty}</td>
                  <td className="py-2">{opp.durationMinutes ?? '—'}m</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => openEdit(opp)}
                      className="mr-2 rounded border border-heliora-cyan/40 px-2 py-1 text-xs text-heliora-cyan hover:bg-heliora-cyan/10"
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => void remove(opp)}
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
                    No opportunities yet. Create one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

function JsonField({
  label,
  value,
  onChange,
  example,
}: {
  label: string;
  value: unknown;
  onChange: (v: unknown) => void;
  example: string;
}) {
  const [raw, setRaw] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState('');

  useEffect(() => {
    setRaw(JSON.stringify(value, null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(text: string) {
    setRaw(text);
    if (text.trim() === '') {
      setError('');
      onChange(null);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      setError('');
      onChange(parsed);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="md:col-span-2">
      <label className="text-xs uppercase tracking-wider text-heliora-text-dim">{label}</label>
      <textarea
        rows={4}
        className={`mt-1 w-full rounded border bg-heliora-dark px-3 py-2 font-mono text-xs text-heliora-text ${
          error ? 'border-heliora-red' : 'border-heliora-border'
        }`}
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
      />
      {error ? (
        <p className="mt-1 text-xs text-heliora-red">{error}</p>
      ) : (
        <p className="mt-1 text-[10px] text-heliora-text-dim">e.g. {example}</p>
      )}
    </div>
  );
}
