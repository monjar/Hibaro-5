'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  AdminBuilding,
  AdminCorporation,
  AdminFaction,
  AdminItemDefinition,
  AdminOpportunityInput,
  AdminPlanet,
  AdminWorldEvent,
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

const REQUIREMENT_TYPES = [
  'STAT_MIN',
  'STAT_MAX',
  'CREDITS_MIN',
  'FACTION_REPUTATION_MIN',
  'FACTION_REPUTATION_MAX',
  'CORPORATION_REPUTATION_MIN',
  'CORPORATION_REPUTATION_MAX',
  'RELATIONSHIP_MIN',
  'RELATIONSHIP_MAX',
  'ITEM_REQUIRED',
  'QUEST_COMPLETED',
  'DISTRICT_ACCESS',
  'PLANET_ACCESS',
  'RANK_REQUIRED',
] as const;

const REWARD_TYPES = [
  'CREDITS',
  'ITEM',
  'FACTION_REPUTATION',
  'CORPORATION_REPUTATION',
  'UNLOCK_BUILDING',
  'UNLOCK_QUEST',
  'STAT_XP',
  'CHARACTER_RELATIONSHIP',
  'STOCK_SHARES',
  'RANK_UP',
] as const;

const RISK_TYPES = [
  'COMBAT',
  'LEGAL',
  'FACTION_HOSTILITY',
  'CORPORATE_RETALIATION',
  'INJURY',
  'DEATH',
  'BETRAYAL',
  'WORLD_EVENT_TRIGGER',
] as const;

const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'] as const;

const CONSEQUENCE_TYPES = [
  'MODIFY_STAT',
  'MODIFY_CREDITS',
  'MODIFY_WANTED_LEVEL',
  'MODIFY_FACTION_REPUTATION',
  'MODIFY_CORPORATION_REPUTATION',
] as const;

const OBJECTIVE_TYPES = [
  'COMPLETE_GIG_ON_PLANET',
  'COMPLETE_QUEST',
  'VISIT_DISTRICT',
  'OBTAIN_ITEM',
  'REACH_FACTION_STANDING',
  'CUSTOM',
] as const;

const STAT_KEYS = [
  'strength',
  'agility',
  'intelligence',
  'charisma',
  'hacking',
  'combat',
  'stealth',
  'engineering',
  'health',
  'energy',
  'wantedLevel',
] as const;

type StructuredRequirement = Record<string, unknown>;
type StructuredReward = Record<string, unknown>;
type StructuredRisk = Record<string, unknown>;
type StructuredConsequence = Record<string, unknown>;
type StructuredObjective = Record<string, unknown>;

const empty: AdminOpportunityInput = {
  title: '',
  description: '',
  acceptedDescription: '',
  kind: 'GIG',
  type: 'DELIVERY',
  difficulty: 10,
  durationMinutes: 60,
  requirements: [],
  rewards: [{ type: 'CREDITS', value: 100 }],
  risks: [],
  timelineEvents: [],
  possibleEventIds: [],
  repeatability: null,
  questData: null,
  startsAvailableAt: null,
  endsAvailableAt: null,
};

