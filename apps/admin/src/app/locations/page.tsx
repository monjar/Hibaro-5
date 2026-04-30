'use client';

import { useEffect, useState } from 'react';
import type {
  AdminBuilding,
  AdminBuildingInput,
  AdminDistrict,
  AdminDistrictInput,
  AdminFaction,
  AdminPlanet,
  AdminPlanetInput,
  BuildingFunction,
  BuildingOwnerType,
  BuildingStatus,
  PlanetType,
  SolarSystem,
} from '@heliora/platform-sdk';
import { adminApi } from '../../lib/api';
import { AdminShell, SelectField, StatusMessage, TextField } from '../../components/AdminShell';

const PLANET_TYPES: PlanetType[] = [
  'TERRESTRIAL',
  'GAS_GIANT',
  'ICE',
  'DESERT',
  'OCEAN',
  'ASTEROID_BELT',
  'STATION',
];

const BUILDING_FUNCTIONS: BuildingFunction[] = [
  'SHOP',
  'SAFEHOUSE',
  'OFFICE',
  'HUB',
  'DOCK',
  'BAR',
  'CLINIC',
  'WAREHOUSE',
  'BLACK_MARKET',
  'MISSION_BOARD',
];

const BUILDING_STATUSES: BuildingStatus[] = [
  'OPEN',
  'CLOSED',
  'DAMAGED',
  'ABANDONED',
  'LOCKED_DOWN',
];

const BUILDING_OWNER_TYPES: BuildingOwnerType[] = ['CHARACTER', 'FACTION', 'CORPORATION', 'SYSTEM'];

type Tab = 'planets' | 'districts' | 'buildings';

