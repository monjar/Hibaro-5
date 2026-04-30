'use client';

import { useEffect, useState } from 'react';
import type {
  AdminBuilding,
  AdminCorporation,
  AdminCorporationInput,
  CorporationIndustry,
  CorporationStatus,
} from '@heliora/platform-sdk';
import { adminApi } from '../../lib/api';
import { AdminShell, SelectField, StatusMessage, TextField } from '../../components/AdminShell';

const INDUSTRIES: CorporationIndustry[] = [
  'MINING',
  'WEAPONS',
  'TRANSPORT',
  'CYBERNETICS',
  'FOOD',
  'SECURITY',
  'MEDIA',
  'ENERGY',
  'MEDICAL',
  'LOGISTICS',
  'BLACK_MARKET',
];

const STATUSES: CorporationStatus[] = ['GROWING', 'STABLE', 'DECLINING', 'BANKRUPT'];

const empty: AdminCorporationInput = {
  name: '',
  description: '',
  industry: 'LOGISTICS',
  headquartersBuildingId: null,
  cash: 0,
  debt: 0,
  revenue: 0,
  riskOfBankruptcy: 0,
  politicalInfluence: 0,
  status: 'STABLE',
  stockTicker: '',
  stockPrice: 100,
  stockVolatility: 0.05,
};

export default function AdminCorporationsPage() {
  const [list, setList] = useState<AdminCorporation[]>([]);
  const [buildings, setBuildings] = useState<AdminBuilding[]>([]);
  const [editing, setEditing] = useState<AdminCorporationInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const [corps, blds] = await Promise.all([
        adminApi.getCorporations(),
        adminApi.getBuildings(),
      ]);
      setList(corps);
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

  function openEdit(c: AdminCorporation) {
    setEditing({
      name: c.name,
      description: c.description ?? '',
      industry: c.industry,
      headquartersBuildingId: c.headquartersBuildingId ?? null,
      cash: c.cash,
      debt: c.debt,
      revenue: c.revenue,
      riskOfBankruptcy: c.riskOfBankruptcy,
      politicalInfluence: c.politicalInfluence,
      status: c.status,
      stockTicker: c.stockTicker ?? '',
      stockPrice: c.stockPrice ?? null,
      stockVolatility: c.stockVolatility ?? null,
    });
    setEditingId(c.id);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      const payload = {
        ...editing,
        stockTicker: editing.stockTicker?.trim() === '' ? null : editing.stockTicker,
      };
      if (editingId) await adminApi.updateCorporation(editingId, payload);
      else await adminApi.createCorporation(payload);
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

  async function remove(c: AdminCorporation) {
    if (!confirm(`Delete corporation "${c.name}"?`)) return;
    setBusy(true);
    try {
      await adminApi.deleteCorporation(c.id);
      flash(`+ Deleted ${c.name}`);
      await load();
    } catch (err) {
      flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(false);
    }
  }

  function update<K extends keyof AdminCorporationInput>(key: K, value: AdminCorporationInput[K]) {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
  }

  return (
    <AdminShell
      title="Corporations CRUD"
      blurb="Megacorps that drive the stock market and employ characters. Edits affect the world tick."
    >
      <div className="mb-4 flex justify-end">
        <button
          onClick={openNew}
          className="rounded border border-heliora-cyan/60 bg-heliora-cyan/10 px-4 py-2 text-sm font-bold text-heliora-cyan hover:bg-heliora-cyan/20"
        >
          + NEW CORPORATION
        </button>
      </div>

      <StatusMessage message={message} />

      {editing && (
        <section className="mb-6 rounded border border-heliora-cyan/40 bg-heliora-panel p-5">
          <h2 className="mb-3 text-lg font-semibold text-heliora-cyan">
            {editingId ? 'Edit' : 'Create'} Corporation
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Name" value={editing.name} onChange={(v) => update('name', v)} />
            <SelectField
              label="Industry"
              value={editing.industry}
              onChange={(v) => update('industry', v)}
              options={INDUSTRIES}
            />
            <SelectField
              label="Status"
              value={editing.status ?? 'STABLE'}
              onChange={(v) => update('status', v)}
              options={STATUSES}
            />
            <TextField
              label="Stock ticker (e.g. PGN)"
              value={editing.stockTicker ?? ''}
              onChange={(v) => update('stockTicker', v)}
              placeholder="optional"
            />
            <TextField
              label="Stock price"
              type="number"
              step={0.01}
              value={editing.stockPrice ?? ''}
              onChange={(v) => update('stockPrice', v === '' ? null : Number(v))}
            />
            <TextField
              label="Stock volatility (0-1)"
              type="number"
              step={0.01}
              min={0}
              max={1}
              value={editing.stockVolatility ?? ''}
              onChange={(v) => update('stockVolatility', v === '' ? null : Number(v))}
            />
            <TextField
              label="Cash"
              type="number"
              min={0}
              value={editing.cash ?? 0}
              onChange={(v) => update('cash', Number(v))}
            />
            <TextField
              label="Debt"
              type="number"
              min={0}
              value={editing.debt ?? 0}
              onChange={(v) => update('debt', Number(v))}
            />
            <TextField
              label="Revenue"
              type="number"
              value={editing.revenue ?? 0}
              onChange={(v) => update('revenue', Number(v))}
            />
            <TextField
              label="Risk of bankruptcy (0-1)"
              type="number"
              step={0.01}
              min={0}
              max={1}
              value={editing.riskOfBankruptcy ?? 0}
              onChange={(v) => update('riskOfBankruptcy', Number(v))}
            />
            <TextField
              label="Political influence"
              type="number"
              value={editing.politicalInfluence ?? 0}
              onChange={(v) => update('politicalInfluence', Number(v))}
            />
            <div>
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
              <th className="py-2">Industry</th>
              <th className="py-2">Status</th>
              <th className="py-2">Ticker</th>
              <th className="py-2">Price</th>
              <th className="py-2">Cash</th>
              <th className="py-2">Debt</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t border-heliora-border/60 hover:bg-black/20">
                <td className="py-2 font-mono">{c.name}</td>
                <td className="py-2 text-heliora-yellow">{c.industry}</td>
                <td className="py-2 text-heliora-text-dim">{c.status}</td>
                <td className="py-2">{c.stockTicker ?? '-'}</td>
                <td className="py-2">{c.stockPrice?.toFixed(2) ?? '-'}</td>
                <td className="py-2">{Math.round(c.cash)}</td>
                <td className="py-2">{Math.round(c.debt)}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => openEdit(c)}
                    className="mr-2 rounded border border-heliora-cyan/40 px-2 py-1 text-xs text-heliora-cyan hover:bg-heliora-cyan/10"
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => void remove(c)}
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
                <td colSpan={8} className="py-6 text-center text-heliora-text-dim">
                  No corporations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