export default function AdminOpportunitiesPage() {
  const [list, setList] = useState<OpportunityDefinition[]>([]);
  const [itemDefinitions, setItemDefinitions] = useState<AdminItemDefinition[]>([]);
  const [planets, setPlanets] = useState<AdminPlanet[]>([]);
  const [buildings, setBuildings] = useState<AdminBuilding[]>([]);
  const [factions, setFactions] = useState<AdminFaction[]>([]);
  const [corporations, setCorporations] = useState<AdminCorporation[]>([]);
  const [worldEvents, setWorldEvents] = useState<AdminWorldEvent[]>([]);
  const [editing, setEditing] = useState<AdminOpportunityInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'ALL' | (typeof KINDS)[number]>('ALL');

  async function load() {
    try {
      const [result, items, locations, world, factionList, corporationList, eventList] =
        await Promise.all([
        adminApi.getOpportunities(),
        adminApi.getItemDefinitions(),
        adminApi.getPlanets(),
        adminApi.getBuildings(),
        adminApi.getFactions(),
        adminApi.getCorporations(),
        adminApi.getWorldEvents(),
      ]);
      setList(result);
      setItemDefinitions(items);
      setPlanets(locations);
      setBuildings(world);
      setFactions(factionList);
      setCorporations(corporationList);
      setWorldEvents(eventList);
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
  }

  function openEdit(opp: OpportunityDefinition) {
    setEditingId(opp.id);
    setEditing({
      title: opp.title,
      description: opp.description ?? '',
      acceptedDescription: opp.acceptedDescription ?? '',
      kind: opp.kind,
      type: opp.type,
      difficulty: opp.difficulty,
      durationMinutes: opp.durationMinutes ?? 60,
      requirements: opp.requirements,
      rewards: opp.rewards,
      risks: opp.risks,
      timelineEvents: opp.timelineEvents ?? [],
      possibleEventIds: opp.possibleEventIds ?? [],
      repeatability: opp.repeatability,
      questData: opp.questData ?? null,
      startsAvailableAt: opp.startsAvailableAt ?? null,
      endsAvailableAt: opp.endsAvailableAt ?? null,
    });
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
    setEditing((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function replaceRequirements(next: StructuredRequirement[]) {
    update('requirements', next);
  }

  function replaceRewards(next: StructuredReward[]) {
    update('rewards', next);
  }

  function replaceRisks(next: StructuredRisk[]) {
    update('risks', next);
  }

  function updateQuestData(next: AdminOpportunityInput['questData']) {
    update('questData', next);
  }

  const filteredList = useMemo(() => {
    return list.filter((opp) => {
      if (kindFilter !== 'ALL' && opp.kind !== kindFilter) {
        return false;
      }

      const query = search.trim().toLowerCase();
      if (!query) {
        return true;
      }

      return [opp.title, opp.description ?? '', opp.kind, opp.type].some((field) =>
        field.toLowerCase().includes(query),
      );
    });
  }, [kindFilter, list, search]);

  const questOptions = useMemo(() => list.filter((opp) => opp.kind === 'QUEST'), [list]);

  const requirements = Array.isArray(editing?.requirements)
    ? (editing?.requirements as StructuredRequirement[])
    : [];
  const rewards = Array.isArray(editing?.rewards) ? (editing?.rewards as StructuredReward[]) : [];
  const risks = Array.isArray(editing?.risks) ? (editing?.risks as StructuredRisk[]) : [];
  const timelineEvents = Array.isArray(editing?.timelineEvents) ? editing.timelineEvents : [];
  const linkedEventIds = Array.isArray(editing?.possibleEventIds)
    ? editing.possibleEventIds
    : [];
  const cadenceHours =
    editing?.repeatability &&
    typeof editing.repeatability === 'object' &&
    editing.repeatability !== null &&
    'cadenceHours' in editing.repeatability &&
    typeof editing.repeatability.cadenceHours === 'number'
      ? editing.repeatability.cadenceHours
      : 24;
  const questData =
    editing?.questData && typeof editing.questData === 'object' ? editing.questData : null;
  const objectives = Array.isArray(questData?.objectives)
    ? (questData.objectives as StructuredObjective[])
    : [];

  function createRequirement(type: (typeof REQUIREMENT_TYPES)[number]): StructuredRequirement {
    switch (type) {
      case 'STAT_MIN':
      case 'STAT_MAX':
        return { type, key: 'hacking', value: 5 };
      case 'CREDITS_MIN':
        return { type, value: 100 };
      case 'FACTION_REPUTATION_MIN':
      case 'FACTION_REPUTATION_MAX':
        return { type, id: factions[0]?.id ?? '', value: 5 };
      case 'CORPORATION_REPUTATION_MIN':
      case 'CORPORATION_REPUTATION_MAX':
        return { type, id: corporations[0]?.id ?? '', value: 5 };
      case 'RELATIONSHIP_MIN':
      case 'RELATIONSHIP_MAX':
        return { type, scope: 'FACTION', id: factions[0]?.id ?? '', value: 5 };
      case 'ITEM_REQUIRED':
        return { type, id: itemDefinitions[0]?.id ?? '' };
      case 'QUEST_COMPLETED':
        return { type, id: questOptions[0]?.id ?? '' };
      case 'DISTRICT_ACCESS':
        return { type, id: '' };
      case 'PLANET_ACCESS':
        return { type, id: planets[0]?.id ?? '' };
      case 'RANK_REQUIRED':
        return { type, id: factions[0]?.id ?? '', name: 'Trusted Operator' };
      default:
        return { type };
    }
  }

  function createReward(type: (typeof REWARD_TYPES)[number]): StructuredReward {
    switch (type) {
      case 'CREDITS':
        return { type, value: 100 };
      case 'ITEM':
        return { type, itemDefinitionId: itemDefinitions[0]?.id ?? '' };
      case 'FACTION_REPUTATION':
        return { type, factionId: factions[0]?.id ?? '', value: 5 };
      case 'CORPORATION_REPUTATION':
        return { type, corporationId: corporations[0]?.id ?? '', value: 5 };
      case 'UNLOCK_BUILDING':
        return { type, buildingId: buildings[0]?.id ?? '' };
      case 'UNLOCK_QUEST':
        return { type, questId: questOptions[0]?.id ?? '' };
      case 'STAT_XP':
        return { type, key: 'hacking', value: 1 };
      case 'CHARACTER_RELATIONSHIP':
        return { type, characterId: '', value: 5 };
      case 'STOCK_SHARES':
        return { type, corporationId: corporations[0]?.id ?? '', value: 10 };
      case 'RANK_UP':
        return { type, factionId: factions[0]?.id ?? '', key: 'Trusted Operator' };
      default:
        return { type };
    }
  }

  function createRisk(): StructuredRisk {
    return {
      level: 'LOW',
      type: 'LEGAL',
      probability: 0.25,
      consequences: [{ type: 'MODIFY_WANTED_LEVEL', value: 1 }],
    };
  }

  function createConsequence(type: (typeof CONSEQUENCE_TYPES)[number]): StructuredConsequence {
    switch (type) {
      case 'MODIFY_STAT':
        return { type, key: 'health', value: -10 };
      case 'MODIFY_CREDITS':
        return { type, value: -50 };
      case 'MODIFY_WANTED_LEVEL':
        return { type, value: 1 };
      case 'MODIFY_FACTION_REPUTATION':
        return { type, factionId: factions[0]?.id ?? '', value: -5 };
      case 'MODIFY_CORPORATION_REPUTATION':
        return { type, corporationId: corporations[0]?.id ?? '', value: -5 };
      default:
        return { type };
    }
  }

  function createObjective(type: (typeof OBJECTIVE_TYPES)[number]): StructuredObjective {
    switch (type) {
      case 'COMPLETE_GIG_ON_PLANET':
        return { type, planetId: planets[0]?.id ?? '', count: 1, description: '' };
      case 'COMPLETE_QUEST':
        return { type, opportunityId: questOptions[0]?.id ?? '', count: 1, description: '' };
      case 'VISIT_DISTRICT':
        return { type, districtId: '', description: '' };
      case 'OBTAIN_ITEM':
        return { type, itemDefinitionId: itemDefinitions[0]?.id ?? '', count: 1, description: '' };
      case 'REACH_FACTION_STANDING':
        return { type, factionId: factions[0]?.id ?? '', value: 10, description: '' };
      case 'CUSTOM':
        return { type, description: 'Describe the win condition for writers and QA.' };
      default:
        return { type };
    }
  }

  function setCadenceHours(hours: number) {
    update('repeatability', { cadenceHours: Math.max(1, hours) });
  }

  function clearQuestData() {
    updateQuestData(null);
  }

  function toggleEventLink(eventId: string) {
    const next = linkedEventIds.includes(eventId)
      ? linkedEventIds.filter((entry) => entry !== eventId)
      : [...linkedEventIds, eventId];
    update('possibleEventIds', next);
  }

  function setAvailability(key: 'startsAvailableAt' | 'endsAvailableAt', value: string) {
    update(key, value ? new Date(value).toISOString() : null);
  }

  function addRequirement() {
    replaceRequirements([...requirements, createRequirement('STAT_MIN')]);
  }

  function patchRequirement(index: number, patch: StructuredRequirement) {
    replaceRequirements(
      requirements.map((entry, currentIndex) =>
        currentIndex === index ? { ...entry, ...patch } : entry,
      ),
    );
  }

  function removeRequirement(index: number) {
    replaceRequirements(requirements.filter((_, currentIndex) => currentIndex !== index));
  }

  function addReward() {
    replaceRewards([...rewards, createReward('CREDITS')]);
  }

  function patchReward(index: number, patch: StructuredReward) {
    replaceRewards(
      rewards.map((entry, currentIndex) =>
        currentIndex === index ? { ...entry, ...patch } : entry,
      ),
    );
  }

  function removeReward(index: number) {
    replaceRewards(rewards.filter((_, currentIndex) => currentIndex !== index));
  }

  function addRisk() {
    replaceRisks([...risks, createRisk()]);
  }

  function patchRisk(index: number, patch: StructuredRisk) {
    replaceRisks(
      risks.map((entry, currentIndex) =>
        currentIndex === index ? { ...entry, ...patch } : entry,
      ),
    );
  }

  function removeRisk(index: number) {
    replaceRisks(risks.filter((_, currentIndex) => currentIndex !== index));
  }

  function addConsequence(riskIndex: number) {
    const risk = risks[riskIndex] ?? {};
    const consequences = Array.isArray(risk.consequences)
      ? (risk.consequences as StructuredConsequence[])
      : [];
    patchRisk(riskIndex, { consequences: [...consequences, createConsequence('MODIFY_WANTED_LEVEL')] });
  }

  function patchConsequence(
    riskIndex: number,
    consequenceIndex: number,
    patch: StructuredConsequence,
  ) {
    const risk = risks[riskIndex] ?? {};
    const consequences = Array.isArray(risk.consequences)
      ? (risk.consequences as StructuredConsequence[])
      : [];
    patchRisk(riskIndex, {
      consequences: consequences.map((entry, currentIndex) =>
        currentIndex === consequenceIndex ? { ...entry, ...patch } : entry,
      ),
    });
  }

  function removeConsequence(riskIndex: number, consequenceIndex: number) {
    const risk = risks[riskIndex] ?? {};
    const consequences = Array.isArray(risk.consequences)
      ? (risk.consequences as StructuredConsequence[])
      : [];
    patchRisk(riskIndex, {
      consequences: consequences.filter((_, currentIndex) => currentIndex !== consequenceIndex),
    });
  }

  function addObjective() {
    updateQuestData({
      ...(questData ?? {}),
      objectives: [...objectives, createObjective('CUSTOM')],
    });
  }

  function patchObjective(index: number, patch: StructuredObjective) {
    updateQuestData({
      ...(questData ?? {}),
      objectives: objectives.map((entry, currentIndex) =>
        currentIndex === index ? { ...entry, ...patch } : entry,
      ),
    });
  }

  function removeObjective(index: number) {
    updateQuestData({
      ...(questData ?? {}),
      objectives: objectives.filter((_, currentIndex) => currentIndex !== index),
    });
  }

  function formatDateInput(value?: string | null) {
    return value ? value.slice(0, 16) : '';
  }

  function getFactionName(id: unknown) {
    return factions.find((entry) => entry.id === id)?.name ?? String(id ?? 'Unknown faction');
  }

  function getCorporationName(id: unknown) {
    return (
      corporations.find((entry) => entry.id === id)?.name ?? String(id ?? 'Unknown corporation')
    );
  }

  function getItemName(id: unknown) {
    return itemDefinitions.find((entry) => entry.id === id)?.name ?? String(id ?? 'Unknown item');
  }

  function getBuildingName(id: unknown) {
    return buildings.find((entry) => entry.id === id)?.name ?? String(id ?? 'Unknown building');
  }

  function getQuestName(id: unknown) {
    return questOptions.find((entry) => entry.id === id)?.title ?? String(id ?? 'Unknown quest');
  }

  function getPlanetName(id: unknown) {
    return planets.find((entry) => entry.id === id)?.name ?? String(id ?? 'Unknown planet');
  }

  function describeRequirement(entry: StructuredRequirement) {
    switch (entry.type) {
      case 'STAT_MIN':
      case 'STAT_MAX':
        return `${entry.type === 'STAT_MIN' ? 'Needs at least' : 'Caps at'} ${entry.value} ${String(entry.key)}`;
      case 'CREDITS_MIN':
        return `Needs ${entry.value} credits`;
      case 'FACTION_REPUTATION_MIN':
      case 'FACTION_REPUTATION_MAX':
        return `${entry.type === 'FACTION_REPUTATION_MIN' ? 'Needs' : 'Requires at most'} ${entry.value} standing with ${getFactionName(entry.id)}`;
      case 'CORPORATION_REPUTATION_MIN':
      case 'CORPORATION_REPUTATION_MAX':
        return `${entry.type === 'CORPORATION_REPUTATION_MIN' ? 'Needs' : 'Requires at most'} ${entry.value} standing with ${getCorporationName(entry.id)}`;
      case 'RELATIONSHIP_MIN':
      case 'RELATIONSHIP_MAX':
        return `${entry.type === 'RELATIONSHIP_MIN' ? 'Needs' : 'Caps'} ${entry.value} ${String(entry.scope).toLowerCase()} standing`;
      case 'ITEM_REQUIRED':
        return `Requires item: ${getItemName(entry.id)}`;
      case 'QUEST_COMPLETED':
        return `Requires quest: ${getQuestName(entry.id)}`;
      case 'DISTRICT_ACCESS':
        return `Needs district access: ${String(entry.id)}`;
      case 'PLANET_ACCESS':
        return `Needs planet access: ${getPlanetName(entry.id)}`;
      case 'RANK_REQUIRED':
        return `Needs ${entry.name} rank with ${getFactionName(entry.id)}`;
      default:
        return String(entry.type ?? 'Requirement');
    }
  }

  function describeReward(entry: StructuredReward) {
    switch (entry.type) {
      case 'CREDITS':
        return `Pays ${entry.value} credits`;
      case 'ITEM':
        return `Awards ${getItemName(entry.itemDefinitionId)}`;
      case 'FACTION_REPUTATION':
        return `Changes ${getFactionName(entry.factionId)} by ${entry.value}`;
      case 'CORPORATION_REPUTATION':
        return `Changes ${getCorporationName(entry.corporationId)} by ${entry.value}`;
      case 'UNLOCK_BUILDING':
        return `Unlocks ${getBuildingName(entry.buildingId)}`;
      case 'UNLOCK_QUEST':
        return `Unlocks ${getQuestName(entry.questId)}`;
      case 'STAT_XP':
        return `XP for ${String(entry.key)} (+${entry.value})`;
      case 'STOCK_SHARES':
        return `Awards ${entry.value} shares in ${getCorporationName(entry.corporationId)}`;
      case 'RANK_UP':
        return `Ranks up with ${getFactionName(entry.factionId)} to ${String(entry.key ?? 'new rank')}`;
      case 'CHARACTER_RELATIONSHIP':
        return `Changes relationship by ${entry.value}`;
      default:
        return String(entry.type ?? 'Reward');
    }
  }

  function describeRisk(entry: StructuredRisk) {
    return `${String(entry.level ?? 'LOW')} ${String(entry.type ?? 'RISK')} @ ${Math.round(
      Number(entry.probability ?? 0) * 100,
    )}%`;
  }

  return (
    <AdminShell
      title="Writer Workbench · Opportunities"
      blurb="Create and manage gigs, jobs, and quests with structured authoring for requirements, rewards, risks, quest flow, schedules, and world-event hooks."
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 md:grid-cols-3 lg:w-2/3">
          <TextField
            label="Search"
            value={search}
            onChange={setSearch}
            placeholder="Search titles, descriptions, types..."
          />
          <SelectField
            label="Kind Filter"
            value={kindFilter}
            onChange={(value) => setKindFilter(value)}
            options={['ALL', ...KINDS] as const}
          />
          <div className="rounded border border-heliora-border bg-heliora-panel px-3 py-2 text-xs text-heliora-text-dim">
            <div className="uppercase tracking-wider">Visible entries</div>
            <div className="mt-1 font-mono text-lg text-heliora-cyan">{filteredList.length}</div>
          </div>
        </div>
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
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-heliora-cyan">
                {editingId ? 'Edit' : 'Create'} Opportunity
              </h2>
              <p className="mt-1 text-xs text-heliora-text-dim">
                Structured authoring replaces raw JSON for the writer-critical fields.
              </p>
            </div>
            <div className="rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-xs text-heliora-text-dim">
              <div className="font-mono text-heliora-cyan">{editing.kind}</div>
              <div>
                {requirements.length} req · {rewards.length} rewards · {risks.length} risks
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr),minmax(280px,1fr)]">
            <div className="space-y-6">
              <section className="rounded border border-heliora-border/70 bg-heliora-dark/40 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-heliora-cyan">
                  Core Definition
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField
                    label="Title"
                    value={editing.title}
                    onChange={(value) => update('title', value)}
                  />
                  <SelectField
                    label="Kind"
                    value={editing.kind}
                    onChange={(value) => {
                      update('kind', value);
                      if (value !== 'QUEST') {
                        clearQuestData();
                      }
                      if (value !== 'JOB') {
                        update('repeatability', null);
                      }
                    }}
                    options={KINDS}
                  />
                  <SelectField
                    label="Type"
                    value={editing.type}
                    onChange={(value) => update('type', value)}
                    options={OPPORTUNITY_TYPES}
                  />
                  <TextField
                    label="Difficulty (DC 8-30)"
                    type="number"
                    min={8}
                    max={30}
                    value={editing.difficulty ?? 10}
                    onChange={(value) => update('difficulty', Number(value))}
                  />
                  <TextField
                    label="Duration (minutes)"
                    type="number"
                    min={1}
                    value={editing.durationMinutes ?? 60}
                    onChange={(value) => update('durationMinutes', Number(value))}
                  />
                  {editing.kind === 'JOB' && (
                    <TextField
                      label="Job cadence (hours)"
                      type="number"
                      min={1}
                      value={cadenceHours}
                      onChange={(value) => setCadenceHours(Number(value))}
                    />
                  )}
                  <TextField
                    label="Description"
                    span={2}
                    textarea
                    rows={4}
                    value={editing.description ?? ''}
                    onChange={(value) => update('description', value)}
                  />
                  <TextField
                    label="Accepted detail"
                    span={2}
                    textarea
                    rows={4}
                    value={editing.acceptedDescription ?? ''}
                    onChange={(value) => update('acceptedDescription', value)}
                  />
                </div>
              </section>

              <section className="rounded border border-heliora-border/70 bg-heliora-dark/40 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-heliora-cyan">
                  Active Narrative Timeline
                </h3>
                <p className="mb-3 text-[11px] text-heliora-text-dim">
                  Timeline entries unlock on the active dashboard after acceptance. Use
                  `description` for universal beats and `successDescription` or
                  `failureDescription` for the branch that matches the pre-rolled outcome.
                </p>
                <JsonField
                  label="Timeline events"
                  value={timelineEvents}
                  onChange={(value) => update('timelineEvents', Array.isArray(value) ? value : [])}
                  example='[{"minute":4,"description":"A courier pauses under a dead streetlight."},{"minute":9,"successDescription":"Following the courier leads you to a sealed service hatch.","failureDescription":"The courier disappears into a false wall before you can close in."}]'
                  rows={7}
                />
              </section>

              <section className="rounded border border-heliora-border/70 bg-heliora-dark/40 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-heliora-cyan">
                  Availability + World Hooks
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                      Starts available
                    </label>
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                      value={formatDateInput(editing.startsAvailableAt)}
                      onChange={(event) => setAvailability('startsAvailableAt', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                      Ends available
                    </label>
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                      value={formatDateInput(editing.endsAvailableAt)}
                      onChange={(event) => setAvailability('endsAvailableAt', event.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-4 rounded border border-heliora-border/70 bg-heliora-dark p-3">
                  <div className="mb-2 text-xs uppercase tracking-wider text-heliora-text-dim">
                    Linked world events
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {worldEvents.map((event) => (
                      <label
                        key={event.id}
                        className="flex items-start gap-2 rounded border border-heliora-border/60 px-3 py-2 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={linkedEventIds.includes(event.id)}
                          onChange={() => toggleEventLink(event.id)}
                        />
                        <span>
                          <span className="block font-mono text-heliora-cyan">{event.title}</span>
                          <span className="text-heliora-text-dim">{event.scope}</span>
                        </span>
                      </label>
                    ))}
                    {worldEvents.length === 0 && (
                      <p className="text-xs text-heliora-text-dim">
                        No world events available yet.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {editing.kind === 'QUEST' && (
                <section className="rounded border border-heliora-border/70 bg-heliora-dark/40 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-heliora-cyan">
                      Quest Flow
                    </h3>
                    <button
                      type="button"
                      onClick={() => updateQuestData(questData ?? { objectives: [] })}
                      className="rounded border border-heliora-cyan/40 px-3 py-1 text-[11px] text-heliora-cyan hover:bg-heliora-cyan/10"
                    >
                      {questData ? 'QUEST METADATA READY' : 'INITIALIZE QUEST DATA'}
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <TextField
                      label="Chain ID"
                      value={questData?.chainId ?? ''}
                      onChange={(value) =>
                        updateQuestData({ ...(questData ?? {}), chainId: value, objectives })
                      }
                    />
                    <TextField
                      label="Step Number"
                      type="number"
                      min={1}
                      value={questData?.stepNumber ?? 1}
                      onChange={(value) =>
                        updateQuestData({
                          ...(questData ?? {}),
                          stepNumber: Number(value),
                          objectives,
                        })
                      }
                    />
                    <TextField
                      label="Total Steps"
                      type="number"
                      min={1}
                      value={questData?.totalSteps ?? 1}
                      onChange={(value) =>
                        updateQuestData({
                          ...(questData ?? {}),
                          totalSteps: Number(value),
                          objectives,
                        })
                      }
                    />
                    <div className="rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(questData?.isOneOff)}
                          onChange={(event) =>
                            updateQuestData({
                              ...(questData ?? {}),
                              isOneOff: event.target.checked,
                              objectives,
                            })
                          }
                        />
                        One-off quest step
                      </label>
                    </div>
                    <TextField
                      label="Writer / player hint"
                      span={2}
                      textarea
                      rows={3}
                      value={questData?.hint ?? ''}
                      onChange={(value) =>
                        updateQuestData({ ...(questData ?? {}), hint: value, objectives })
                      }
                    />
                  </div>
                  <div className="mt-4 rounded border border-heliora-border/70 bg-heliora-dark p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-heliora-text-dim">
                          Objectives
                        </div>
                        <p className="mt-1 text-[11px] text-heliora-text-dim">
                          Canonical objective builder for quest steps. Stored as JSON, edited as forms.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addObjective}
                        className="rounded border border-heliora-cyan/40 px-3 py-1 text-[11px] text-heliora-cyan hover:bg-heliora-cyan/10"
                      >
                        + ADD OBJECTIVE
                      </button>
                    </div>
                    <div className="space-y-3">
                      {objectives.map((objective, index) => (
                        <div key={`objective-${index}`} className="rounded border border-heliora-border/60 p-3">
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            <div>
                              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                Objective type
                              </label>
                              <select
                                className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                value={String(objective.type ?? 'CUSTOM')}
                                onChange={(event) =>
                                  patchObjective(
                                    index,
                                    createObjective(
                                      event.target.value as (typeof OBJECTIVE_TYPES)[number],
                                    ),
                                  )
                                }
                              >
                                {OBJECTIVE_TYPES.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {(objective.type === 'COMPLETE_GIG_ON_PLANET' ||
                              objective.type === 'COMPLETE_QUEST') && (
                              <TextField
                                label="Count"
                                type="number"
                                min={1}
                                value={Number(objective.count ?? 1)}
                                onChange={(value) => patchObjective(index, { count: Number(value) })}
                              />
                            )}
                            {objective.type === 'COMPLETE_GIG_ON_PLANET' && (
                              <div>
                                <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                  Planet target
                                </label>
                                <select
                                  className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                  value={String(objective.planetId ?? '')}
                                  onChange={(event) =>
                                    patchObjective(index, { planetId: event.target.value })
                                  }
                                >
                                  <option value="">Select a planet</option>
                                  {planets.map((planet) => (
                                    <option key={planet.id} value={planet.id}>
                                      {planet.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {objective.type === 'COMPLETE_QUEST' && (
                              <div>
                                <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                  Quest target
                                </label>
                                <select
                                  className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                  value={String(objective.opportunityId ?? '')}
                                  onChange={(event) =>
                                    patchObjective(index, { opportunityId: event.target.value })
                                  }
                                >
                                  <option value="">Select a quest</option>
                                  {questOptions.map((quest) => (
                                    <option key={quest.id} value={quest.id}>
                                      {quest.title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {objective.type === 'VISIT_DISTRICT' && (
                              <TextField
                                label="District ID"
                                value={String(objective.districtId ?? '')}
                                onChange={(value) => patchObjective(index, { districtId: value })}
                              />
                            )}
                            {objective.type === 'OBTAIN_ITEM' && (
                              <div>
                                <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                  Item target
                                </label>
                                <select
                                  className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                  value={String(objective.itemDefinitionId ?? '')}
                                  onChange={(event) =>
                                    patchObjective(index, { itemDefinitionId: event.target.value })
                                  }
                                >
                                  <option value="">Select an item</option>
                                  {itemDefinitions.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {objective.type === 'REACH_FACTION_STANDING' && (
                              <>
                                <div>
                                  <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                    Faction target
                                  </label>
                                  <select
                                    className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                    value={String(objective.factionId ?? '')}
                                    onChange={(event) =>
                                      patchObjective(index, { factionId: event.target.value })
                                    }
                                  >
                                    <option value="">Select a faction</option>
                                    {factions.map((faction) => (
                                      <option key={faction.id} value={faction.id}>
                                        {faction.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <TextField
                                  label="Standing target"
                                  type="number"
                                  value={Number(objective.value ?? 10)}
                                  onChange={(value) => patchObjective(index, { value: Number(value) })}
                                />
                              </>
                            )}
                            <TextField
                              label="Objective notes"
                              span={2}
                              textarea
                              rows={2}
                              value={String(objective.description ?? '')}
                              onChange={(value) => patchObjective(index, { description: value })}
                            />
                          </div>
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeObjective(index)}
                              className="rounded border border-heliora-red/40 px-3 py-1 text-[11px] text-heliora-red hover:bg-heliora-red/10"
                            >
                              REMOVE OBJECTIVE
                            </button>
                          </div>
                        </div>
                      ))}
                      {objectives.length === 0 && (
                        <p className="text-xs text-heliora-text-dim">
                          No objectives yet. Add one to give writers and QA a structured quest step.
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              )}

              <section className="rounded border border-heliora-border/70 bg-heliora-dark/40 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-heliora-cyan">
                      Requirements
                    </h3>
                    <p className="mt-1 text-[11px] text-heliora-text-dim">
                      Build rules visually instead of hand-editing JSON.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addRequirement}
                    className="rounded border border-heliora-cyan/40 px-3 py-1 text-[11px] text-heliora-cyan hover:bg-heliora-cyan/10"
                  >
                    + ADD REQUIREMENT
                  </button>
                </div>
                <div className="space-y-3">
                  {requirements.map((requirement, index) => (
                    <div key={`requirement-${index}`} className="rounded border border-heliora-border/60 p-3">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                            Requirement type
                          </label>
                          <select
                            className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                            value={String(requirement.type ?? 'STAT_MIN')}
                            onChange={(event) =>
                              patchRequirement(
                                index,
                                createRequirement(
                                  event.target.value as (typeof REQUIREMENT_TYPES)[number],
                                ),
                              )
                            }
                          >
                            {REQUIREMENT_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>
                        {(requirement.type === 'STAT_MIN' || requirement.type === 'STAT_MAX') && (
                          <>
                            <div>
                              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                Stat
                              </label>
                              <select
                                className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                value={String(requirement.key ?? 'hacking')}
                                onChange={(event) => patchRequirement(index, { key: event.target.value })}
                              >
                                {STAT_KEYS.map((key) => (
                                  <option key={key} value={key}>
                                    {key}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <TextField
                              label="Value"
                              type="number"
                              value={Number(requirement.value ?? 5)}
                              onChange={(value) => patchRequirement(index, { value: Number(value) })}
                            />
                          </>
                        )}
                        {requirement.type === 'CREDITS_MIN' && (
                          <TextField
                            label="Credits"
                            type="number"
                            value={Number(requirement.value ?? 100)}
                            onChange={(value) => patchRequirement(index, { value: Number(value) })}
                          />
                        )}
                        {(requirement.type === 'FACTION_REPUTATION_MIN' ||
                          requirement.type === 'FACTION_REPUTATION_MAX') && (
                          <>
                            <div>
                              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                Faction
                              </label>
                              <select
                                className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                value={String(requirement.id ?? '')}
                                onChange={(event) => patchRequirement(index, { id: event.target.value })}
                              >
                                <option value="">Select faction</option>
                                {factions.map((faction) => (
                                  <option key={faction.id} value={faction.id}>
                                    {faction.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <TextField
                              label="Standing"
                              type="number"
                              value={Number(requirement.value ?? 5)}
                              onChange={(value) => patchRequirement(index, { value: Number(value) })}
                            />
                          </>
                        )}
                        {(requirement.type === 'CORPORATION_REPUTATION_MIN' ||
                          requirement.type === 'CORPORATION_REPUTATION_MAX') && (
                          <>
                            <div>
                              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                Corporation
                              </label>
                              <select
                                className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                value={String(requirement.id ?? '')}
                                onChange={(event) => patchRequirement(index, { id: event.target.value })}
                              >
                                <option value="">Select corporation</option>
                                {corporations.map((corporation) => (
                                  <option key={corporation.id} value={corporation.id}>
                                    {corporation.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <TextField
                              label="Standing"
                              type="number"
                              value={Number(requirement.value ?? 5)}
                              onChange={(value) => patchRequirement(index, { value: Number(value) })}
                            />
                          </>
                        )}
                        {(requirement.type === 'RELATIONSHIP_MIN' ||
                          requirement.type === 'RELATIONSHIP_MAX') && (
                          <>
                            <div>
                              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                Scope
                              </label>
                              <select
                                className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                value={String(requirement.scope ?? 'FACTION')}
                                onChange={(event) =>
                                  patchRequirement(index, {
                                    scope: event.target.value,
                                    id:
                                      event.target.value === 'FACTION'
                                        ? factions[0]?.id ?? ''
                                        : corporations[0]?.id ?? '',
                                  })
                                }
                              >
                                <option value="FACTION">Faction</option>
                                <option value="CORPORATION">Corporation</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                Target
                              </label>
                              <select
                                className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                value={String(requirement.id ?? '')}
                                onChange={(event) => patchRequirement(index, { id: event.target.value })}
                              >
                                <option value="">Select relationship target</option>
                                {(requirement.scope === 'CORPORATION'
                                  ? corporations.map((entry) => ({ id: entry.id, name: entry.name }))
                                  : factions.map((entry) => ({ id: entry.id, name: entry.name }))
                                ).map((entry) => (
                                  <option key={entry.id} value={entry.id}>
                                    {entry.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <TextField
                              label="Standing"
                              type="number"
                              value={Number(requirement.value ?? 5)}
                              onChange={(value) => patchRequirement(index, { value: Number(value) })}
                            />
                          </>
                        )}
                        {requirement.type === 'ITEM_REQUIRED' && (
                          <div>
                            <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                              Item
                            </label>
                            <select
                              className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                              value={String(requirement.id ?? '')}
                              onChange={(event) => patchRequirement(index, { id: event.target.value })}
                            >
                              <option value="">Select item</option>
                              {itemDefinitions.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {requirement.type === 'QUEST_COMPLETED' && (
                          <div>
                            <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                              Quest
                            </label>
                            <select
                              className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                              value={String(requirement.id ?? '')}
                              onChange={(event) => patchRequirement(index, { id: event.target.value })}
                            >
                              <option value="">Select quest</option>
                              {questOptions.map((quest) => (
                                <option key={quest.id} value={quest.id}>
                                  {quest.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {requirement.type === 'DISTRICT_ACCESS' && (
                          <TextField
                            label="District ID"
                            value={String(requirement.id ?? '')}
                            onChange={(value) => patchRequirement(index, { id: value })}
                          />
                        )}
                        {requirement.type === 'PLANET_ACCESS' && (
                          <div>
                            <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                              Planet
                            </label>
                            <select
                              className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                              value={String(requirement.id ?? '')}
                              onChange={(event) => patchRequirement(index, { id: event.target.value })}
                            >
                              <option value="">Select planet</option>
                              {planets.map((planet) => (
                                <option key={planet.id} value={planet.id}>
                                  {planet.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {requirement.type === 'RANK_REQUIRED' && (
                          <>
                            <div>
                              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                Faction
                              </label>
                              <select
                                className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                value={String(requirement.id ?? '')}
                                onChange={(event) => patchRequirement(index, { id: event.target.value })}
                              >
                                <option value="">Select faction</option>
                                {factions.map((faction) => (
                                  <option key={faction.id} value={faction.id}>
                                    {faction.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <TextField
                              label="Rank name"
                              value={String(requirement.name ?? '')}
                              onChange={(value) => patchRequirement(index, { name: value })}
                            />
                          </>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-heliora-border/60 pt-3">
                        <p className="text-xs text-heliora-text-dim">{describeRequirement(requirement)}</p>
                        <button
                          type="button"
                          onClick={() => removeRequirement(index)}
                          className="rounded border border-heliora-red/40 px-3 py-1 text-[11px] text-heliora-red hover:bg-heliora-red/10"
                        >
                          REMOVE
                        </button>
                      </div>
                    </div>
                  ))}
                  {requirements.length === 0 && (
                    <p className="text-xs text-heliora-text-dim">
                      No requirements yet. Leave empty for universally available content.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded border border-heliora-border/70 bg-heliora-dark/40 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-heliora-cyan">
                      Rewards
                    </h3>
                    <p className="mt-1 text-[11px] text-heliora-text-dim">
                      Use name-based pickers for standing, items, buildings, quests, and stock rewards.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addReward}
                    className="rounded border border-heliora-cyan/40 px-3 py-1 text-[11px] text-heliora-cyan hover:bg-heliora-cyan/10"
                  >
                    + ADD REWARD
                  </button>
                </div>
                <div className="space-y-3">
                  {rewards.map((reward, index) => (
                    <div key={`reward-${index}`} className="rounded border border-heliora-border/60 p-3">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                            Reward type
                          </label>
                          <select
                            className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                            value={String(reward.type ?? 'CREDITS')}
                            onChange={(event) =>
                              patchReward(
                                index,
                                createReward(event.target.value as (typeof REWARD_TYPES)[number]),
                              )
                            }
                          >
                            {REWARD_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>
                        {(reward.type === 'CREDITS' || reward.type === 'STAT_XP') && (
                          <TextField
                            label="Value"
                            type="number"
                            value={Number(reward.value ?? 100)}
                            onChange={(value) => patchReward(index, { value: Number(value) })}
                          />
                        )}
                        {reward.type === 'STAT_XP' && (
                          <div>
                            <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                              Stat
                            </label>
                            <select
                              className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                              value={String(reward.key ?? 'hacking')}
                              onChange={(event) => patchReward(index, { key: event.target.value })}
                            >
                              {STAT_KEYS.filter((key) => !['health', 'energy', 'wantedLevel'].includes(key)).map((key) => (
                                <option key={key} value={key}>
                                  {key}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {reward.type === 'ITEM' && (
                          <div>
                            <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                              Item
                            </label>
                            <select
                              className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                              value={String(reward.itemDefinitionId ?? '')}
                              onChange={(event) =>
                                patchReward(index, { itemDefinitionId: event.target.value })
                              }
                            >
                              <option value="">Select item</option>
                              {itemDefinitions.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {reward.type === 'FACTION_REPUTATION' && (
                          <>
                            <div>
                              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                Faction
                              </label>
                              <select
                                className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                value={String(reward.factionId ?? '')}
                                onChange={(event) => patchReward(index, { factionId: event.target.value })}
                              >
                                <option value="">Select faction</option>
                                {factions.map((faction) => (
                                  <option key={faction.id} value={faction.id}>
                                    {faction.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <TextField
                              label="Standing delta"
                              type="number"
                              value={Number(reward.value ?? 5)}
                              onChange={(value) => patchReward(index, { value: Number(value) })}
                            />
                          </>
                        )}
                        {reward.type === 'CORPORATION_REPUTATION' && (
                          <>
                            <div>
                              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                Corporation
                              </label>
                              <select
                                className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                value={String(reward.corporationId ?? '')}
                                onChange={(event) =>
                                  patchReward(index, { corporationId: event.target.value })
                                }
                              >
                                <option value="">Select corporation</option>
                                {corporations.map((corporation) => (
                                  <option key={corporation.id} value={corporation.id}>
                                    {corporation.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <TextField
                              label="Standing delta"
                              type="number"
                              value={Number(reward.value ?? 5)}
                              onChange={(value) => patchReward(index, { value: Number(value) })}
                            />
                          </>
                        )}
                        {reward.type === 'UNLOCK_BUILDING' && (
                          <div>
                            <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                              Building
                            </label>
                            <select
                              className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                              value={String(reward.buildingId ?? '')}
                              onChange={(event) => patchReward(index, { buildingId: event.target.value })}
                            >
                              <option value="">Select building</option>
                              {buildings.map((building) => (
                                <option key={building.id} value={building.id}>
                                  {building.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {reward.type === 'UNLOCK_QUEST' && (
                          <div>
                            <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                              Quest
                            </label>
                            <select
                              className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                              value={String(reward.questId ?? '')}
                              onChange={(event) => patchReward(index, { questId: event.target.value })}
                            >
                              <option value="">Select quest</option>
                              {questOptions.map((quest) => (
                                <option key={quest.id} value={quest.id}>
                                  {quest.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {reward.type === 'STOCK_SHARES' && (
                          <>
                            <div>
                              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                Corporation
                              </label>
                              <select
                                className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                value={String(reward.corporationId ?? '')}
                                onChange={(event) =>
                                  patchReward(index, { corporationId: event.target.value })
                                }
                              >
                                <option value="">Select corporation</option>
                                {corporations.map((corporation) => (
                                  <option key={corporation.id} value={corporation.id}>
                                    {corporation.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <TextField
                              label="Share count"
                              type="number"
                              value={Number(reward.value ?? 10)}
                              onChange={(value) => patchReward(index, { value: Number(value) })}
                            />
                          </>
                        )}
                        {reward.type === 'CHARACTER_RELATIONSHIP' && (
                          <>
                            <TextField
                              label="Character ID"
                              value={String(reward.characterId ?? '')}
                              onChange={(value) => patchReward(index, { characterId: value })}
                            />
                            <TextField
                              label="Relationship delta"
                              type="number"
                              value={Number(reward.value ?? 5)}
                              onChange={(value) => patchReward(index, { value: Number(value) })}
                            />
                          </>
                        )}
                        {reward.type === 'RANK_UP' && (
                          <>
                            <div>
                              <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                Faction
                              </label>
                              <select
                                className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                value={String(reward.factionId ?? '')}
                                onChange={(event) => patchReward(index, { factionId: event.target.value })}
                              >
                                <option value="">Select faction</option>
                                {factions.map((faction) => (
                                  <option key={faction.id} value={faction.id}>
                                    {faction.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <TextField
                              label="New rank"
                              value={String(reward.key ?? '')}
                              onChange={(value) => patchReward(index, { key: value })}
                            />
                          </>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-heliora-border/60 pt-3">
                        <p className="text-xs text-heliora-text-dim">{describeReward(reward)}</p>
                        <button
                          type="button"
                          onClick={() => removeReward(index)}
                          className="rounded border border-heliora-red/40 px-3 py-1 text-[11px] text-heliora-red hover:bg-heliora-red/10"
                        >
                          REMOVE
                        </button>
                      </div>
                    </div>
                  ))}
                  {rewards.length === 0 && (
                    <p className="text-xs text-heliora-text-dim">
                      No rewards yet. Use credits or items for a quick prototype.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded border border-heliora-border/70 bg-heliora-dark/40 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-heliora-cyan">
                      Risks
                    </h3>
                    <p className="mt-1 text-[11px] text-heliora-text-dim">
                      Define risk tiers, trigger chance, and fallout without editing nested JSON.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addRisk}
                    className="rounded border border-heliora-cyan/40 px-3 py-1 text-[11px] text-heliora-cyan hover:bg-heliora-cyan/10"
                  >
                    + ADD RISK
                  </button>
                </div>
                <div className="space-y-3">
                  {risks.map((risk, index) => {
                    const consequences = Array.isArray(risk.consequences)
                      ? (risk.consequences as StructuredConsequence[])
                      : [];
                    return (
                      <div key={`risk-${index}`} className="rounded border border-heliora-border/60 p-3">
                        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                          <div>
                            <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                              Risk level
                            </label>
                            <select
                              className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                              value={String(risk.level ?? 'LOW')}
                              onChange={(event) => patchRisk(index, { level: event.target.value })}
                            >
                              {RISK_LEVELS.map((level) => (
                                <option key={level} value={level}>
                                  {level}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                              Risk type
                            </label>
                            <select
                              className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                              value={String(risk.type ?? 'LEGAL')}
                              onChange={(event) => patchRisk(index, { type: event.target.value })}
                            >
                              {RISK_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </div>
                          <TextField
                            label="Probability (0-1)"
                            type="number"
                            min={0}
                            max={1}
                            step={0.05}
                            value={Number(risk.probability ?? 0.25)}
                            onChange={(value) => patchRisk(index, { probability: Number(value) })}
                          />
                        </div>
                        <div className="mt-4 rounded border border-heliora-border/70 bg-heliora-dark p-3">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="text-xs uppercase tracking-wider text-heliora-text-dim">
                              Consequences
                            </div>
                            <button
                              type="button"
                              onClick={() => addConsequence(index)}
                              className="rounded border border-heliora-cyan/40 px-3 py-1 text-[11px] text-heliora-cyan hover:bg-heliora-cyan/10"
                            >
                              + ADD CONSEQUENCE
                            </button>
                          </div>
                          <div className="space-y-3">
                            {consequences.map((consequence, consequenceIndex) => (
                              <div
                                key={`consequence-${index}-${consequenceIndex}`}
                                className="rounded border border-heliora-border/60 p-3"
                              >
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                  <div>
                                    <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                      Consequence type
                                    </label>
                                    <select
                                      className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                      value={String(consequence.type ?? 'MODIFY_WANTED_LEVEL')}
                                      onChange={(event) =>
                                        patchConsequence(
                                          index,
                                          consequenceIndex,
                                          createConsequence(
                                            event.target.value as (typeof CONSEQUENCE_TYPES)[number],
                                          ),
                                        )
                                      }
                                    >
                                      {CONSEQUENCE_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                          {type}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  {consequence.type === 'MODIFY_STAT' && (
                                    <>
                                      <div>
                                        <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                          Stat
                                        </label>
                                        <select
                                          className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                          value={String(consequence.key ?? 'health')}
                                          onChange={(event) =>
                                            patchConsequence(index, consequenceIndex, {
                                              key: event.target.value,
                                            })
                                          }
                                        >
                                          {['health', 'energy', 'wantedLevel'].map((key) => (
                                            <option key={key} value={key}>
                                              {key}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <TextField
                                        label="Delta"
                                        type="number"
                                        value={Number(consequence.value ?? -10)}
                                        onChange={(value) =>
                                          patchConsequence(index, consequenceIndex, {
                                            value: Number(value),
                                          })
                                        }
                                      />
                                    </>
                                  )}
                                  {(consequence.type === 'MODIFY_CREDITS' ||
                                    consequence.type === 'MODIFY_WANTED_LEVEL') && (
                                    <TextField
                                      label="Delta"
                                      type="number"
                                      value={Number(consequence.value ?? 1)}
                                      onChange={(value) =>
                                        patchConsequence(index, consequenceIndex, {
                                          value: Number(value),
                                        })
                                      }
                                    />
                                  )}
                                  {consequence.type === 'MODIFY_FACTION_REPUTATION' && (
                                    <>
                                      <div>
                                        <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                          Faction
                                        </label>
                                        <select
                                          className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                          value={String(consequence.factionId ?? '')}
                                          onChange={(event) =>
                                            patchConsequence(index, consequenceIndex, {
                                              factionId: event.target.value,
                                            })
                                          }
                                        >
                                          <option value="">Select faction</option>
                                          {factions.map((faction) => (
                                            <option key={faction.id} value={faction.id}>
                                              {faction.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <TextField
                                        label="Standing delta"
                                        type="number"
                                        value={Number(consequence.value ?? -5)}
                                        onChange={(value) =>
                                          patchConsequence(index, consequenceIndex, {
                                            value: Number(value),
                                          })
                                        }
                                      />
                                    </>
                                  )}
                                  {consequence.type === 'MODIFY_CORPORATION_REPUTATION' && (
                                    <>
                                      <div>
                                        <label className="text-xs uppercase tracking-wider text-heliora-text-dim">
                                          Corporation
                                        </label>
                                        <select
                                          className="mt-1 w-full rounded border border-heliora-border bg-heliora-dark px-3 py-2 text-sm font-mono text-heliora-cyan"
                                          value={String(consequence.corporationId ?? '')}
                                          onChange={(event) =>
                                            patchConsequence(index, consequenceIndex, {
                                              corporationId: event.target.value,
                                            })
                                          }
                                        >
                                          <option value="">Select corporation</option>
                                          {corporations.map((corporation) => (
                                            <option key={corporation.id} value={corporation.id}>
                                              {corporation.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <TextField
                                        label="Standing delta"
                                        type="number"
                                        value={Number(consequence.value ?? -5)}
                                        onChange={(value) =>
                                          patchConsequence(index, consequenceIndex, {
                                            value: Number(value),
                                          })
                                        }
                                      />
                                    </>
                                  )}
                                </div>
                                <div className="mt-3 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => removeConsequence(index, consequenceIndex)}
                                    className="rounded border border-heliora-red/40 px-3 py-1 text-[11px] text-heliora-red hover:bg-heliora-red/10"
                                  >
                                    REMOVE CONSEQUENCE
                                  </button>
                                </div>
                              </div>
                            ))}
                            {consequences.length === 0 && (
                              <p className="text-xs text-heliora-text-dim">
                                No consequences yet. Add one to define the fallout if this risk triggers.
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-heliora-border/60 pt-3">
                          <p className="text-xs text-heliora-text-dim">{describeRisk(risk)}</p>
                          <button
                            type="button"
                            onClick={() => removeRisk(index)}
                            className="rounded border border-heliora-red/40 px-3 py-1 text-[11px] text-heliora-red hover:bg-heliora-red/10"
                          >
                            REMOVE RISK
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {risks.length === 0 && (
                    <p className="text-xs text-heliora-text-dim">
                      No risks yet. Leave blank for purely deterministic content.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <section className="rounded border border-heliora-border/70 bg-heliora-dark/40 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-heliora-cyan">
                  Authoring Snapshot
                </h3>
                <div className="mt-3 space-y-3 text-xs text-heliora-text-dim">
                  <div>
                    <div className="uppercase tracking-wider">Positioning</div>
                    <div className="mt-1 font-mono text-heliora-text">
                      {editing.kind} · {editing.type} · DC {editing.difficulty ?? 10}
                    </div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wider">Schedule</div>
                    <div className="mt-1">
                      {editing.startsAvailableAt
                        ? `Starts ${editing.startsAvailableAt}`
                        : 'Available immediately'}
                    </div>
                    <div>
                      {editing.endsAvailableAt
                        ? `Ends ${editing.endsAvailableAt}`
                        : 'No end window'}
                    </div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wider">Quest chain</div>
                    <div className="mt-1">
                      {editing.kind === 'QUEST'
                        ? `${questData?.chainId ?? 'No chain'} · step ${questData?.stepNumber ?? 1}/${questData?.totalSteps ?? 1}`
                        : 'Not a quest'}
                    </div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wider">Requirements</div>
                    <ul className="mt-1 space-y-1">
                      {requirements.slice(0, 4).map((requirement, index) => (
                        <li key={`summary-requirement-${index}`}>• {describeRequirement(requirement)}</li>
                      ))}
                      {requirements.length === 0 && <li>• None</li>}
                    </ul>
                  </div>
                  <div>
                    <div className="uppercase tracking-wider">Rewards</div>
                    <ul className="mt-1 space-y-1">
                      {rewards.slice(0, 4).map((reward, index) => (
                        <li key={`summary-reward-${index}`}>• {describeReward(reward)}</li>
                      ))}
                      {rewards.length === 0 && <li>• None</li>}
                    </ul>
                  </div>
                  <div>
                    <div className="uppercase tracking-wider">Linked events</div>
                    <ul className="mt-1 space-y-1">
                      {linkedEventIds.slice(0, 4).map((eventId) => (
                        <li key={eventId}>• {worldEvents.find((entry) => entry.id === eventId)?.title ?? eventId}</li>
                      ))}
                      {linkedEventIds.length === 0 && <li>• None</li>}
                    </ul>
                  </div>
                  <div>
                    <div className="uppercase tracking-wider">Timeline beats</div>
                    <div className="mt-1">{timelineEvents.length} authored beat(s)</div>
                  </div>
                </div>
              </section>
            </aside>
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
              <th className="py-2">DC</th>
              <th className="py-2">Chain / Window</th>
              <th className="py-2">Authoring Stats</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((opp) => (
              <tr key={opp.id} className="border-t border-heliora-border/60 hover:bg-black/20">
                <td className="py-2 font-mono">{opp.title}</td>
                <td className="py-2 text-heliora-yellow">{opp.kind}</td>
                <td className="py-2 text-heliora-text-dim">{opp.type}</td>
                <td className="py-2">{opp.difficulty}</td>
                <td className="py-2 text-xs text-heliora-text-dim">
                  {opp.kind === 'QUEST'
                    ? `${opp.questData?.chainId ?? 'standalone'} · ${opp.questData?.stepNumber ?? 1}/${opp.questData?.totalSteps ?? 1}`
                    : opp.startsAvailableAt || opp.endsAvailableAt
                      ? 'scheduled'
                      : 'always on'}
                </td>
                <td className="py-2 text-xs text-heliora-text-dim">
                  {opp.durationMinutes ?? '-'}m · {opp.requirements.length} req · {opp.rewards.length} rewards · {opp.risks.length} risks · {(opp.timelineEvents ?? []).length} beats
                </td>
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
            {filteredList.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-heliora-text-dim">
                  No matching opportunities yet. Create one above or widen your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