export default function AdminLocationsPage() {
  const [tab, setTab] = useState<Tab>('planets');
  const [solarSystems, setSolarSystems] = useState<SolarSystem[]>([]);
  const [planets, setPlanets] = useState<AdminPlanet[]>([]);
  const [districts, setDistricts] = useState<AdminDistrict[]>([]);
  const [buildings, setBuildings] = useState<AdminBuilding[]>([]);
  const [factions, setFactions] = useState<AdminFaction[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    try {
      const [solar, p, d, b, f] = await Promise.all([
        adminApi.getSolarSystems(),
        adminApi.getPlanets(),
        adminApi.getDistricts(),
        adminApi.getBuildings(),
        adminApi.getFactions(),
      ]);
      setSolarSystems(solar);
      setPlanets(p);
      setDistricts(d);
      setBuildings(b);
      setFactions(f);
    } catch (err) {
      setMessage(`- ${(err as Error).message}`);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  function flash(m: string) {
    setMessage(m);
    setTimeout(() => setMessage(''), 4000);
  }

  return (
    <AdminShell
      title="Locations CRUD"
      blurb="Manage planets, districts, and buildings. Travel, shops, and faction control all reference these rows."
    >
      <nav className="mb-4 flex gap-2 text-xs">
        {(['planets', 'districts', 'buildings'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded border px-3 py-1 uppercase tracking-wider ${
              tab === t
                ? 'border-heliora-cyan bg-heliora-cyan/10 text-heliora-cyan'
                : 'border-heliora-border text-heliora-text-dim hover:text-heliora-cyan'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <StatusMessage message={message} />

      {tab === 'planets' && (
        <PlanetsTab
          solarSystems={solarSystems}
          planets={planets}
          busy={busy}
          setBusy={setBusy}
          flash={flash}
          reload={loadAll}
        />
      )}
      {tab === 'districts' && (
        <DistrictsTab
          planets={planets}
          factions={factions}
          districts={districts}
          busy={busy}
          setBusy={setBusy}
          flash={flash}
          reload={loadAll}
        />
      )}
      {tab === 'buildings' && (
        <BuildingsTab
          districts={districts}
          buildings={buildings}
          busy={busy}
          setBusy={setBusy}
          flash={flash}
          reload={loadAll}
        />
      )}
    </AdminShell>
  );
}

function PlanetsTab({
  solarSystems,
  planets,
  busy,
  setBusy,
  flash,
  reload,
}: {
  solarSystems: SolarSystem[];
  planets: AdminPlanet[];
  busy: boolean;
  setBusy: (b: boolean) => void;
  flash: (m: string) => void;
  reload: () => Promise<void>;
}) {
  const defaultSolarId = solarSystems[0]?.id ?? '';
  const empty: AdminPlanetInput = {
    solarSystemId: defaultSolarId,
    name: '',
    description: '',
    planetType: 'TERRESTRIAL',
    dangerLevel: 1,
    lawLevel: 5,
    economyLevel: 5,
  };
  const [editing, setEditing] = useState<AdminPlanetInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function openNew() {
    setEditing({ ...empty, solarSystemId: defaultSolarId });
    setEditingId(null);
  }

  function openEdit(p: AdminPlanet) {
    setEditing({
      solarSystemId: p.solarSystemId,
      name: p.name,
      description: p.description ?? '',
      planetType: p.planetType,
      dangerLevel: p.dangerLevel,
      lawLevel: p.lawLevel,
      economyLevel: p.economyLevel,
    });
    setEditingId(p.id);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      if (editingId) await adminApi.updatePlanet(editingId, editing);
      else await adminApi.createPlanet(editing);
      flash(`+ Saved ${editing.name}`);
      setEditing(null);
      setEditingId(null);
      await reload();
    } catch (err) {
      flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: AdminPlanet) {
    if (!confirm(`Delete planet "${p.name}"?`)) return;
    setBusy(true);
    try {
      await adminApi.deletePlanet(p.id);
      flash(`+ Deleted ${p.name}`);
      await reload();
    } catch (err) {
      flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(false);
    }
  }

  function update<K extends keyof AdminPlanetInput>(key: K, value: AdminPlanetInput[K]) {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={openNew}
          disabled={!defaultSolarId}
          className="rounded border border-heliora-cyan/60 bg-heliora-cyan/10 px-4 py-2 text-sm font-bold text-heliora-cyan hover:bg-heliora-cyan/20 disabled:opacity-30"
        >
          + NEW PLANET
        </button>
      </div>

      {editing && (
        <section className="mb-6 rounded border border-heliora-cyan/40 bg-heliora-panel p-5">
          <h2 className="mb-3 text-lg font-semibold text-heliora-cyan">
            {editingId ? 'Edit' : 'Create'} Planet
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Name" value={editing.name} onChange={(v) => update('name', v)} />
            <SelectField
              label="Solar system"
              value={editing.solarSystemId}
              onChange={(v) => update('solarSystemId', v)}
              options={solarSystems.map((s) => s.id) as readonly string[]}
            />
            <SelectField
              label="Planet type"
              value={editing.planetType ?? 'TERRESTRIAL'}
              onChange={(v) => update('planetType', v as PlanetType)}
              options={PLANET_TYPES}
            />
            <TextField
              label="Danger level (0-10)"
              type="number"
              min={0}
              max={10}
              value={editing.dangerLevel ?? 1}
              onChange={(v) => update('dangerLevel', Number(v))}
            />
            <TextField
              label="Law level (0-10)"
              type="number"
              min={0}
              max={10}
              value={editing.lawLevel ?? 5}
              onChange={(v) => update('lawLevel', Number(v))}
            />
            <TextField
              label="Economy level (0-10)"
              type="number"
              min={0}
              max={10}
              value={editing.economyLevel ?? 5}
              onChange={(v) => update('economyLevel', Number(v))}
            />
            <TextField
              span={2}
              textarea
              label="Description"
              value={editing.description ?? ''}
              onChange={(v) => update('description', v)}
            />
          </div>
          <FormActions
            busy={busy}
            editingId={editingId}
            onSave={save}
            onCancel={() => {
              setEditing(null);
              setEditingId(null);
            }}
          />
        </section>
      )}

      <section className="rounded border border-heliora-border bg-heliora-panel p-4">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-heliora-text-dim">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Type</th>
              <th className="py-2">Danger</th>
              <th className="py-2">Law</th>
              <th className="py-2">Econ</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {planets.map((p) => (
              <tr key={p.id} className="border-t border-heliora-border/60 hover:bg-black/20">
                <td className="py-2 font-mono">{p.name}</td>
                <td className="py-2 text-heliora-yellow">{p.planetType}</td>
                <td className="py-2">{p.dangerLevel}</td>
                <td className="py-2">{p.lawLevel}</td>
                <td className="py-2">{p.economyLevel}</td>
                <td className="py-2 text-right">
                  <RowActions
                    busy={busy}
                    onEdit={() => openEdit(p)}
                    onDelete={() => void remove(p)}
                  />
                </td>
              </tr>
            ))}
            {planets.length === 0 && <EmptyRow cols={6} message="No planets yet." />}
          </tbody>
        </table>
      </section>
    </>
  );
}

function DistrictsTab({
  planets,
  factions,
  districts,
  busy,
  setBusy,
  flash,
  reload,
}: {
  planets: AdminPlanet[];
  factions: AdminFaction[];
  districts: AdminDistrict[];
  busy: boolean;
  setBusy: (b: boolean) => void;
  flash: (m: string) => void;
  reload: () => Promise<void>;
}) {
  const defaultPlanetId = planets[0]?.id ?? '';
  const empty: AdminDistrictInput = {
    planetId: defaultPlanetId,
    name: '',
    description: '',
    controllingFactionId: null,
    dangerLevel: 1,
    lawLevel: 5,
    economyLevel: 5,
  };
  const [editing, setEditing] = useState<AdminDistrictInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function openNew() {
    setEditing({ ...empty, planetId: defaultPlanetId });
    setEditingId(null);
  }

  function openEdit(d: AdminDistrict) {
    setEditing({
      planetId: d.planetId,
      name: d.name,
      description: d.description ?? '',
      controllingFactionId: d.controllingFactionId ?? null,
      dangerLevel: d.dangerLevel,
      lawLevel: d.lawLevel,
      economyLevel: d.economyLevel,
    });
    setEditingId(d.id);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      if (editingId) await adminApi.updateDistrict(editingId, editing);
      else await adminApi.createDistrict(editing);
      flash(`+ Saved ${editing.name}`);
      setEditing(null);
      setEditingId(null);
      await reload();
    } catch (err) {
      flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove(d: AdminDistrict) {
    if (!confirm(`Delete district "${d.name}"?`)) return;
    setBusy(true);
    try {
      await adminApi.deleteDistrict(d.id);
      flash(`+ Deleted ${d.name}`);
      await reload();
    } catch (err) {
      flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(false);
    }
  }

  function update<K extends keyof AdminDistrictInput>(key: K, value: AdminDistrictInput[K]) {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
  }

  const planetName = (id: string) => planets.find((p) => p.id === id)?.name ?? id;
  const factionName = (id: string | null | undefined) =>
    id ? (factions.find((f) => f.id === id)?.name ?? id) : '-';

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={openNew}
          disabled={!defaultPlanetId}
          className="rounded border border-heliora-cyan/60 bg-heliora-cyan/10 px-4 py-2 text-sm font-bold text-heliora-cyan hover:bg-heliora-cyan/20 disabled:opacity-30"
        >
          + NEW DISTRICT
        </button>
      </div>

      {editing && (
        <section className="mb-6 rounded border border-heliora-cyan/40 bg-heliora-panel p-5">
          <h2 className="mb-3 text-lg font-semibold text-heliora-cyan">
            {editingId ? 'Edit' : 'Create'} District
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Name" value={editing.name} onChange={(v) => update('name', v)} />
            <div>
              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                Planet
              </label>
              <select
                value={editing.planetId}
                onChange={(e) => update('planetId', e.target.value)}
                className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
              >
                {planets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                Controlling faction (optional)
              </label>
              <select
                value={editing.controllingFactionId ?? ''}
                onChange={(e) =>
                  update('controllingFactionId', e.target.value === '' ? null : e.target.value)
                }
                className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
              >
                <option value="">— none —</option>
                {factions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <TextField
              label="Danger level (0-10)"
              type="number"
              min={0}
              max={10}
              value={editing.dangerLevel ?? 1}
              onChange={(v) => update('dangerLevel', Number(v))}
            />
            <TextField
              label="Law level (0-10)"
              type="number"
              min={0}
              max={10}
              value={editing.lawLevel ?? 5}
              onChange={(v) => update('lawLevel', Number(v))}
            />
            <TextField
              label="Economy level (0-10)"
              type="number"
              min={0}
              max={10}
              value={editing.economyLevel ?? 5}
              onChange={(v) => update('economyLevel', Number(v))}
            />
            <TextField
              span={2}
              textarea
              label="Description"
              value={editing.description ?? ''}
              onChange={(v) => update('description', v)}
            />
          </div>
          <FormActions
            busy={busy}
            editingId={editingId}
            onSave={save}
            onCancel={() => {
              setEditing(null);
              setEditingId(null);
            }}
          />
        </section>
      )}

      <section className="rounded border border-heliora-border bg-heliora-panel p-4">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-heliora-text-dim">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Planet</th>
              <th className="py-2">Faction</th>
              <th className="py-2">Danger</th>
              <th className="py-2">Law</th>
              <th className="py-2">Econ</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {districts.map((d) => (
              <tr key={d.id} className="border-t border-heliora-border/60 hover:bg-black/20">
                <td className="py-2 font-mono">{d.name}</td>
                <td className="py-2 text-heliora-text-dim">{planetName(d.planetId)}</td>
                <td className="py-2 text-heliora-yellow">{factionName(d.controllingFactionId)}</td>
                <td className="py-2">{d.dangerLevel}</td>
                <td className="py-2">{d.lawLevel}</td>
                <td className="py-2">{d.economyLevel}</td>
                <td className="py-2 text-right">
                  <RowActions
                    busy={busy}
                    onEdit={() => openEdit(d)}
                    onDelete={() => void remove(d)}
                  />
                </td>
              </tr>
            ))}
            {districts.length === 0 && <EmptyRow cols={7} message="No districts yet." />}
          </tbody>
        </table>
      </section>
    </>
  );
}

function BuildingsTab({
  districts,
  buildings,
  busy,
  setBusy,
  flash,
  reload,
}: {
  districts: AdminDistrict[];
  buildings: AdminBuilding[];
  busy: boolean;
  setBusy: (b: boolean) => void;
  flash: (m: string) => void;
  reload: () => Promise<void>;
}) {
  const defaultDistrictId = districts[0]?.id ?? '';
  const empty: AdminBuildingInput = {
    districtId: defaultDistrictId,
    name: '',
    description: '',
    ownerType: 'SYSTEM',
    ownerId: null,
    functionality: [],
    status: 'OPEN',
  };
  const [editing, setEditing] = useState<AdminBuildingInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function openNew() {
    setEditing({ ...empty, districtId: defaultDistrictId });
    setEditingId(null);
  }

  function openEdit(b: AdminBuilding) {
    setEditing({
      districtId: b.districtId,
      name: b.name,
      description: b.description ?? '',
      ownerType: b.ownerType,
      ownerId: b.ownerId ?? null,
      functionality: b.functionality,
      status: b.status,
    });
    setEditingId(b.id);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      if (editingId) await adminApi.updateBuilding(editingId, editing);
      else await adminApi.createBuilding(editing);
      flash(`+ Saved ${editing.name}`);
      setEditing(null);
      setEditingId(null);
      await reload();
    } catch (err) {
      flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove(b: AdminBuilding) {
    if (!confirm(`Delete building "${b.name}"?`)) return;
    setBusy(true);
    try {
      await adminApi.deleteBuilding(b.id);
      flash(`+ Deleted ${b.name}`);
      await reload();
    } catch (err) {
      flash(`- ${(err as Error).message.replace(/^API error \d+: /, '')}`);
    } finally {
      setBusy(false);
    }
  }

  function update<K extends keyof AdminBuildingInput>(key: K, value: AdminBuildingInput[K]) {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
  }

  const districtName = (id: string) => districts.find((d) => d.id === id)?.name ?? id;

  function toggleFunction(fn: BuildingFunction) {
    if (!editing) return;
    const current = new Set(editing.functionality ?? []);
    if (current.has(fn)) current.delete(fn);
    else current.add(fn);
    update('functionality', Array.from(current));
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={openNew}
          disabled={!defaultDistrictId}
          className="rounded border border-heliora-cyan/60 bg-heliora-cyan/10 px-4 py-2 text-sm font-bold text-heliora-cyan hover:bg-heliora-cyan/20 disabled:opacity-30"
        >
          + NEW BUILDING
        </button>
      </div>

      {editing && (
        <section className="mb-6 rounded border border-heliora-cyan/40 bg-heliora-panel p-5">
          <h2 className="mb-3 text-lg font-semibold text-heliora-cyan">
            {editingId ? 'Edit' : 'Create'} Building
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Name" value={editing.name} onChange={(v) => update('name', v)} />
            <div>
              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                District
              </label>
              <select
                value={editing.districtId}
                onChange={(e) => update('districtId', e.target.value)}
                className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
              >
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <SelectField
              label="Owner type"
              value={editing.ownerType ?? 'SYSTEM'}
              onChange={(v) => update('ownerType', v as BuildingOwnerType)}
              options={BUILDING_OWNER_TYPES}
            />
            <TextField
              label="Owner id (optional)"
              value={editing.ownerId ?? ''}
              onChange={(v) => update('ownerId', v === '' ? null : v)}
            />
            <SelectField
              label="Status"
              value={editing.status ?? 'OPEN'}
              onChange={(v) => update('status', v as BuildingStatus)}
              options={BUILDING_STATUSES}
            />
            <div>
              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                Functionality
              </label>
              <div className="mt-1 flex flex-wrap gap-1">
                {BUILDING_FUNCTIONS.map((fn) => {
                  const active = (editing.functionality ?? []).includes(fn);
                  return (
                    <button
                      key={fn}
                      type="button"
                      onClick={() => toggleFunction(fn)}
                      className={`rounded border px-2 py-1 text-[10px] font-mono uppercase ${
                        active
                          ? 'border-heliora-cyan bg-heliora-cyan/10 text-heliora-cyan'
                          : 'border-heliora-border text-heliora-text-dim hover:text-heliora-cyan'
                      }`}
                    >
                      {fn}
                    </button>
                  );
                })}
              </div>
            </div>
            <TextField
              span={2}
              textarea
              label="Description"
              value={editing.description ?? ''}
              onChange={(v) => update('description', v)}
            />
          </div>
          <FormActions
            busy={busy}
            editingId={editingId}
            onSave={save}
            onCancel={() => {
              setEditing(null);
              setEditingId(null);
            }}
          />
        </section>
      )}

      <section className="rounded border border-heliora-border bg-heliora-panel p-4">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-heliora-text-dim">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">District</th>
              <th className="py-2">Owner</th>
              <th className="py-2">Status</th>
              <th className="py-2">Functions</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {buildings.map((b) => (
              <tr key={b.id} className="border-t border-heliora-border/60 hover:bg-black/20">
                <td className="py-2 font-mono">{b.name}</td>
                <td className="py-2 text-heliora-text-dim">{districtName(b.districtId)}</td>
                <td className="py-2 text-heliora-yellow">{b.ownerType}</td>
                <td className="py-2">{b.status}</td>
                <td className="py-2 text-xs text-heliora-text-dim">
                  {(b.functionality ?? []).join(', ') || '-'}
                </td>
                <td className="py-2 text-right">
                  <RowActions
                    busy={busy}
                    onEdit={() => openEdit(b)}
                    onDelete={() => void remove(b)}
                  />
                </td>
              </tr>
            ))}
            {buildings.length === 0 && <EmptyRow cols={6} message="No buildings yet." />}
          </tbody>
        </table>
      </section>
    </>
  );
}

function FormActions({
  busy,
  editingId,
  onSave,
  onCancel,
}: {
  busy: boolean;
  editingId: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-4 flex gap-2">
      <button
        onClick={onCancel}
        className="rounded border border-heliora-border px-4 py-2 text-sm text-heliora-text-dim hover:text-heliora-cyan"
      >
        CANCEL
      </button>
      <button
        onClick={onSave}
        disabled={busy}
        className="rounded border border-heliora-green/60 bg-heliora-green/10 px-4 py-2 text-sm font-bold text-heliora-green hover:bg-heliora-green/20 disabled:opacity-30"
      >
        {busy ? 'SAVING...' : editingId ? 'UPDATE' : 'CREATE'}
      </button>
    </div>
  );
}

function RowActions({
  busy,
  onEdit,
  onDelete,
}: {
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <button
        onClick={onEdit}
        className="mr-2 rounded border border-heliora-cyan/40 px-2 py-1 text-xs text-heliora-cyan hover:bg-heliora-cyan/10"
      >
        EDIT
      </button>
      <button
        onClick={onDelete}
        disabled={busy}
        className="rounded border border-heliora-red/40 px-2 py-1 text-xs text-heliora-red hover:bg-heliora-red/10 disabled:opacity-30"
      >
        DELETE
      </button>
    </>
  );
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} className="py-6 text-center text-heliora-text-dim">
        {message}
      </td>
    </tr>
  );
}
