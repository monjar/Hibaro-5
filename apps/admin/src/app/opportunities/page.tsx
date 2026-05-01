'use client';

import { useEffect, useState } from 'react';
import type {
  AdminItemDefinition, 
  AdminOpportunityInput, 
  OpportunityDefinition, 
} from '@heliora/platform-sdk';
import { adminApi } from '../../lib/api';
import {
  AdminShell,
  JsonField,
  SelectField,
  StatusMessage,
  TextField,
} from '../../components/AdminShell';

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
] as const;

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

type ItemReward = Record<string, unknown> & {
  type: 'ITEM';
  itemDefinitionId: string;
};

export default function AdminOpportunitiesPage() {
  const [list, setList] = useState<OpportunityDefinition[]>([]);
  const [itemDefinitions, setItemDefinitions] = useState<AdminItemDefinition[]>([]);
  const [editing, setEditing] = useState<AdminOpportunityInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedRewardItemId, setSelectedRewardItemId] = useState('');

  async function load() {
    try {
      const [result, items] = await Promise.all([
        adminApi.getOpportunities(),
        adminApi.getItemDefinitions(),
      ]);
      setList(result);
      setItemDefinitions(items);
      setSelectedRewardItemId((current) => current || items[0]?.id || '');
    } catch (err) {
      setMessage(`- ${(err as Error).message}`);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openNew() {
    setEditingId(null);
    setEditing({ ...empty });
    setSelectedRewardItemId((current) => current || itemDefinitions[0]?.id || '');
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
    const existingItemReward = ((opp.rewards as Array<Record<string, unknown>>) ?? []).find(
      (reward) => reward.type === 'ITEM' && typeof reward.itemDefinitionId === 'string',
    );
    setSelectedRewardItemId(
      (existingItemReward?.itemDefinitionId as string | undefined) ?? itemDefinitions[0]?.id ?? '',
    );
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setMessage('');
    try {
      if (editingId) {
        await adminApi.updateOpportunity(editingId, editing);
        setMessage(`+ Updated ${editing.title}`);
      } else {
        await adminApi.createOpportunity(editing);
        setMessage(`+ Created ${editing.title}`);
      }
      setEditing(null);
      setEditingId(null);
      await load();
    } catch (err) {
      setMessage(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
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
      await adminApi.deleteOpportunity(opp.id);
      setMessage(`+ Deleted ${opp.title}`);
      await load();
    } catch (err) {
      setMessage(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(false);
      setTimeout(() => setMessage(''), 4000);
    }
  }

  function update<K extends keyof AdminOpportunityInput>(key: K, value: AdminOpportunityInput[K]) {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
  }

  function appendSelectedItemReward() {
    if (!editing || !selectedRewardItemId) return;
    const rewards = Array.isArray(editing.rewards) ? editing.rewards : [];
    update('rewards', [...rewards, { type: 'ITEM', itemDefinitionId: selectedRewardItemId }]);
  }

  function removeItemReward(rewardIndex: number) {
    if (!editing || !Array.isArray(editing.rewards)) return;
    update(
      'rewards',
      editing.rewards.filter((_, index) => index !== rewardIndex),
    );
  }

  const itemRewardEntries = Array.isArray(editing?.rewards)
    ? editing.rewards
        .map((reward, index) => ({ reward, index }))
        .filter(
          (entry): entry is { reward: ItemReward; index: number } => {
            if (typeof entry.reward !== 'object' || entry.reward === null) {
              return false;
            }
            const reward = entry.reward as Record<string, unknown>;
            return reward.type === 'ITEM' && typeof reward.itemDefinitionId === 'string';
          },
        )
    : [];

  return (
    <AdminShell
      title="Opportunities CRUD"
      blurb="Create and manage gigs, jobs, and quests. Deletes cascade to instances and employments."
    >
      <div className="mb-4 flex justify-end">
        <button
          onClick={openNew}
          className="rounded border border-heliora-cyan/60 bg-heliora-cyan/10 px-4 py-2 text-sm font-bold text-heliora-cyan hover:bg-heliora-cyan/20"
        >
          + NEW OPPORTUNITY
        </button>
      </div>

      <StatusMessage message={message} />

      {editing && (
        <section className="mb-6 rounded border border-heliora-cyan/40 bg-heliora-panel p-5">
          <h2 className="mb-3 text-lg font-semibold text-heliora-cyan">
            {editingId ? 'Edit' : 'Create'} Opportunity
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Title" value={editing.title} onChange={(v) => update('title', v)} />
            <SelectField
              label="Kind"
              value={editing.kind}
              onChange={(v) => update('kind', v)}
              options={KINDS}
            />
            <SelectField
              label="Type"
              value={editing.type}
              onChange={(v) => update('type', v)}
              options={OPPORTUNITY_TYPES}
            />
            <TextField
              label="Difficulty (1-10)"
              type="number"
              min={1}
              max={10}
              value={editing.difficulty ?? 1}
              onChange={(v) => update('difficulty', Number(v))}
            />
            <TextField
              label="Duration (minutes)"
              type="number"
              min={1}
              value={editing.durationMinutes ?? 60}
              onChange={(v) => update('durationMinutes', Number(v))}
            />
            <TextField
              label="Description"
              span={2}
              textarea
              value={editing.description ?? ''}
              onChange={(v) => update('description', v)}
            />
            <JsonField
              label="Requirements (JSON array)"
              value={editing.requirements ?? []}
              onChange={(v) => update('requirements', (v as unknown[]) ?? [])}
              example='[{"type":"STAT_MIN","key":"hacking","value":5}]'
            />
            <JsonField
              label="Rewards (JSON array)"
              value={editing.rewards ?? []}
              onChange={(v) => update('rewards', (v as unknown[]) ?? [])}
              example='[{"type":"CREDITS","value":100}]'
            />
            <div className="md:col-span-2 rounded border border-heliora-yellow/30 bg-heliora-yellow/5 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="flex-1">
                  <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                    Quick item reward selector
                  </label>
                  <select
                    className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                    value={selectedRewardItemId}
                    onChange={(event) => setSelectedRewardItemId(event.target.value)}
                    disabled={itemDefinitions.length === 0}
                  >
                    {itemDefinitions.length === 0 ? (
                      <option value="">No item definitions available</option>
                    ) : (
                      itemDefinitions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.category}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={appendSelectedItemReward}
                  disabled={!selectedRewardItemId}
                  className="rounded border border-heliora-yellow/50 bg-heliora-yellow/10 px-4 py-2 text-sm font-bold text-heliora-yellow hover:bg-heliora-yellow/20 disabled:opacity-30"
                >
                  ADD ITEM REWARD
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {itemRewardEntries.length === 0 ? (
                  <p className="text-xs text-heliora-text-dim">
                    No item rewards configured yet. Adding one here updates the rewards JSON above.
                  </p>
                ) : (
                  itemRewardEntries.map(({ reward, index }) => {
                    const item = itemDefinitions.find((entry) => entry.id === reward.itemDefinitionId);
                    return (
                      <div
                        key={`${reward.itemDefinitionId}-${index}`}
                        className="flex items-center justify-between rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-xs"
                      >
                        <span className="font-mono text-heliora-cyan">
                          {item?.name ?? reward.itemDefinitionId}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItemReward(index)}
                          className="rounded border border-heliora-red/40 px-2 py-1 text-[10px] text-heliora-red hover:bg-heliora-red/10"
                        >
                          REMOVE
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <JsonField
              label="Risks (JSON array)"
              value={editing.risks ?? []}
              onChange={(v) => update('risks', (v as unknown[]) ?? [])}
              example='[{"probability":0.3,"consequences":[{"type":"MODIFY_WANTED_LEVEL","value":1}]}]'
            />
            <JsonField
              label="Repeatability (JSON object, JOB cadence here)"
              value={editing.repeatability ?? null}
              onChange={(v) => update('repeatability', v)}
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
              <th className="py-2">Kind</th>
              <th className="py-2">Type</th>
              <th className="py-2">Diff</th>
              <th className="py-2">Dur</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((opp) => (
              <tr key={opp.id} className="border-t border-heliora-border/60 hover:bg-black/20">
                <td className="py-2 font-mono">{opp.title}</td>
                <td className="py-2 text-heliora-yellow">{opp.kind}</td>
                <td className="py-2 text-heliora-text-dim">{opp.type}</td>
                <td className="py-2">{opp.difficulty}</td>
                <td className="py-2">{opp.durationMinutes ?? '-'}m</td>
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
    </AdminShell>
  );
}
