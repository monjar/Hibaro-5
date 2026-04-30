'use client';

import { useEffect, useState } from 'react';
import type {
  AdminItemDefinition,
  AdminItemDefinitionInput,
  ItemCategory,
  ItemRarity,
} from '@heliora/platform-sdk';
import { adminApi } from '../../lib/api';
import {
  AdminShell,
  JsonField,
  SelectField,
  StatusMessage,
  TextField,
} from '../../components/AdminShell';

const CATEGORIES: ItemCategory[] = [
  'TOOL',
  'WEAPON',
  'CLOTHING',
  'VEHICLE',
  'CONSUMABLE',
  'MATERIAL',
  'QUEST_ITEM',
];

const RARITIES: ItemRarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'ILLEGAL'];

const empty: AdminItemDefinitionInput = {
  name: '',
  description: '',
  category: 'TOOL',
  rarity: 'COMMON',
  baseValue: 100,
  weight: 1,
  effects: null,
  requirements: null,
  weaponData: null,
  clothingData: null,
  toolData: null,
  vehicleData: null,
};

export default function AdminItemsPage() {
  const [list, setList] = useState<AdminItemDefinition[]>([]);
  const [editing, setEditing] = useState<AdminItemDefinitionInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const items = await adminApi.getItemDefinitions();
      setList(items);
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

  function openEdit(i: AdminItemDefinition) {
    setEditing({
      name: i.name,
      description: i.description ?? '',
      category: i.category,
      rarity: i.rarity,
      baseValue: i.baseValue,
      weight: i.weight,
      effects: i.effects ?? null,
      requirements: i.requirements ?? null,
      weaponData: i.weaponData ?? null,
      clothingData: i.clothingData ?? null,
      toolData: i.toolData ?? null,
      vehicleData: i.vehicleData ?? null,
    });
    setEditingId(i.id);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      if (editingId) await adminApi.updateItemDefinition(editingId, editing);
      else await adminApi.createItemDefinition(editing);
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

  async function remove(i: AdminItemDefinition) {
    if (!confirm(`Delete item "${i.name}"?`)) return;
    setBusy(true);
    try {
      await adminApi.deleteItemDefinition(i.id);
      flash(`+ Deleted ${i.name}`);
      await load();
    } catch (err) {
      flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(false);
    }
  }

  function update<K extends keyof AdminItemDefinitionInput>(
    key: K,
    value: AdminItemDefinitionInput[K],
  ) {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
  }

  return (
    <AdminShell
      title="Item Definitions CRUD"
      blurb="Tools, weapons, consumables, contraband. Definitions become inventory items via shops and rewards."
    >
      <div className="mb-4 flex justify-end">
        <button
          onClick={openNew}
          className="rounded border border-heliora-cyan/60 bg-heliora-cyan/10 px-4 py-2 text-sm font-bold text-heliora-cyan hover:bg-heliora-cyan/20"
        >
          + NEW ITEM
        </button>
      </div>

      <StatusMessage message={message} />

      {editing && (
        <section className="mb-6 rounded border border-heliora-cyan/40 bg-heliora-panel p-5">
          <h2 className="mb-3 text-lg font-semibold text-heliora-cyan">
            {editingId ? 'Edit' : 'Create'} Item Definition
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Name" value={editing.name} onChange={(v) => update('name', v)} />
            <SelectField
              label="Category"
              value={editing.category}
              onChange={(v) => update('category', v)}
              options={CATEGORIES}
            />
            <SelectField
              label="Rarity"
              value={editing.rarity ?? 'COMMON'}
              onChange={(v) => update('rarity', v)}
              options={RARITIES}
            />
            <TextField
              label="Base value (credits)"
              type="number"
              min={0}
              value={editing.baseValue ?? 0}
              onChange={(v) => update('baseValue', Number(v))}
            />
            <TextField
              label="Weight"
              type="number"
              step={0.1}
              min={0}
              value={editing.weight ?? 0}
              onChange={(v) => update('weight', Number(v))}
            />
            <TextField
              span={2}
              textarea
              label="Description"
              value={editing.description ?? ''}
              onChange={(v) => update('description', v)}
            />
            <JsonField
              label="Effects (JSON)"
              value={editing.effects ?? null}
              onChange={(v) => update('effects', v)}
              example='{"smugglingBonus":0.1}'
            />
            <JsonField
              label="Requirements (JSON)"
              value={editing.requirements ?? null}
              onChange={(v) => update('requirements', v)}
              example='{"minLevel":3}'
            />
            <JsonField
              label="Weapon data (JSON)"
              value={editing.weaponData ?? null}
              onChange={(v) => update('weaponData', v)}
              example='{"damage":12,"range":"short"}'
            />
            <JsonField
              label="Clothing data (JSON)"
              value={editing.clothingData ?? null}
              onChange={(v) => update('clothingData', v)}
              example='{"armor":4,"slot":"torso"}'
            />
            <JsonField
              label="Tool data (JSON)"
              value={editing.toolData ?? null}
              onChange={(v) => update('toolData', v)}
              example='{"hackingBonus":2}'
            />
            <JsonField
              label="Vehicle data (JSON)"
              value={editing.vehicleData ?? null}
              onChange={(v) => update('vehicleData', v)}
              example='{"capacity":4,"range":1000}'
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
              <th className="py-2">Category</th>
              <th className="py-2">Rarity</th>
              <th className="py-2">Value</th>
              <th className="py-2">Weight</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => (
              <tr key={i.id} className="border-t border-heliora-border/60 hover:bg-black/20">
                <td className="py-2 font-mono">{i.name}</td>
                <td className="py-2 text-heliora-yellow">{i.category}</td>
                <td className="py-2 text-heliora-text-dim">{i.rarity}</td>
                <td className="py-2">{Math.round(i.baseValue)}</td>
                <td className="py-2">{i.weight}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => openEdit(i)}
                    className="mr-2 rounded border border-heliora-cyan/40 px-2 py-1 text-xs text-heliora-cyan hover:bg-heliora-cyan/10"
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => void remove(i)}
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
                  No item definitions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
