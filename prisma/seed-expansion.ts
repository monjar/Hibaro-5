import { PrismaClient } from '@prisma/client';

/**
 * World content expansion: buildings, shops, gear, opportunities, quest
 * chains, and world events for the four planets beyond Antrolus. Idempotent —
 * everything upserts on stable ids/names, shop stock only seeds when a shop
 * is empty.
 */
export async function seedExpansion(prisma: PrismaClient) {
  // ---------- lookups (all seeded earlier in seed.ts) ----------
  const [teraluma, losPanko, pigeon95, valerina] = await Promise.all([
    prisma.planet.findUniqueOrThrow({ where: { name: 'Teraluma' } }),
    prisma.planet.findUniqueOrThrow({ where: { name: 'Los Panko' } }),
    prisma.planet.findUniqueOrThrow({ where: { name: 'Pigeon95' } }),
    prisma.planet.findUniqueOrThrow({ where: { name: 'Valerina' } }),
  ]);
  const [redMarket, coilUnion, civicAuthority, ghosts] = await Promise.all([
    prisma.faction.findUniqueOrThrow({ where: { name: 'Red Market' } }),
    prisma.faction.findUniqueOrThrow({ where: { name: 'Coil Union' } }),
    prisma.faction.findUniqueOrThrow({ where: { name: 'Glasswater Civic Authority' } }),
    prisma.faction.findUniqueOrThrow({ where: { name: 'Valerina Ghosts' } }),
  ]);
  const [pigeonCorp, sunspoke, blueOrchard] = await Promise.all([
    prisma.corporation.findUniqueOrThrow({ where: { name: 'Pigeon Corporation' } }),
    prisma.corporation.findUniqueOrThrow({ where: { name: 'SunSpoke Media' } }),
    prisma.corporation.findUniqueOrThrow({ where: { name: 'Blue Orchard Biotech' } }),
  ]);

  const districtIds = {
    glasswaterCentral: 'dist-teraluma-glasswater-central',
    greenbelt: 'dist-teraluma-greenbelt',
    neonKeys: 'dist-lospanko-neon-keys',
    crookedMarina: 'dist-lospanko-crooked-marina',
    fulfilmentCore: 'dist-pigeon95-fulfilment-core',
    workerStack12: 'dist-pigeon95-worker-stack-12',
    quietPerimeter: 'dist-valerina-quiet-perimeter',
    blacksiteMire: 'dist-valerina-blacksite-mire',
  };

  // ---------- buildings ----------
  type BuildingSeed = {
    id: string;
    districtId: string;
    name: string;
    description: string;
    functionality: string[];
    ownerType?: 'SYSTEM' | 'FACTION' | 'CORPORATION';
    ownerId?: string;
  };

  const buildings: BuildingSeed[] = [
    // Teraluma — Glasswater Central (high law, corporate polish)
    {
      id: 'bldg-teraluma-transit-spire',
      districtId: districtIds.glasswaterCentral,
      name: 'Glasswater Transit Spire',
      description: 'A gleaming interchange tower where shuttles dock in strict schedules.',
      functionality: ['HUB', 'DOCK'],
    },
    {
      id: 'bldg-teraluma-galleria',
      districtId: districtIds.glasswaterCentral,
      name: 'Galleria Provisions',
      description: 'A licensed retail promenade. Everything has a receipt and a warranty.',
      functionality: ['SHOP'],
    },
    {
      id: 'bldg-teraluma-sunspoke-tower',
      districtId: districtIds.glasswaterCentral,
      name: 'SunSpoke Media Tower',
      description: 'Broadcast studios and editorial floors that shape what Hibaro-5 believes.',
      functionality: ['OFFICE'],
      ownerType: 'CORPORATION',
      ownerId: sunspoke.id,
    },
    {
      id: 'bldg-teraluma-civic-clinic',
      districtId: districtIds.glasswaterCentral,
      name: 'Glasswater Civic Clinic',
      description: 'Publicly funded care with immaculate queues.',
      functionality: ['CLINIC'],
    },
    {
      id: 'bldg-teraluma-contracts-office',
      districtId: districtIds.glasswaterCentral,
      name: 'Civic Contracts Office',
      description: 'Sanctioned gigs and municipal contracts, stamped in triplicate.',
      functionality: ['MISSION_BOARD', 'OFFICE'],
    },
    // Teraluma — Greenbelt Residences
    {
      id: 'bldg-teraluma-verdant-lounge',
      districtId: districtIds.greenbelt,
      name: 'Verdant Lounge',
      description: 'A rooftop garden bar where off-duty bureaucrats trade gossip.',
      functionality: ['BAR'],
    },
    {
      id: 'bldg-teraluma-quiet-house',
      districtId: districtIds.greenbelt,
      name: 'Greenbelt Quiet House',
      description: 'A Coil Union guesthouse that asks no questions of tired operators.',
      functionality: ['SAFEHOUSE'],
      ownerType: 'FACTION',
      ownerId: coilUnion.id,
    },
    // Los Panko — Neon Keys
    {
      id: 'bldg-lospanko-neon-hub',
      districtId: districtIds.neonKeys,
      name: 'Neon Keys Transit Hub',
      description: 'A garish arrivals hall soaked in advertising holograms.',
      functionality: ['HUB', 'DOCK'],
    },
    {
      id: 'bldg-lospanko-pawnshop',
      districtId: districtIds.neonKeys,
      name: 'Keys Pawn & Provisions',
      description: 'Second-hand gear with first-hand stories. Prices negotiable, provenance not.',
      functionality: ['SHOP'],
    },
    {
      id: 'bldg-lospanko-velvet-static',
      districtId: districtIds.neonKeys,
      name: 'Velvet Static',
      description: 'The loudest bar on the port strip. Every faction keeps a booth here.',
      functionality: ['BAR'],
    },
    {
      id: 'bldg-lospanko-job-wall',
      districtId: districtIds.neonKeys,
      name: 'Portside Job Wall',
      description: 'A physical wall of flickering contracts, half of them legal.',
      functionality: ['MISSION_BOARD'],
    },
    // Los Panko — Crooked Marina
    {
      id: 'bldg-lospanko-smugglers-den',
      districtId: districtIds.crookedMarina,
      name: "Smuggler's Den",
      description: 'A floating black market strung between derelict barges.',
      functionality: ['BLACK_MARKET', 'SHOP'],
      ownerType: 'FACTION',
      ownerId: redMarket.id,
    },
    {
      id: 'bldg-lospanko-stitch-clinic',
      districtId: districtIds.crookedMarina,
      name: 'Dockside Stitch Clinic',
      description: 'Patch-up work for sailors, brawlers, and people who fell on knives.',
      functionality: ['CLINIC'],
    },
    {
      id: 'bldg-lospanko-bolt-hole',
      districtId: districtIds.crookedMarina,
      name: 'Marina Bolt-Hole',
      description: 'A Red Market hideout below the waterline. Smells like rust and safety.',
      functionality: ['SAFEHOUSE'],
      ownerType: 'FACTION',
      ownerId: redMarket.id,
    },
    // Pigeon95 — Fulfilment Core
    {
      id: 'bldg-pigeon95-gateway',
      districtId: districtIds.fulfilmentCore,
      name: 'Fulfilment Core Gateway',
      description: 'Freight elevators the size of city blocks. People ride them too, technically.',
      functionality: ['HUB', 'DOCK'],
    },
    {
      id: 'bldg-pigeon95-company-store',
      districtId: districtIds.fulfilmentCore,
      name: 'Pigeon Company Store',
      description: 'Everything a worker needs, priced to keep them working.',
      functionality: ['SHOP'],
      ownerType: 'CORPORATION',
      ownerId: pigeonCorp.id,
    },
    {
      id: 'bldg-pigeon95-hq',
      districtId: districtIds.fulfilmentCore,
      name: 'Pigeon Corporation HQ',
      description: 'The nerve center of Hibaro-5 logistics. Every manifest passes through here.',
      functionality: ['OFFICE'],
      ownerType: 'CORPORATION',
      ownerId: pigeonCorp.id,
    },
    {
      id: 'bldg-pigeon95-dispatch',
      districtId: districtIds.fulfilmentCore,
      name: 'Dispatch Terminal',
      description: 'Work orders scroll faster than anyone can read them.',
      functionality: ['MISSION_BOARD', 'OFFICE'],
    },
    // Pigeon95 — Worker Stack 12
    {
      id: 'bldg-pigeon95-canteen',
      districtId: districtIds.workerStack12,
      name: 'Stack Twelve Canteen',
      description: 'Bad coffee, honest talk, and the occasional union whisper.',
      functionality: ['BAR'],
    },
    {
      id: 'bldg-pigeon95-clinic-12',
      districtId: districtIds.workerStack12,
      name: 'Company Clinic 12',
      description: 'Keeps the workforce at minimum viable health.',
      functionality: ['CLINIC'],
    },
    {
      id: 'bldg-pigeon95-union-room',
      districtId: districtIds.workerStack12,
      name: 'Union Back Room',
      description: 'Officially a storage room. Unofficially the safest place on Pigeon95.',
      functionality: ['SAFEHOUSE'],
      ownerType: 'FACTION',
      ownerId: coilUnion.id,
    },
    // Valerina — Quiet Perimeter
    {
      id: 'bldg-valerina-landing',
      districtId: districtIds.quietPerimeter,
      name: 'Perimeter Landing Strip',
      description: 'A gravel strip and a windsock. Nobody logs your arrival.',
      functionality: ['HUB', 'DOCK'],
    },
    {
      id: 'bldg-valerina-outfitters',
      districtId: districtIds.quietPerimeter,
      name: 'Perimeter Outfitters',
      description: 'Rugged gear for people heading into the mire. Some of them come back.',
      functionality: ['SHOP'],
    },
    {
      id: 'bldg-valerina-listening-post',
      districtId: districtIds.quietPerimeter,
      name: 'Ghost Listening Post',
      description: 'Antenna farms humming with intercepted corporate traffic.',
      functionality: ['MISSION_BOARD'],
      ownerType: 'FACTION',
      ownerId: ghosts.id,
    },
    // Valerina — Blacksite Mire
    {
      id: 'bldg-valerina-orchard-lab',
      districtId: districtIds.blacksiteMire,
      name: 'Blue Orchard Field Lab',
      description: 'A sealed biotech compound. The air filters run day and night.',
      functionality: ['OFFICE', 'CLINIC'],
      ownerType: 'CORPORATION',
      ownerId: blueOrchard.id,
    },
    {
      id: 'bldg-valerina-mire-exchange',
      districtId: districtIds.blacksiteMire,
      name: 'Mire Exchange',
      description: 'The Ghosts trade in things that officially do not exist.',
      functionality: ['BLACK_MARKET', 'SHOP'],
      ownerType: 'FACTION',
      ownerId: ghosts.id,
    },
    {
      id: 'bldg-valerina-ghost-refuge',
      districtId: districtIds.blacksiteMire,
      name: 'Ghost Refuge',
      description: 'Deep shelter for those the corporations would rather forget.',
      functionality: ['SAFEHOUSE'],
      ownerType: 'FACTION',
      ownerId: ghosts.id,
    },
  ];

  for (const building of buildings) {
    await prisma.building.upsert({
      where: { id: building.id },
      update: {},
      create: {
        id: building.id,
        districtId: building.districtId,
        name: building.name,
        description: building.description,
        ownerType: building.ownerType ?? 'SYSTEM',
        ownerId: building.ownerId ?? null,
        functionality: building.functionality,
        status: 'OPEN',
      },
    });
  }
  console.log(`✅ Expansion buildings: ${buildings.length} across 4 planets`);

  // ---------- item definitions ----------
  type ItemSeed = {
    name: string;
    description: string;
    category: 'WEAPON' | 'CLOTHING' | 'TOOL' | 'VEHICLE' | 'CONSUMABLE' | 'MATERIAL';
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'ILLEGAL';
    baseValue: number;
    weight: number;
    effects?: unknown;
    weaponData?: unknown;
    clothingData?: unknown;
    toolData?: unknown;
    vehicleData?: unknown;
  };

  const items: ItemSeed[] = [
    {
      name: 'Shock Baton',
      description: 'Standard security-issue baton. Convincing at short range.',
      category: 'WEAPON',
      rarity: 'COMMON',
      baseValue: 90,
      weight: 1.0,
      weaponData: { damage: 6, range: 'MELEE', statBonuses: { combat: 1, strength: 1 } },
    },
    {
      name: 'Kinetic Bandit Carbine',
      description: 'A marina-workshop carbine favored by dockside enforcers.',
      category: 'WEAPON',
      rarity: 'UNCOMMON',
      baseValue: 260,
      weight: 2.4,
      weaponData: { damage: 12, range: 'MEDIUM', statBonuses: { combat: 2 } },
    },
    {
      name: 'Ghostmaker Railpistol',
      description: 'A whisper-quiet railpistol that officially was never manufactured.',
      category: 'WEAPON',
      rarity: 'RARE',
      baseValue: 900,
      weight: 1.1,
      weaponData: { damage: 18, range: 'MEDIUM', statBonuses: { combat: 3, stealth: 1 } },
    },
    {
      name: 'Courier Windbreaker',
      description: 'Cut for movement. Pigeon couriers swear by it.',
      category: 'CLOTHING',
      rarity: 'COMMON',
      baseValue: 60,
      weight: 0.6,
      clothingData: { armor: 1, slot: 'TORSO', statBonuses: { agility: 1 } },
    },
    {
      name: 'Corporate Sleek Suit',
      description: 'Opens doors on Teraluma that credentials cannot.',
      category: 'CLOTHING',
      rarity: 'UNCOMMON',
      baseValue: 240,
      weight: 1.0,
      clothingData: { armor: 1, slot: 'TORSO', statBonuses: { charisma: 2 } },
    },
    {
      name: 'Plated Work Harness',
      description: 'Industrial exo-harness that shares the load.',
      category: 'CLOTHING',
      rarity: 'UNCOMMON',
      baseValue: 200,
      weight: 3.5,
      clothingData: { armor: 3, slot: 'TORSO', statBonuses: { strength: 2 } },
    },
    {
      name: 'Mire Ghillie Wrap',
      description: 'Adaptive camouflage grown from Valerina moss cultures.',
      category: 'CLOTHING',
      rarity: 'RARE',
      baseValue: 700,
      weight: 1.8,
      clothingData: { armor: 1, slot: 'TORSO', statBonuses: { stealth: 3 } },
    },
    {
      name: 'Mid-grade Hacking Deck',
      description: 'A serious intrusion rig with real ICE-breaking headroom.',
      category: 'TOOL',
      rarity: 'UNCOMMON',
      baseValue: 320,
      weight: 0.8,
      toolData: { tier: 2, statBonuses: { hacking: 3 } },
    },
    {
      name: 'Orchard Med-Scanner',
      description: 'Blue Orchard diagnostic tech. Reads bodies like manifests.',
      category: 'TOOL',
      rarity: 'UNCOMMON',
      baseValue: 280,
      weight: 0.9,
      toolData: { tier: 2, statBonuses: { intelligence: 2 } },
    },
    {
      name: 'Forged Manifest Kit',
      description: 'Blank seals, corporate letterheads, and a very good printer.',
      category: 'TOOL',
      rarity: 'RARE',
      baseValue: 650,
      weight: 1.2,
      toolData: { tier: 3, statBonuses: { stealth: 2, charisma: 1 } },
    },
    {
      name: 'Rustbucket Hoverboard',
      description: 'It rattles, it sparks, it gets you there faster.',
      category: 'VEHICLE',
      rarity: 'COMMON',
      baseValue: 150,
      weight: 4.0,
      vehicleData: { speed: 2, statBonuses: { agility: 1 } },
    },
    {
      name: 'Marina Skiff',
      description: 'A nimble waterline runner tuned for the Crooked Marina channels.',
      category: 'VEHICLE',
      rarity: 'UNCOMMON',
      baseValue: 420,
      weight: 40,
      vehicleData: { speed: 4, statBonuses: { agility: 2 } },
    },
    {
      name: 'Stim Shot',
      description: 'A single-use stimulant injector. Restores 40 energy.',
      category: 'CONSUMABLE',
      rarity: 'COMMON',
      baseValue: 60,
      weight: 0.1,
      effects: [{ type: 'MODIFY_STAT', key: 'energy', value: 40 }],
    },
    {
      name: 'Combat Cocktail',
      description: 'Battlefield trauma foam and painkillers. Restores 50 health.',
      category: 'CONSUMABLE',
      rarity: 'UNCOMMON',
      baseValue: 80,
      weight: 0.2,
      effects: [{ type: 'MODIFY_STAT', key: 'health', value: 50 }],
    },
    {
      name: 'Clean Slate Chip',
      description: 'One call to the right clerk and a warrant quietly evaporates. Reduces wanted level by 1.',
      category: 'CONSUMABLE',
      rarity: 'ILLEGAL',
      baseValue: 300,
      weight: 0.05,
      effects: [{ type: 'MODIFY_STAT', key: 'wantedLevel', value: -1 }],
    },
    {
      name: 'Orchard Bio-Sample',
      description: 'A sealed vial from the Blacksite Mire. Worth a fortune to the right buyer.',
      category: 'MATERIAL',
      rarity: 'RARE',
      baseValue: 220,
      weight: 0.3,
    },
    {
      name: 'Scrap Alloy',
      description: 'Salvaged structural alloy. Crafters and fences both take it.',
      category: 'MATERIAL',
      rarity: 'COMMON',
      baseValue: 12,
      weight: 1.5,
    },
  ];

  const itemIds = new Map<string, string>();
  for (const item of items) {
    const record = await prisma.itemDefinition.upsert({
      where: { name: item.name },
      update: {
        description: item.description,
        baseValue: item.baseValue,
        effects: (item.effects as never) ?? undefined,
        weaponData: (item.weaponData as never) ?? undefined,
        clothingData: (item.clothingData as never) ?? undefined,
        toolData: (item.toolData as never) ?? undefined,
        vehicleData: (item.vehicleData as never) ?? undefined,
      },
      create: {
        name: item.name,
        description: item.description,
        category: item.category,
        rarity: item.rarity,
        baseValue: item.baseValue,
        weight: item.weight,
        effects: (item.effects as never) ?? undefined,
        weaponData: (item.weaponData as never) ?? undefined,
        clothingData: (item.clothingData as never) ?? undefined,
        toolData: (item.toolData as never) ?? undefined,
        vehicleData: (item.vehicleData as never) ?? undefined,
      },
    });
    itemIds.set(item.name, record.id);
  }
  console.log(`✅ Expansion items: ${items.length} definitions`);

  // ---------- shop stock ----------
  type StockSeed = {
    buildingId: string;
    itemName: string;
    priceCredits: number;
    contraband?: boolean;
    condition?: number;
  };

  const stock: StockSeed[] = [
    // Teraluma Galleria — legal, upmarket
    { buildingId: 'bldg-teraluma-galleria', itemName: 'Corporate Sleek Suit', priceCredits: 320 },
    { buildingId: 'bldg-teraluma-galleria', itemName: 'Mid-grade Hacking Deck', priceCredits: 430 },
    { buildingId: 'bldg-teraluma-galleria', itemName: 'Courier Windbreaker', priceCredits: 80 },
    { buildingId: 'bldg-teraluma-galleria', itemName: 'Stim Shot', priceCredits: 75 },
    { buildingId: 'bldg-teraluma-galleria', itemName: 'Stim Shot', priceCredits: 75 },
    // Teraluma clinic
    { buildingId: 'bldg-teraluma-civic-clinic', itemName: 'Combat Cocktail', priceCredits: 105 },
    { buildingId: 'bldg-teraluma-civic-clinic', itemName: 'Stim Shot', priceCredits: 70 },
    // Los Panko pawnshop — cheap and cheerful
    { buildingId: 'bldg-lospanko-pawnshop', itemName: 'Shock Baton', priceCredits: 110, condition: 85 },
    { buildingId: 'bldg-lospanko-pawnshop', itemName: 'Rustbucket Hoverboard', priceCredits: 190, condition: 70 },
    { buildingId: 'bldg-lospanko-pawnshop', itemName: 'Courier Windbreaker', priceCredits: 70, condition: 80 },
    { buildingId: 'bldg-lospanko-pawnshop', itemName: 'Scrap Alloy', priceCredits: 16 },
    // Smuggler's Den — contraband hub
    { buildingId: 'bldg-lospanko-smugglers-den', itemName: 'Kinetic Bandit Carbine', priceCredits: 340, contraband: true },
    { buildingId: 'bldg-lospanko-smugglers-den', itemName: 'Forged Manifest Kit', priceCredits: 820, contraband: true },
    { buildingId: 'bldg-lospanko-smugglers-den', itemName: 'Marina Skiff', priceCredits: 520 },
    { buildingId: 'bldg-lospanko-smugglers-den', itemName: 'Clean Slate Chip', priceCredits: 380, contraband: true },
    // Dockside clinic
    { buildingId: 'bldg-lospanko-stitch-clinic', itemName: 'Combat Cocktail', priceCredits: 95 },
    { buildingId: 'bldg-lospanko-stitch-clinic', itemName: 'Combat Cocktail', priceCredits: 95 },
    // Pigeon company store — worker basics
    { buildingId: 'bldg-pigeon95-company-store', itemName: 'Plated Work Harness', priceCredits: 260 },
    { buildingId: 'bldg-pigeon95-company-store', itemName: 'Courier Windbreaker', priceCredits: 75 },
    { buildingId: 'bldg-pigeon95-company-store', itemName: 'Stim Shot', priceCredits: 70 },
    { buildingId: 'bldg-pigeon95-company-store', itemName: 'Scrap Alloy', priceCredits: 14 },
    // Valerina outfitters — expedition gear
    { buildingId: 'bldg-valerina-outfitters', itemName: 'Mire Ghillie Wrap', priceCredits: 880 },
    { buildingId: 'bldg-valerina-outfitters', itemName: 'Orchard Med-Scanner', priceCredits: 360 },
    { buildingId: 'bldg-valerina-outfitters', itemName: 'Combat Cocktail', priceCredits: 110 },
    // Mire Exchange — high-end black market
    { buildingId: 'bldg-valerina-mire-exchange', itemName: 'Ghostmaker Railpistol', priceCredits: 1150, contraband: true },
    { buildingId: 'bldg-valerina-mire-exchange', itemName: 'Clean Slate Chip', priceCredits: 340, contraband: true },
    { buildingId: 'bldg-valerina-mire-exchange', itemName: 'Orchard Bio-Sample', priceCredits: 300, contraband: true },
  ];

  const stockedBuildings = [...new Set(stock.map((entry) => entry.buildingId))];
  for (const buildingId of stockedBuildings) {
    const existing = await prisma.itemInstance.count({
      where: { ownerType: 'BUILDING', ownerId: buildingId },
    });
    if (existing > 0) continue;
    for (const entry of stock.filter((row) => row.buildingId === buildingId)) {
      const itemDefinitionId = itemIds.get(entry.itemName);
      if (!itemDefinitionId) continue;
      await prisma.itemInstance.create({
        data: {
          itemDefinitionId,
          ownerType: 'BUILDING',
          ownerId: entry.buildingId,
          condition: entry.condition ?? 100,
          modifiers: { priceCredits: entry.priceCredits, contraband: entry.contraband === true },
        },
      });
    }
  }
  console.log(`✅ Expansion shop stock: ${stockedBuildings.length} shops`);

  // ---------- opportunities ----------
  const opportunities: Array<Record<string, unknown> & { id: string }> = [
    // ===== Teraluma =====
    {
      id: 'opp-tera-reporter-escort',
      title: 'Escort a SunSpoke Reporter',
      description:
        'A SunSpoke investigative reporter needs a discreet escort through Glasswater Central.',
      acceptedDescription:
        'The reporter talks too much and photographs everything. Keep them moving and keep the wrong people uninterested.',
      kind: 'GIG',
      postedByType: 'CORPORATION',
      postedById: sunspoke.id,
      type: 'ESCORT',
      requirements: [{ type: 'PLANET_ACCESS', id: teraluma.id, name: 'Teraluma' }],
      durationMinutes: 12,
      difficulty: 11,
      rewards: [
        { type: 'CREDITS', value: 320 },
        { type: 'CORPORATION_REPUTATION', corporationId: sunspoke.id, value: 4 },
        { type: 'STAT_XP', key: 'agility', value: 1 },
      ],
      risks: [
        {
          level: 'LOW',
          type: 'COMBAT',
          probability: 0.2,
          consequences: [{ type: 'MODIFY_STAT', key: 'health', value: -10 }],
        },
      ],
      timelineEvents: [
        { minute: 5, description: 'A civic drone lingers overhead a little too long.' },
        {
          minute: 8,
          successDescription: 'You steer the reporter through a service arcade before anyone closes in.',
          failureDescription: 'Two men in unmarked suits start pacing you on the promenade.',
        },
      ],
    },
    {
      id: 'opp-tera-civic-grid-debug',
      title: 'Debug the Civic Grid',
      description:
        'The Civic Authority quietly contracts out a firmware audit of the Glasswater traffic grid.',
      acceptedDescription:
        'The grid is ancient, undocumented, and load-bearing for the whole district. Do not brick it.',
      kind: 'GIG',
      postedByType: 'FACTION',
      postedById: civicAuthority.id,
      type: 'HACKING',
      requirements: [
        { type: 'PLANET_ACCESS', id: teraluma.id, name: 'Teraluma' },
        { type: 'LEVEL_MIN', value: 2 },
      ],
      durationMinutes: 18,
      difficulty: 13,
      rewards: [
        { type: 'CREDITS', value: 450 },
        { type: 'FACTION_REPUTATION', factionId: civicAuthority.id, value: 5 },
        { type: 'STAT_XP', key: 'hacking', value: 1 },
      ],
      risks: [
        {
          level: 'MEDIUM',
          type: 'LEGAL',
          probability: 0.25,
          consequences: [{ type: 'MODIFY_CREDITS', value: -120 }],
        },
      ],
      timelineEvents: [
        {
          minute: 9,
          description:
            'Deep in the stack you find an undocumented backdoor — someone was here before you.',
          choices: [
            {
              id: 'trace',
              label: 'Trace the intruder',
              statCheck: { stat: 'hacking', dc: 13 },
              effects: { rollBonus: 4, note: 'You log the intrusion path — the Authority will pay well for this.' },
              failEffects: { rollBonus: -2, note: 'The trace collapses and takes part of your audit with it.' },
            },
            {
              id: 'patch',
              label: 'Quietly patch it and move on',
              effects: { rollBonus: 2, note: 'Sealed and forgotten. Clean work.' },
            },
            {
              id: 'copy',
              label: 'Copy the backdoor for yourself',
              effects: { rollBonus: -1, creditsBonus: 150, note: 'You pocket the exploit. It may be worth more than the contract.' },
            },
          ],
        },
      ],
    },
    {
      id: 'opp-tera-media-runner',
      title: 'Media Runner for SunSpoke',
      description: 'Shuttle embargoed story drives between SunSpoke studios before the leaks do.',
      acceptedDescription:
        'Every drive is timestamped and tamper-sealed. Fast hands, closed mouth.',
      kind: 'JOB',
      postedByType: 'CORPORATION',
      postedById: sunspoke.id,
      type: 'DELIVERY',
      requirements: [{ type: 'PLANET_ACCESS', id: teraluma.id, name: 'Teraluma' }],
      durationMinutes: 15,
      difficulty: 10,
      rewards: [
        { type: 'CREDITS', value: 220 },
        { type: 'CORPORATION_REPUTATION', corporationId: sunspoke.id, value: 2 },
      ],
      risks: [],
      timelineEvents: [
        { minute: 6, description: 'A rival outlet stringer tails you for two blocks before losing interest.' },
      ],
      repeatability: { type: 'COOLDOWN', cooldownHours: 6 },
    },
    {
      id: 'opp-tera-greenbelt-heist',
      title: 'Greenbelt Seed Vault Heist',
      description:
        'Red Market wants a cutting from the Civic Authority seed vault. Genetic royalty locked behind glass.',
      acceptedDescription:
        'The vault has silent alarms, pressure floors, and gardeners with military posture. In and out before the morning misting cycle.',
      kind: 'GIG',
      postedByType: 'FACTION',
      postedById: redMarket.id,
      type: 'SMUGGLING',
      requirements: [
        { type: 'PLANET_ACCESS', id: teraluma.id, name: 'Teraluma' },
        { type: 'LEVEL_MIN', value: 3 },
        { type: 'STAT_MIN', key: 'stealth', value: 7 },
      ],
      durationMinutes: 25,
      difficulty: 14,
      rewards: [
        { type: 'CREDITS', value: 620 },
        { type: 'FACTION_REPUTATION', factionId: redMarket.id, value: 7 },
        { type: 'STAT_XP', key: 'stealth', value: 1 },
      ],
      risks: [
        {
          level: 'HIGH',
          type: 'LEGAL',
          probability: 0.4,
          consequences: [
            { type: 'MODIFY_WANTED_LEVEL', value: 2 },
            { type: 'MODIFY_FACTION_REPUTATION', factionId: civicAuthority.id, value: -4 },
          ],
        },
      ],
      timelineEvents: [
        {
          minute: 12,
          description: 'The misting cycle starts early. Visibility drops — and so does the guards.',
          choices: [
            {
              id: 'rush',
              label: 'Rush the vault in the fog',
              statCheck: { stat: 'agility', dc: 13 },
              effects: { rollBonus: 4, note: 'You move through the mist like a rumor.' },
              failEffects: { rollBonus: -3, healthDelta: -10, note: 'A pressure plate sings. You vault a hedge with a guard baton kissing your ribs.' },
            },
            {
              id: 'hide',
              label: 'Hide and wait for the cycle to pass',
              effects: { rollBonus: 1, note: 'Patience. The garden settles back to sleep.' },
            },
          ],
        },
      ],
    },
    // ===== Los Panko =====
    {
      id: 'opp-lp-cargo-shuffle',
      title: 'Marina Cargo Shuffle',
      description:
        'Move unregistered crates between barges before the harbor census drones sweep at dawn.',
      acceptedDescription:
        'Nobody says what is in the crates and you do not ask. The tide table is your only friend.',
      kind: 'GIG',
      postedByType: 'FACTION',
      postedById: redMarket.id,
      type: 'SMUGGLING',
      requirements: [{ type: 'PLANET_ACCESS', id: losPanko.id, name: 'Los Panko' }],
      durationMinutes: 14,
      difficulty: 11,
      rewards: [
        { type: 'CREDITS', value: 350 },
        { type: 'FACTION_REPUTATION', factionId: redMarket.id, value: 4 },
        { type: 'STAT_XP', key: 'stealth', value: 1 },
      ],
      risks: [
        {
          level: 'MEDIUM',
          type: 'LEGAL',
          probability: 0.3,
          consequences: [{ type: 'MODIFY_WANTED_LEVEL', value: 1 }],
        },
      ],
      timelineEvents: [
        { minute: 7, description: 'A census drone hums past the pier, one sweep early.' },
      ],
    },
    {
      id: 'opp-lp-bouncer-night',
      title: 'Bouncer Night at Velvet Static',
      description: 'The regular door crew called in sick. Velvet Static needs muscle for one night.',
      acceptedDescription:
        'House rules: no blades past the curtain, no faction colors on the dance floor, and the DJ is always right.',
      kind: 'GIG',
      postedByType: 'SYSTEM',
      type: 'SECURITY',
      requirements: [
        { type: 'PLANET_ACCESS', id: losPanko.id, name: 'Los Panko' },
        { type: 'STAT_MIN', key: 'combat', value: 6 },
      ],
      durationMinutes: 20,
      difficulty: 12,
      rewards: [
        { type: 'CREDITS', value: 380 },
        { type: 'STAT_XP', key: 'combat', value: 1 },
      ],
      risks: [
        {
          level: 'MEDIUM',
          type: 'INJURY',
          probability: 0.35,
          consequences: [{ type: 'MODIFY_STAT', key: 'health', value: -20 }],
        },
      ],
      timelineEvents: [
        {
          minute: 10,
          description: 'Two crews start shoving near the bar. Bottles are being weighed in hands.',
          choices: [
            {
              id: 'talk-down',
              label: 'Talk them down',
              statCheck: { stat: 'charisma', dc: 12 },
              effects: { rollBonus: 4, note: 'You buy a round and the room exhales.' },
              failEffects: { rollBonus: -2, healthDelta: -8, note: 'Words fail. A bottle does not.' },
            },
            {
              id: 'wade-in',
              label: 'Wade in swinging',
              statCheck: { stat: 'combat', dc: 12 },
              effects: { rollBonus: 3, note: 'Fast, ugly, decisive. The floor clears.' },
              failEffects: { rollBonus: -2, healthDelta: -12, note: 'You win eventually, but you feel every second of it.' },
            },
          ],
        },
      ],
    },
    {
      id: 'opp-lp-night-loader',
      title: 'Night Dock Loader',
      description: 'Steady overnight work moving crates at the Crooked Marina freight line.',
      acceptedDescription:
        'The manifest is optional reading. The quota is not.',
      kind: 'JOB',
      postedByType: 'SYSTEM',
      type: 'TRADING',
      requirements: [{ type: 'PLANET_ACCESS', id: losPanko.id, name: 'Los Panko' }],
      durationMinutes: 25,
      difficulty: 10,
      rewards: [
        { type: 'CREDITS', value: 240 },
        { type: 'STAT_XP', key: 'strength', value: 1 },
      ],
      risks: [],
      timelineEvents: [
        { minute: 12, description: 'A crate splits and something inside skitters into the dark. Nobody investigates.' },
      ],
      repeatability: { type: 'COOLDOWN', cooldownHours: 8 },
    },
    {
      id: 'opp-lp-quest-wet-ledger',
      title: 'Undertow: The Wet Ledger',
      description:
        'A Red Market bookkeeper vanished with the marina protection ledger. Find out who has it.',
      acceptedDescription:
        'The ledger names every stall that pays and every officer that looks away. Half the port wants it burned, the other half wants it published.',
      kind: 'QUEST',
      postedByType: 'FACTION',
      postedById: redMarket.id,
      type: 'INVESTIGATION',
      requirements: [
        { type: 'PLANET_ACCESS', id: losPanko.id, name: 'Los Panko' },
        { type: 'LEVEL_MIN', value: 2 },
      ],
      durationMinutes: 30,
      difficulty: 12,
      rewards: [
        { type: 'CREDITS', value: 300 },
        { type: 'FACTION_REPUTATION', factionId: redMarket.id, value: 5 },
        { type: 'UNLOCK_QUEST', questId: 'opp-lp-quest-skim-skimmers' },
      ],
      risks: [],
      timelineEvents: [
        { minute: 10, description: 'A barkeep remembers the bookkeeper buying passage — and paying double for silence.' },
      ],
      questData: {
        chainId: 'chain-lospanko-undertow',
        stepNumber: 1,
        totalSteps: 2,
        isOneOff: true,
        hint: 'Ask around the Crooked Marina. Money that scared travels loud.',
      },
    },
    {
      id: 'opp-lp-quest-skim-skimmers',
      title: 'Undertow: Skim the Skimmers',
      description:
        'The ledger points to a crew skimming Red Market takings. Recover the cache before they ship it off-world.',
      acceptedDescription:
        'The skimmers load out at dawn. Hit the stash barge tonight or the evidence sails.',
      kind: 'QUEST',
      postedByType: 'FACTION',
      postedById: redMarket.id,
      type: 'SMUGGLING',
      requirements: [
        { type: 'PLANET_ACCESS', id: losPanko.id, name: 'Los Panko' },
        { type: 'LEVEL_MIN', value: 3 },
      ],
      durationMinutes: 40,
      difficulty: 14,
      rewards: [
        { type: 'CREDITS', value: 700 },
        { type: 'FACTION_REPUTATION', factionId: redMarket.id, value: 8 },
        { type: 'STAT_XP', key: 'stealth', value: 1 },
      ],
      risks: [
        {
          level: 'HIGH',
          type: 'COMBAT',
          probability: 0.35,
          consequences: [{ type: 'MODIFY_STAT', key: 'health', value: -25 }],
        },
      ],
      timelineEvents: [
        {
          minute: 18,
          description: 'On the stash barge you find the bookkeeper — alive, tied to a chair, and very talkative.',
          choices: [
            {
              id: 'free',
              label: 'Cut them loose and take them along',
              effects: { rollBonus: 2, note: 'Grateful and terrified, they show you the false floor.' },
            },
            {
              id: 'interrogate',
              label: 'Press them for the cache location first',
              statCheck: { stat: 'charisma', dc: 13 },
              effects: { rollBonus: 4, note: 'They give up the cache, the codes, and two names you did not ask for.' },
              failEffects: { rollBonus: -2, note: 'They clam up. Time bleeds away.' },
            },
            {
              id: 'leave',
              label: 'Leave them — not your problem',
              effects: { rollBonus: -1, wantedDelta: 0, note: 'Their eyes follow you out. The Red Market will hear about this.' },
            },
          ],
        },
      ],
      questData: {
        chainId: 'chain-lospanko-undertow',
        stepNumber: 2,
        totalSteps: 2,
        isOneOff: true,
        hint: 'Bring stealth or bring bandages.',
      },
    },
    // ===== Pigeon95 =====
    {
      id: 'opp-p95-sort-overdrive',
      title: 'Sort Center Overdrive',
      description:
        'A container backlog hit Fulfilment Core. Pigeon pays surge rates to anyone who can move freight.',
      acceptedDescription:
        'The conveyor never stops. You adapt to it, not the other way around.',
      kind: 'GIG',
      postedByType: 'CORPORATION',
      postedById: pigeonCorp.id,
      type: 'DELIVERY',
      requirements: [{ type: 'PLANET_ACCESS', id: pigeon95.id, name: 'Pigeon95' }],
      durationMinutes: 12,
      difficulty: 10,
      rewards: [
        { type: 'CREDITS', value: 260 },
        { type: 'CORPORATION_REPUTATION', corporationId: pigeonCorp.id, value: 3 },
      ],
      risks: [
        {
          level: 'LOW',
          type: 'INJURY',
          probability: 0.15,
          consequences: [{ type: 'MODIFY_STAT', key: 'health', value: -8 }],
        },
      ],
      timelineEvents: [
        { minute: 6, description: 'Lane nine jams. Sirens, foam, and a supervisor screaming about throughput.' },
      ],
    },
    {
      id: 'opp-p95-manifest-forensics',
      title: 'Manifest Forensics',
      description:
        'The Coil Union wants a quiet audit of Pigeon routing data. Strictly off the books.',
      acceptedDescription:
        'Terabytes of routing logs, one thread of wrongness. Find where the ghost pallets go.',
      kind: 'GIG',
      postedByType: 'FACTION',
      postedById: coilUnion.id,
      type: 'INVESTIGATION',
      requirements: [
        { type: 'PLANET_ACCESS', id: pigeon95.id, name: 'Pigeon95' },
        { type: 'LEVEL_MIN', value: 2 },
        { type: 'STAT_MIN', key: 'intelligence', value: 6 },
      ],
      durationMinutes: 22,
      difficulty: 13,
      rewards: [
        { type: 'CREDITS', value: 480 },
        { type: 'FACTION_REPUTATION', factionId: coilUnion.id, value: 5 },
        { type: 'STAT_XP', key: 'intelligence', value: 1 },
      ],
      risks: [
        {
          level: 'MEDIUM',
          type: 'CORPORATE_RETALIATION',
          probability: 0.25,
          consequences: [
            { type: 'MODIFY_CORPORATION_REPUTATION', corporationId: pigeonCorp.id, value: -3 },
          ],
        },
      ],
      timelineEvents: [
        { minute: 11, description: 'Every eighth pallet to Valerina weighs exactly the same. Down to the gram.' },
      ],
    },
    {
      id: 'opp-p95-line-shift',
      title: 'Fulfilment Line Shift',
      description: 'A standard maintenance shift keeping the sort machines alive.',
      acceptedDescription:
        'Grease, belts, bearings, repeat. The machines outnumber you a thousand to one.',
      kind: 'JOB',
      postedByType: 'CORPORATION',
      postedById: pigeonCorp.id,
      type: 'REPAIR',
      requirements: [{ type: 'PLANET_ACCESS', id: pigeon95.id, name: 'Pigeon95' }],
      durationMinutes: 30,
      difficulty: 10,
      rewards: [
        { type: 'CREDITS', value: 210 },
        { type: 'STAT_XP', key: 'engineering', value: 1 },
      ],
      risks: [],
      timelineEvents: [
        { minute: 15, description: 'Sorter 7 sings a bearing note only you seem to hear. You fix it before it becomes a scream.' },
      ],
      repeatability: { type: 'DAILY' },
    },
    // ===== Valerina =====
    {
      id: 'opp-val-sensor-sweep',
      title: 'Perimeter Sensor Sweep',
      description:
        'The Ghosts pay for someone to walk the fence line and reset what the mire fog kills.',
      acceptedDescription:
        'Forty-one posts, ankle-deep mud, and things that watch from the reeds. Bring boots.',
      kind: 'GIG',
      postedByType: 'FACTION',
      postedById: ghosts.id,
      type: 'SECURITY',
      requirements: [{ type: 'PLANET_ACCESS', id: valerina.id, name: 'Valerina' }],
      durationMinutes: 16,
      difficulty: 12,
      rewards: [
        { type: 'CREDITS', value: 420 },
        { type: 'FACTION_REPUTATION', factionId: ghosts.id, value: 4 },
        { type: 'STAT_XP', key: 'engineering', value: 1 },
      ],
      risks: [
        {
          level: 'MEDIUM',
          type: 'INJURY',
          probability: 0.25,
          consequences: [{ type: 'MODIFY_STAT', key: 'health', value: -15 }],
        },
      ],
      timelineEvents: [
        { minute: 8, description: 'Post 23 is not dead — someone cut it, cleanly, from the inside of the fence.' },
      ],
    },
    {
      id: 'opp-val-sample-run',
      title: 'Sample Recovery Run',
      description:
        'Something valuable leaked out of the Blue Orchard lab into the mire. Retrieve it before their recovery team does.',
      acceptedDescription:
        'The tracker pings from deep in the wet dark. Orchard drones sweep the canopy every eleven minutes.',
      kind: 'GIG',
      postedByType: 'FACTION',
      postedById: ghosts.id,
      type: 'SMUGGLING',
      requirements: [
        { type: 'PLANET_ACCESS', id: valerina.id, name: 'Valerina' },
        { type: 'LEVEL_MIN', value: 4 },
        { type: 'STAT_MIN', key: 'stealth', value: 7 },
      ],
      durationMinutes: 35,
      difficulty: 15,
      rewards: [
        { type: 'CREDITS', value: 850 },
        { type: 'ITEM', itemDefinitionId: itemIds.get('Orchard Bio-Sample') },
        { type: 'FACTION_REPUTATION', factionId: ghosts.id, value: 6 },
      ],
      risks: [
        {
          level: 'HIGH',
          type: 'INJURY',
          probability: 0.4,
          consequences: [
            { type: 'MODIFY_STAT', key: 'health', value: -25 },
            { type: 'MODIFY_WANTED_LEVEL', value: 1 },
          ],
        },
      ],
      timelineEvents: [
        {
          minute: 15,
          description: 'The tracker leads to a half-sunk drone crate — and fresh bootprints that are not yours.',
          choices: [
            {
              id: 'ambush',
              label: 'Set an ambush and wait',
              statCheck: { stat: 'combat', dc: 14 },
              effects: { rollBonus: 5, note: 'The Orchard recovery scout never sees you. You take the sample and their radio.' },
              failEffects: { rollBonus: -3, healthDelta: -15, note: 'The scout was bait. You fight your way clear of two more.' },
            },
            {
              id: 'race',
              label: 'Grab it and run',
              statCheck: { stat: 'agility', dc: 13 },
              effects: { rollBonus: 3, note: 'Mud, reeds, drone-shadow — gone before anyone reacts.' },
              failEffects: { rollBonus: -2, note: 'You get it, but the whole mire knows something ran.' },
            },
          ],
        },
      ],
    },
    {
      id: 'opp-val-listening-watch',
      title: 'Listening Post Watch',
      description: 'Sit the night shift at the Ghost antenna farm and log what the corporations say in the dark.',
      acceptedDescription:
        'Headphones, cold coffee, and the static-hiss of secrets. Flag anything with the word "shipment".',
      kind: 'JOB',
      postedByType: 'FACTION',
      postedById: ghosts.id,
      type: 'SECURITY',
      requirements: [{ type: 'PLANET_ACCESS', id: valerina.id, name: 'Valerina' }],
      durationMinutes: 30,
      difficulty: 11,
      rewards: [
        { type: 'CREDITS', value: 260 },
        { type: 'FACTION_REPUTATION', factionId: ghosts.id, value: 2 },
        { type: 'STAT_XP', key: 'intelligence', value: 1 },
      ],
      risks: [],
      timelineEvents: [
        { minute: 14, description: 'A Blue Orchard channel goes encrypted mid-sentence. You log the timestamp.' },
      ],
      repeatability: { type: 'DAILY' },
    },
    {
      id: 'opp-val-quest-static-chorus',
      title: 'Ghost Signal: Static Chorus',
      description:
        'The Ghosts have been hearing the Pigeon95 ghost-pallet frequency too. Compare notes — if you can earn the clearance.',
      acceptedDescription:
        'They play you nine seconds of audio: cargo numbers, a Blue Orchard voice, and a word that sounds like your name for the operation — "Heliora".',
      kind: 'QUEST',
      postedByType: 'FACTION',
      postedById: ghosts.id,
      type: 'INVESTIGATION',
      requirements: [
        { type: 'PLANET_ACCESS', id: valerina.id, name: 'Valerina' },
        { type: 'LEVEL_MIN', value: 3 },
        { type: 'QUEST_COMPLETED', id: 'opp-quest-pigeon95-secret' },
      ],
      durationMinutes: 45,
      difficulty: 13,
      rewards: [
        { type: 'CREDITS', value: 400 },
        { type: 'FACTION_REPUTATION', factionId: ghosts.id, value: 6 },
        { type: 'UNLOCK_QUEST', questId: 'opp-val-quest-orchard-vault' },
      ],
      risks: [],
      timelineEvents: [
        { minute: 20, description: 'Cross-referencing your Pigeon95 findings, the ghost pallets all route to one grid square in the mire.' },
      ],
      questData: {
        chainId: 'chain-ghost-signal',
        stepNumber: 1,
        totalSteps: 2,
        isOneOff: true,
        hint: 'Requires having cracked the Pigeon95 Secret first.',
      },
    },
    {
      id: 'opp-val-quest-orchard-vault',
      title: 'Ghost Signal: The Orchard Vault',
      description:
        'Every thread ends at a sealed Blue Orchard data vault beneath the field lab. Open it.',
      acceptedDescription:
        'The vault takes three keys: a stolen credential, a forged manifest, and nerve. You have one of the three.',
      kind: 'QUEST',
      postedByType: 'FACTION',
      postedById: ghosts.id,
      type: 'HACKING',
      requirements: [
        { type: 'PLANET_ACCESS', id: valerina.id, name: 'Valerina' },
        { type: 'LEVEL_MIN', value: 4 },
        { type: 'STAT_MIN', key: 'hacking', value: 7 },
      ],
      durationMinutes: 60,
      difficulty: 15,
      rewards: [
        { type: 'CREDITS', value: 900 },
        { type: 'FACTION_REPUTATION', factionId: ghosts.id, value: 10 },
        { type: 'ITEM', itemDefinitionId: itemIds.get('Ghostmaker Railpistol') },
      ],
      risks: [
        {
          level: 'HIGH',
          type: 'CORPORATE_RETALIATION',
          probability: 0.4,
          consequences: [
            { type: 'MODIFY_WANTED_LEVEL', value: 2 },
            { type: 'MODIFY_CORPORATION_REPUTATION', corporationId: blueOrchard.id, value: -6 },
          ],
        },
      ],
      timelineEvents: [
        {
          minute: 25,
          description: 'Inside the vault antechamber, a maintenance AI politely asks for your authorization phrase.',
          choices: [
            {
              id: 'spoof',
              label: 'Spoof an executive credential',
              statCheck: { stat: 'hacking', dc: 15 },
              effects: { rollBonus: 6, note: 'The AI thanks "Director Voss" and opens everything.' },
              failEffects: { rollBonus: -3, wantedDelta: 1, note: 'The AI pauses one second too long. Somewhere, a light turns red.' },
            },
            {
              id: 'charm',
              label: 'Social-engineer the night clerk',
              statCheck: { stat: 'charisma', dc: 13 },
              effects: { rollBonus: 4, note: 'The clerk badge-swipes you through, complaining about overtime.' },
              failEffects: { rollBonus: -2, note: 'The clerk gets suspicious and you retreat to plan B.' },
            },
          ],
        },
      ],
      questData: {
        chainId: 'chain-ghost-signal',
        stepNumber: 2,
        totalSteps: 2,
        isOneOff: true,
        hint: 'The mother of all vault jobs. Come prepared.',
      },
    },
  ];

  for (const opp of opportunities) {
    const { id, ...data } = opp;
    await prisma.opportunityDefinition.upsert({
      where: { id },
      update: data as never,
      create: { id, ...data } as never,
    });
  }
  console.log(`✅ Expansion opportunities: ${opportunities.length} across 4 planets`);

  // ---------- world events ----------
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  await prisma.worldEvent.upsert({
    where: { id: 'event-teraluma-media-blitz' },
    update: {},
    create: {
      id: 'event-teraluma-media-blitz',
      title: 'SunSpoke Ratings Blitz',
      description:
        'SunSpoke floods every feed with a corruption exposé teaser. Civic contracts pay a visibility premium.',
      scope: 'PLANET',
      affectedEntities: [{ type: 'PLANET', id: teraluma.id }],
      requirements: [],
      effects: [{ type: 'MODIFY_REWARD', target: 'ESCORT', modifier: 0.15 }],
      startsAt: now,
      endsAt: in24h,
      status: 'ACTIVE',
    },
  });

  await prisma.worldEvent.upsert({
    where: { id: 'event-pigeon95-strike-vote' },
    update: {},
    create: {
      id: 'event-pigeon95-strike-vote',
      title: 'Worker Stack Strike Vote',
      description:
        'The Coil Union is counting heads in Worker Stack 12. Pigeon security is on edge across the planet.',
      scope: 'PLANET',
      affectedEntities: [{ type: 'PLANET', id: pigeon95.id }],
      requirements: [],
      effects: [{ type: 'MODIFY_RISK', target: 'DELIVERY', modifier: 0.1 }],
      startsAt: in24h,
      endsAt: in72h,
      status: 'SCHEDULED',
    },
  });

  await prisma.worldEvent.upsert({
    where: { id: 'event-valerina-white-fog' },
    update: {},
    create: {
      id: 'event-valerina-white-fog',
      title: 'White Fog over the Mire',
      description:
        'A chemical-white fog bank rolls over the Blacksite Mire. Drones grounded; smugglers delighted.',
      scope: 'DISTRICT',
      affectedEntities: [{ type: 'DISTRICT', id: districtIds.blacksiteMire }],
      requirements: [],
      effects: [{ type: 'MODIFY_RISK', target: 'SMUGGLING', modifier: -0.15 }],
      startsAt: now,
      endsAt: in72h,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Expansion world events: 3 events');
}
