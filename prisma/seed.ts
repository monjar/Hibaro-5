import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌌 Seeding Heliora / Hibaro-5...');

  // ==================== SOLAR SYSTEM ====================
  const hibaro5 = await prisma.solarSystem.upsert({
    where: { name: 'Hibaro-5' },
    update: {},
    create: {
      name: 'Hibaro-5',
      description:
        'A corporate-controlled solar system where factions, corporations, and independent operators battle for resources, influence, and survival.',
    },
  });
  console.log('✅ Solar system: Hibaro-5');

  // ==================== PLANETS ====================
  const antrolus = await prisma.planet.upsert({
    where: { name: 'Antrolus' },
    update: {},
    create: {
      solarSystemId: hibaro5.id,
      name: 'Antrolus',
      description:
        'A harsh industrial world of refineries and worker districts. The starting point for most new arrivals to Hibaro-5.',
      planetType: 'TERRESTRIAL',
      dangerLevel: 3,
      lawLevel: 4,
      economyLevel: 5,
    },
  });

  const teraluma = await prisma.planet.upsert({
    where: { name: 'Teraluma' },
    update: {},
    create: {
      solarSystemId: hibaro5.id,
      name: 'Teraluma',
      description:
        'A prosperous mid-ring world known for its glass-domed cities and civic authority.',
      planetType: 'TERRESTRIAL',
      dangerLevel: 2,
      lawLevel: 7,
      economyLevel: 8,
    },
  });

  const losPanko = await prisma.planet.upsert({
    where: { name: 'Los Panko' },
    update: {},
    create: {
      solarSystemId: hibaro5.id,
      name: 'Los Panko',
      description:
        'A neon-lit port world with a thriving black market and corrupt marina districts.',
      planetType: 'OCEAN',
      dangerLevel: 6,
      lawLevel: 3,
      economyLevel: 6,
    },
  });

  const pigeon95 = await prisma.planet.upsert({
    where: { name: 'Pigeon95' },
    update: {},
    create: {
      solarSystemId: hibaro5.id,
      name: 'Pigeon95',
      description:
        'A logistics hub and fulfillment world almost entirely controlled by Pigeon Corporation.',
      planetType: 'DESERT',
      dangerLevel: 4,
      lawLevel: 5,
      economyLevel: 7,
    },
  });

  const valerina = await prisma.planet.upsert({
    where: { name: 'Valerina' },
    update: {},
    create: {
      solarSystemId: hibaro5.id,
      name: 'Valerina',
      description:
        'A remote outer-ring world with government blacksites and deep secrets. Blue Orchard Biotech has a classified presence here.',
      planetType: 'ICE',
      dangerLevel: 7,
      lawLevel: 6,
      economyLevel: 4,
    },
  });

  console.log('✅ Planets: Antrolus, Teraluma, Los Panko, Pigeon95, Valerina');

  // ==================== DISTRICTS ====================
  // Antrolus districts
  const arrivalYard = await prisma.district.upsert({
    where: { id: 'dist-antrolus-arrival-yard' },
    update: {},
    create: {
      id: 'dist-antrolus-arrival-yard',
      planetId: antrolus.id,
      name: 'Arrival Yard',
      description:
        'The entry point to Antrolus. Crowded with newcomers, shuttle docks, and opportunists.',
      dangerLevel: 2,
      lawLevel: 5,
      economyLevel: 4,
    },
  });

  const furnaceRow = await prisma.district.upsert({
    where: { id: 'dist-antrolus-furnace-row' },
    update: {},
    create: {
      id: 'dist-antrolus-furnace-row',
      planetId: antrolus.id,
      name: 'Furnace Row',
      description:
        'An industrial corridor of refineries and maintenance facilities controlled by Helix Dynamics.',
      dangerLevel: 4,
      lawLevel: 3,
      economyLevel: 5,
    },
  });

  // Teraluma districts
  const glasswaterCentral = await prisma.district.upsert({
    where: { id: 'dist-teraluma-glasswater-central' },
    update: {},
    create: {
      id: 'dist-teraluma-glasswater-central',
      planetId: teraluma.id,
      name: 'Glasswater Central',
      description:
        'The civic and commercial heart of Teraluma, governed by the Glasswater Civic Authority.',
      dangerLevel: 1,
      lawLevel: 8,
      economyLevel: 9,
    },
  });

  const greenbeltResidences = await prisma.district.upsert({
    where: { id: 'dist-teraluma-greenbelt' },
    update: {},
    create: {
      id: 'dist-teraluma-greenbelt',
      planetId: teraluma.id,
      name: 'Greenbelt Residences',
      description: 'Affluent residential district with SunSpoke Media broadcasting towers.',
      dangerLevel: 1,
      lawLevel: 7,
      economyLevel: 8,
    },
  });

  // Los Panko districts
  const neonKeys = await prisma.district.upsert({
    where: { id: 'dist-lospanko-neon-keys' },
    update: {},
    create: {
      id: 'dist-lospanko-neon-keys',
      planetId: losPanko.id,
      name: 'Neon Keys',
      description: 'Vibrant entertainment district where deals happen in back rooms.',
      dangerLevel: 5,
      lawLevel: 3,
      economyLevel: 6,
    },
  });

  const crookedMarina = await prisma.district.upsert({
    where: { id: 'dist-lospanko-crooked-marina' },
    update: {},
    create: {
      id: 'dist-lospanko-crooked-marina',
      planetId: losPanko.id,
      name: 'Crooked Marina',
      description: 'A labyrinthine dock district infamous for smuggling and gang activity.',
      dangerLevel: 7,
      lawLevel: 2,
      economyLevel: 5,
    },
  });

  // Pigeon95 districts
  const fulfilmentCore = await prisma.district.upsert({
    where: { id: 'dist-pigeon95-fulfilment-core' },
    update: {},
    create: {
      id: 'dist-pigeon95-fulfilment-core',
      planetId: pigeon95.id,
      name: 'Fulfilment Core',
      description: 'The automated logistics hub of Pigeon Corporation.',
      dangerLevel: 2,
      lawLevel: 6,
      economyLevel: 8,
    },
  });

  const workerStack12 = await prisma.district.upsert({
    where: { id: 'dist-pigeon95-worker-stack-12' },
    update: {},
    create: {
      id: 'dist-pigeon95-worker-stack-12',
      planetId: pigeon95.id,
      name: 'Worker Stack 12',
      description: 'Densely packed worker housing with underground union activity.',
      dangerLevel: 4,
      lawLevel: 4,
      economyLevel: 4,
    },
  });

  // Valerina districts
  const quietPerimeter = await prisma.district.upsert({
    where: { id: 'dist-valerina-quiet-perimeter' },
    update: {},
    create: {
      id: 'dist-valerina-quiet-perimeter',
      planetId: valerina.id,
      name: 'Quiet Perimeter',
      description: 'A buffer zone of frozen plains and sparse outposts.',
      dangerLevel: 5,
      lawLevel: 6,
      economyLevel: 3,
    },
  });

  const blacksiteMire = await prisma.district.upsert({
    where: { id: 'dist-valerina-blacksite-mire' },
    update: {},
    create: {
      id: 'dist-valerina-blacksite-mire',
      planetId: valerina.id,
      name: 'Blacksite Mire',
      description:
        'A classified government zone suspected to house Blue Orchard Biotech experiments.',
      dangerLevel: 8,
      lawLevel: 9,
      economyLevel: 2,
    },
  });

  console.log('✅ Districts: 10 districts across 5 planets');

  // ==================== FACTIONS ====================
  const redMarket = await prisma.faction.upsert({
    where: { name: 'Red Market' },
    update: {},
    create: {
      name: 'Red Market',
      description:
        'An underground trading network operating in contraband, information, and off-the-books logistics.',
      ideology: 'Profit above law. Freedom through commerce.',
      treasury: 50000,
      influence: 35,
    },
  });

  const coilUnion = await prisma.faction.upsert({
    where: { name: 'Coil Union' },
    update: {},
    create: {
      name: 'Coil Union',
      description:
        'A labor union spanning multiple planets, protecting worker rights against corporate exploitation.',
      ideology: 'Workers own the means. Solidarity before profit.',
      treasury: 20000,
      influence: 45,
    },
  });

  const glasswaterCivicAuthority = await prisma.faction.upsert({
    where: { name: 'Glasswater Civic Authority' },
    update: {},
    create: {
      name: 'Glasswater Civic Authority',
      description:
        'The governing civic body of Teraluma, projecting law, order, and subtle corporate influence.',
      ideology: 'Order. Progress. Civic duty.',
      treasury: 200000,
      influence: 70,
    },
  });

  const valerinaGhosts = await prisma.faction.upsert({
    where: { name: 'Valerina Ghosts' },
    update: {},
    create: {
      name: 'Valerina Ghosts',
      description:
        'A shadowy collective operating out of Valerina, rumored to know what is happening at the Blacksite.',
      ideology: 'Truth at any cost. Disappear to survive.',
      treasury: 8000,
      influence: 20,
    },
  });

  console.log('✅ Factions: Red Market, Coil Union, Glasswater Civic Authority, Valerina Ghosts');

  // ==================== CORPORATIONS ====================
  const pigeonCorp = await prisma.corporation.upsert({
    where: { name: 'Pigeon Corporation' },
    update: {},
    create: {
      name: 'Pigeon Corporation',
      description:
        'The dominant logistics and courier corporation in Hibaro-5. Controls most of Pigeon95.',
      industry: 'LOGISTICS',
      cash: 5000000,
      debt: 500000,
      revenue: 1200000,
      riskOfBankruptcy: 0.02,
      politicalInfluence: 60,
      status: 'STABLE',
      stockTicker: 'PGN',
      stockPrice: 142.5,
      stockVolatility: 0.08,
    },
  });

  const helixDynamics = await prisma.corporation.upsert({
    where: { name: 'Helix Dynamics' },
    update: {},
    create: {
      name: 'Helix Dynamics',
      description:
        'An energy and security conglomerate with a heavy presence on Antrolus and Teraluma.',
      industry: 'ENERGY',
      cash: 8000000,
      debt: 1000000,
      revenue: 2500000,
      riskOfBankruptcy: 0.05,
      politicalInfluence: 75,
      status: 'GROWING',
      stockTicker: 'HLX',
      stockPrice: 310.0,
      stockVolatility: 0.12,
    },
  });

  const blueOrchardBiotech = await prisma.corporation.upsert({
    where: { name: 'Blue Orchard Biotech' },
    update: {},
    create: {
      name: 'Blue Orchard Biotech',
      description: 'A medical and biotech corporation with classified projects on Valerina.',
      industry: 'MEDICAL',
      cash: 3000000,
      debt: 2000000,
      revenue: 900000,
      riskOfBankruptcy: 0.15,
      politicalInfluence: 40,
      status: 'STABLE',
      stockTicker: 'BOB',
      stockPrice: 85.0,
      stockVolatility: 0.2,
    },
  });

  const sunSpokeMedia = await prisma.corporation.upsert({
    where: { name: 'SunSpoke Media' },
    update: {},
    create: {
      name: 'SunSpoke Media',
      description:
        'The dominant media and advertising empire. Shapes public opinion across all planets.',
      industry: 'MEDIA',
      cash: 4000000,
      debt: 200000,
      revenue: 1800000,
      riskOfBankruptcy: 0.03,
      politicalInfluence: 85,
      status: 'STABLE',
      stockTicker: 'SSM',
      stockPrice: 220.0,
      stockVolatility: 0.06,
    },
  });

  console.log(
    '✅ Corporations: Pigeon Corporation, Helix Dynamics, Blue Orchard Biotech, SunSpoke Media',
  );

  // ==================== BUILDINGS ====================
  const startingStation = await prisma.building.upsert({
    where: { id: 'bldg-antrolus-arrival-hub' },
    update: {},
    create: {
      id: 'bldg-antrolus-arrival-hub',
      districtId: arrivalYard.id,
      name: 'Arrival Processing Hub',
      description:
        'The central hub for new arrivals to Antrolus. Services, kiosks, and transit info.',
      ownerType: 'SYSTEM',
      functionality: ['HUB', 'DOCK'],
      status: 'OPEN',
    },
  });

  const missionBoard = await prisma.building.upsert({
    where: { id: 'bldg-antrolus-mission-board' },
    update: {},
    create: {
      id: 'bldg-antrolus-mission-board',
      districtId: arrivalYard.id,
      name: 'Antrolus Mission Board',
      description: 'A public board posting gigs, jobs, and contracts for operators.',
      ownerType: 'SYSTEM',
      functionality: ['MISSION_BOARD', 'OFFICE'],
      status: 'OPEN',
    },
  });

  const workerBar = await prisma.building.upsert({
    where: { id: 'bldg-antrolus-worker-bar' },
    update: {},
    create: {
      id: 'bldg-antrolus-worker-bar',
      districtId: arrivalYard.id,
      name: 'Crank & Bolt Bar',
      description: 'A rough worker bar. Rumors circulate freely here.',
      ownerType: 'SYSTEM',
      functionality: ['BAR'],
      status: 'OPEN',
    },
  });

  const helixOffice = await prisma.building.upsert({
    where: { id: 'bldg-antrolus-helix-office' },
    update: {},
    create: {
      id: 'bldg-antrolus-helix-office',
      districtId: furnaceRow.id,
      name: 'Helix Dynamics Operations Office',
      description: 'The Antrolus operations office for Helix Dynamics.',
      ownerType: 'CORPORATION',
      ownerId: helixDynamics.id,
      functionality: ['OFFICE'],
      status: 'OPEN',
    },
  });

  const antrolusWarehouse = await prisma.building.upsert({
    where: { id: 'bldg-antrolus-warehouse' },
    update: {},
    create: {
      id: 'bldg-antrolus-warehouse',
      districtId: furnaceRow.id,
      name: 'Furnace Row Warehouse',
      description: 'A large industrial warehouse managed by Helix.',
      ownerType: 'CORPORATION',
      ownerId: helixDynamics.id,
      functionality: ['WAREHOUSE'],
      status: 'OPEN',
    },
  });

  const safehouse = await prisma.building.upsert({
    where: { id: 'bldg-antrolus-safehouse' },
    update: {},
    create: {
      id: 'bldg-antrolus-safehouse',
      districtId: arrivalYard.id,
      name: 'Red Market Safehouse',
      description: 'A discreet location for Red Market contacts.',
      ownerType: 'FACTION',
      ownerId: redMarket.id,
      functionality: ['SAFEHOUSE'],
      status: 'OPEN',
    },
  });

  const clinic = await prisma.building.upsert({
    where: { id: 'bldg-antrolus-clinic' },
    update: {},
    create: {
      id: 'bldg-antrolus-clinic',
      districtId: arrivalYard.id,
      name: 'Arrivals Clinic',
      description: 'A no-questions-asked medical clinic in Arrival Yard.',
      ownerType: 'SYSTEM',
      functionality: ['CLINIC'],
      status: 'OPEN',
    },
  });

  const dock = await prisma.building.upsert({
    where: { id: 'bldg-antrolus-dock' },
    update: {},
    create: {
      id: 'bldg-antrolus-dock',
      districtId: arrivalYard.id,
      name: 'Antrolus Transit Dock',
      description: 'Main shuttle dock for inter-district and inter-planet travel.',
      ownerType: 'SYSTEM',
      functionality: ['DOCK'],
      status: 'OPEN',
    },
  });

  const blackMarket = await prisma.building.upsert({
    where: { id: 'bldg-antrolus-black-market' },
    update: {},
    create: {
      id: 'bldg-antrolus-black-market',
      districtId: furnaceRow.id,
      name: 'Furnace Row Underground',
      description: 'A hidden black market operating under Furnace Row.',
      ownerType: 'FACTION',
      ownerId: redMarket.id,
      functionality: ['BLACK_MARKET', 'SHOP'],
      status: 'OPEN',
    },
  });

  // Update faction headquarters
  await prisma.faction.update({
    where: { id: redMarket.id },
    data: { headquartersBuildingId: safehouse.id },
  });

  // Update corporation headquarters
  await prisma.corporation.update({
    where: { id: helixDynamics.id },
    data: { headquartersBuildingId: helixOffice.id },
  });

  // Update districts controlling faction
  await prisma.district.update({
    where: { id: furnaceRow.id },
    data: { controllingFactionId: null }, // Helix controls but as corp, not faction
  });

  await prisma.district.update({
    where: { id: glasswaterCentral.id },
    data: { controllingFactionId: glasswaterCivicAuthority.id },
  });

  console.log('✅ Buildings: 9 buildings on Antrolus');

  // ==================== ITEM DEFINITIONS ====================
  const rustyPulsePistol = await prisma.itemDefinition.upsert({
    where: { name: 'Rusty Pulse Pistol' },
    update: {},
    create: {
      name: 'Rusty Pulse Pistol',
      description: 'A battered pulse pistol that still fires. Barely.',
      category: 'WEAPON',
      rarity: 'COMMON',
      baseValue: 45,
      weight: 1.2,
      weaponData: { damage: 8, range: 'SHORT', ammoType: 'PULSE_CELL' },
    },
  });

  const workerJacket = await prisma.itemDefinition.upsert({
    where: { name: 'Worker Jacket' },
    update: {},
    create: {
      name: 'Worker Jacket',
      description: 'Standard issue industrial jacket. Offers minor protection.',
      category: 'CLOTHING',
      rarity: 'COMMON',
      baseValue: 25,
      weight: 1.5,
      clothingData: { armor: 2, slot: 'TORSO' },
    },
  });

  const cheapHackingDeck = await prisma.itemDefinition.upsert({
    where: { name: 'Cheap Hacking Deck' },
    update: {},
    create: {
      name: 'Cheap Hacking Deck',
      description: 'A basic hacking interface. Clunky but functional.',
      category: 'TOOL',
      rarity: 'COMMON',
      baseValue: 80,
      weight: 0.5,
      toolData: { hackingBonus: 2, tier: 1 },
    },
  });

  const medicalPatch = await prisma.itemDefinition.upsert({
    where: { name: 'Medical Patch' },
    update: {},
    create: {
      name: 'Medical Patch',
      description: 'A single-use medical patch that restores 25 health.',
      category: 'CONSUMABLE',
      rarity: 'COMMON',
      baseValue: 30,
      weight: 0.1,
      effects: [{ type: 'MODIFY_STAT', key: 'health', value: 25 }],
    },
  });

  const pigeonCourierBadge = await prisma.itemDefinition.upsert({
    where: { name: 'Pigeon Courier Badge' },
    update: {},
    create: {
      name: 'Pigeon Courier Badge',
      description: 'Official Pigeon Corporation courier authorization badge.',
      category: 'QUEST_ITEM',
      rarity: 'UNCOMMON',
      baseValue: 0,
      weight: 0.05,
      requirements: [{ type: 'CORPORATION_REPUTATION_MIN', id: pigeonCorp.id, value: 5 }],
    },
  });

  const smugglerToolkit = await prisma.itemDefinition.upsert({
    where: { name: 'Smuggler Toolkit' },
    update: {},
    create: {
      name: 'Smuggler Toolkit',
      description: 'A set of tools for concealing cargo and bypassing customs scans.',
      category: 'TOOL',
      rarity: 'UNCOMMON',
      baseValue: 150,
      weight: 2.0,
      toolData: { stealthBonus: 3, concealmentCapacity: 5 },
    },
  });

  const antrolusTransitPass = await prisma.itemDefinition.upsert({
    where: { name: 'Antrolus Transit Pass' },
    update: {},
    create: {
      name: 'Antrolus Transit Pass',
      description: 'Grants access to inter-district transit on Antrolus.',
      category: 'QUEST_ITEM',
      rarity: 'COMMON',
      baseValue: 10,
      weight: 0.01,
    },
  });

  const brokenDronePart = await prisma.itemDefinition.upsert({
    where: { name: 'Broken Drone Part' },
    update: {},
    create: {
      name: 'Broken Drone Part',
      description: 'A salvaged drone component. Could be repaired or sold for parts.',
      category: 'MATERIAL',
      rarity: 'COMMON',
      baseValue: 15,
      weight: 0.8,
    },
  });

  const corporateAccessCard = await prisma.itemDefinition.upsert({
    where: { name: 'Corporate Access Card' },
    update: {},
    create: {
      name: 'Corporate Access Card',
      description: 'A corporate security card that grants building access.',
      category: 'TOOL',
      rarity: 'UNCOMMON',
      baseValue: 200,
      weight: 0.05,
    },
  });

  console.log('✅ Item definitions: 9 items');

  // ==================== SEED PLAYER & CHARACTER ====================
  const testPlayer = await prisma.player.upsert({
    where: { username: 'test_player' },
    update: {},
    create: {
      username: 'test_player',
      email: 'test@heliora.game',
    },
  });

  const novaRook = await prisma.character.upsert({
    where: { playerId: testPlayer.id },
    update: {},
    create: {
      name: 'Nova Rook',
      type: 'PLAYER',
      playerId: testPlayer.id,
      currentPlanetId: antrolus.id,
      currentDistrictId: arrivalYard.id,
      currentBuildingId: startingStation.id,
      credits: 250,
      health: 100,
      maxHealth: 100,
      energy: 100,
      maxEnergy: 100,
      wantedLevel: 0,
      strength: 6,
      agility: 5,
      intelligence: 7,
      charisma: 6,
      hacking: 5,
      combat: 5,
      stealth: 5,
      engineering: 6,
      reputation: 0,
    },
  });

  // Give Nova Rook some starting items
  const existingItems = await prisma.itemInstance.findMany({
    where: { ownerType: 'CHARACTER', ownerId: novaRook.id },
  });

  if (existingItems.length === 0) {
    await prisma.itemInstance.createMany({
      data: [
        {
          itemDefinitionId: workerJacket.id,
          ownerType: 'CHARACTER',
          ownerId: novaRook.id,
          condition: 75,
        },
        {
          itemDefinitionId: medicalPatch.id,
          ownerType: 'CHARACTER',
          ownerId: novaRook.id,
          condition: 100,
        },
        {
          itemDefinitionId: antrolusTransitPass.id,
          ownerType: 'CHARACTER',
          ownerId: novaRook.id,
          condition: 100,
        },
      ],
    });
  }

  // Initial activity log
  await prisma.activityLog.upsert({
    where: { id: 'log-nova-rook-arrival' },
    update: {},
    create: {
      id: 'log-nova-rook-arrival',
      playerId: testPlayer.id,
      characterId: novaRook.id,
      type: 'LOGIN',
      message: 'Nova Rook arrived at Antrolus Arrival Yard.',
      relatedEntities: { planetId: antrolus.id, districtId: arrivalYard.id },
    },
  });

  console.log(`✅ Test player: test_player | Character: Nova Rook (id: ${novaRook.id})`);

  const courierShade = await prisma.character.upsert({
    where: { id: 'npc-courier-shade' },
    update: {},
    create: {
      id: 'npc-courier-shade',
      name: 'Courier Shade',
      type: 'NPC',
      currentPlanetId: antrolus.id,
      currentDistrictId: arrivalYard.id,
      currentBuildingId: startingStation.id,
      credits: 180,
      hacking: 7,
      engineering: 6,
      agility: 7,
      charisma: 4,
      stealth: 6,
    },
  });

  const unionSpark = await prisma.character.upsert({
    where: { id: 'npc-union-spark' },
    update: {},
    create: {
      id: 'npc-union-spark',
      name: 'Union Spark',
      type: 'NPC',
      currentPlanetId: antrolus.id,
      currentDistrictId: arrivalYard.id,
      currentBuildingId: startingStation.id,
      credits: 95,
      strength: 7,
      engineering: 7,
      charisma: 7,
      stealth: 4,
    },
  });

  const ghostVector = await prisma.character.upsert({
    where: { id: 'npc-ghost-vector' },
    update: {},
    create: {
      id: 'npc-ghost-vector',
      name: 'Ghost Vector',
      type: 'NPC',
      currentPlanetId: teraluma.id,
      currentDistrictId: glasswaterCentral.id,
      credits: 140,
      intelligence: 8,
      hacking: 8,
      stealth: 8,
      charisma: 5,
    },
  });

  await prisma.factionMembership.upsert({
    where: {
      factionId_characterId: {
        factionId: coilUnion.id,
        characterId: unionSpark.id,
      },
    },
    update: {},
    create: {
      factionId: coilUnion.id,
      characterId: unionSpark.id,
      rankName: 'Organizer',
      loyalty: 68,
      reputation: 14,
    },
  });

  await prisma.factionMembership.upsert({
    where: {
      factionId_characterId: {
        factionId: valerinaGhosts.id,
        characterId: ghostVector.id,
      },
    },
    update: {},
    create: {
      factionId: valerinaGhosts.id,
      characterId: ghostVector.id,
      rankName: 'Whisper',
      loyalty: 72,
      reputation: 18,
    },
  });

  await prisma.corporationEmployment.upsert({
    where: {
      corporationId_characterId: {
        corporationId: pigeonCorp.id,
        characterId: courierShade.id,
      },
    },
    update: {},
    create: {
      corporationId: pigeonCorp.id,
      characterId: courierShade.id,
      role: 'Courier',
      salary: 48,
      rank: 'Route Specialist',
    },
  });

  await prisma.relationship.upsert({
    where: {
      sourceType_sourceId_targetType_targetId_relationshipType: {
        sourceType: 'CHARACTER',
        sourceId: courierShade.id,
        targetType: 'CORPORATION',
        targetId: pigeonCorp.id,
        relationshipType: 'LOYALTY',
      },
    },
    update: { value: 18 },
    create: {
      sourceType: 'CHARACTER',
      sourceId: courierShade.id,
      targetType: 'CORPORATION',
      targetId: pigeonCorp.id,
      relationshipType: 'LOYALTY',
      value: 18,
    },
  });

  await prisma.relationship.upsert({
    where: {
      sourceType_sourceId_targetType_targetId_relationshipType: {
        sourceType: 'CHARACTER',
        sourceId: unionSpark.id,
        targetType: 'FACTION',
        targetId: coilUnion.id,
        relationshipType: 'INFLUENCE',
      },
    },
    update: { value: 12 },
    create: {
      sourceType: 'CHARACTER',
      sourceId: unionSpark.id,
      targetType: 'FACTION',
      targetId: coilUnion.id,
      relationshipType: 'INFLUENCE',
      value: 12,
    },
  });

  await prisma.relationship.upsert({
    where: {
      sourceType_sourceId_targetType_targetId_relationshipType: {
        sourceType: 'CHARACTER',
        sourceId: ghostVector.id,
        targetType: 'FACTION',
        targetId: valerinaGhosts.id,
        relationshipType: 'TRUST',
      },
    },
    update: { value: 16 },
    create: {
      sourceType: 'CHARACTER',
      sourceId: ghostVector.id,
      targetType: 'FACTION',
      targetId: valerinaGhosts.id,
      relationshipType: 'TRUST',
      value: 16,
    },
  });

  await prisma.activityLog.upsert({
    where: { id: 'log-courier-shade-shift' },
    update: {},
    create: {
      id: 'log-courier-shade-shift',
      characterId: courierShade.id,
      type: 'JOB_COMPLETED',
      message: 'Courier Shade completed a priority route for Pigeon Corporation.',
      relatedEntities: {
        targetType: 'CORPORATION',
        targetId: pigeonCorp.id,
        targetName: pigeonCorp.name,
      },
    },
  });

  await prisma.activityLog.upsert({
    where: { id: 'log-union-spark-rally' },
    update: {},
    create: {
      id: 'log-union-spark-rally',
      characterId: unionSpark.id,
      type: 'RELATIONSHIP_CHANGED',
      message: 'Union Spark rallied dock workers for the Coil Union.',
      relatedEntities: {
        targetType: 'FACTION',
        targetId: coilUnion.id,
        targetName: coilUnion.name,
      },
    },
  });

  await prisma.activityLog.upsert({
    where: { id: 'log-ghost-vector-whisper' },
    update: {},
    create: {
      id: 'log-ghost-vector-whisper',
      characterId: ghostVector.id,
      type: 'WORLD_EVENT_TRIGGERED',
      message: 'Ghost Vector seeded a rumor network across Valerina.',
      relatedEntities: {
        targetType: 'FACTION',
        targetId: valerinaGhosts.id,
        targetName: valerinaGhosts.name,
      },
    },
  });

  console.log('✅ NPC actors: Courier Shade, Union Spark, Ghost Vector');

  // ==================== OPPORTUNITY DEFINITIONS ====================

  // GIG 1: Move the Medical Crates
  await prisma.opportunityDefinition.upsert({
    where: { id: 'opp-move-medical-crates' },
    update: {},
    create: {
      id: 'opp-move-medical-crates',
      title: 'Move the Medical Crates',
      description:
        'Red Market needs someone to quietly move a shipment of medical supplies through Arrival Yard. No questions asked.',
      kind: 'GIG',
      postedByType: 'FACTION',
      postedById: redMarket.id,
      type: 'SMUGGLING',
      requirements: [{ type: 'STAT_MIN', key: 'stealth', value: 5 }],
      durationMinutes: 10,
      difficulty: 2,
      rewards: [
        { type: 'CREDITS', value: 300 },
        { type: 'FACTION_REPUTATION', factionId: redMarket.id, value: 5 },
        { type: 'CORPORATION_REPUTATION', corporationId: helixDynamics.id, value: -2 },
      ],
      risks: [
        {
          level: 'MEDIUM',
          type: 'LEGAL',
          probability: 0.3,
          consequences: [{ type: 'MODIFY_WANTED_LEVEL', value: 1 }],
        },
      ],
      possibleEventIds: [],
    },
  });

  // GIG 2: Patch the Furnace Sensors
  await prisma.opportunityDefinition.upsert({
    where: { id: 'opp-patch-furnace-sensors' },
    update: {},
    create: {
      id: 'opp-patch-furnace-sensors',
      title: 'Patch the Furnace Sensors',
      description:
        'Helix Dynamics needs a technician to patch malfunctioning environmental sensors in Furnace Row.',
      kind: 'GIG',
      postedByType: 'CORPORATION',
      postedById: helixDynamics.id,
      type: 'REPAIR',
      requirements: [{ type: 'STAT_MIN', key: 'engineering', value: 5 }],
      durationMinutes: 15,
      difficulty: 2,
      rewards: [
        { type: 'CREDITS', value: 350 },
        { type: 'CORPORATION_REPUTATION', corporationId: helixDynamics.id, value: 5 },
        { type: 'FACTION_REPUTATION', factionId: coilUnion.id, value: -1 },
      ],
      risks: [
        {
          level: 'LOW',
          type: 'INJURY',
          probability: 0.15,
          consequences: [{ type: 'MODIFY_STAT', key: 'health', value: -15 }],
        },
      ],
      possibleEventIds: [],
    },
  });

  // JOB 1: Worker Shift at Furnace Row
  await prisma.opportunityDefinition.upsert({
    where: { id: 'opp-furnace-worker-shift' },
    update: {},
    create: {
      id: 'opp-furnace-worker-shift',
      title: 'Worker Shift at Furnace Row',
      description:
        'A standard labor shift at the Helix Dynamics refineries. Hard work, steady pay.',
      kind: 'JOB',
      postedByType: 'CORPORATION',
      postedById: helixDynamics.id,
      type: 'REPAIR',
      requirements: [],
      durationMinutes: 30,
      difficulty: 1,
      rewards: [
        { type: 'CREDITS', value: 200 },
        { type: 'STAT_XP', key: 'engineering', value: 1 },
      ],
      risks: [],
      possibleEventIds: [],
      repeatability: { type: 'DAILY' },
    },
  });

  // JOB 2: Courier Loop
  await prisma.opportunityDefinition.upsert({
    where: { id: 'opp-courier-loop' },
    update: {},
    create: {
      id: 'opp-courier-loop',
      title: 'Courier Loop',
      description: 'Run delivery routes for Pigeon Corporation around Antrolus.',
      kind: 'JOB',
      postedByType: 'CORPORATION',
      postedById: pigeonCorp.id,
      type: 'DELIVERY',
      requirements: [],
      durationMinutes: 20,
      difficulty: 1,
      rewards: [
        { type: 'CREDITS', value: 180 },
        { type: 'CORPORATION_REPUTATION', corporationId: pigeonCorp.id, value: 2 },
      ],
      risks: [],
      possibleEventIds: [],
      repeatability: { type: 'COOLDOWN', cooldownHours: 4 },
    },
  });

  // QUEST 1: Welcome to Antrolus
  await prisma.opportunityDefinition.upsert({
    where: { id: 'opp-quest-welcome-antrolus' },
    update: {},
    create: {
      id: 'opp-quest-welcome-antrolus',
      title: 'Welcome to Antrolus',
      description:
        'Get your bearings. Complete your first gig on Antrolus and prove you can survive.',
      kind: 'QUEST',
      postedByType: 'SYSTEM',
      type: 'STORY',
      requirements: [],
      durationMinutes: null,
      difficulty: 1,
      rewards: [
        { type: 'CREDITS', value: 100 },
        { type: 'UNLOCK_BUILDING', buildingId: 'bldg-antrolus-black-market' },
      ],
      risks: [],
      possibleEventIds: [],
      questData: {
        objectives: [{ type: 'COMPLETE_GIG_ON_PLANET', planetId: antrolus.id, count: 1 }],
        isOneOff: true,
      },
    },
  });

  // QUEST 2: Something in the Cargo
  await prisma.opportunityDefinition.upsert({
    where: { id: 'opp-quest-something-in-cargo' },
    update: {},
    create: {
      id: 'opp-quest-something-in-cargo',
      title: 'Something in the Cargo',
      description:
        'The Coil Union intercepted something unusual in a Pigeon shipment. Find out what it is.',
      kind: 'QUEST',
      postedByType: 'FACTION',
      postedById: coilUnion.id,
      type: 'STORY',
      requirements: [],
      durationMinutes: null,
      difficulty: 2,
      rewards: [
        { type: 'FACTION_REPUTATION', factionId: coilUnion.id, value: 5 },
        { type: 'UNLOCK_QUEST', questId: 'opp-quest-pigeon95-secret' },
      ],
      risks: [],
      possibleEventIds: [],
      questData: {
        objectives: [{ type: 'COMPLETE_JOB', jobId: 'opp-courier-loop', count: 1 }],
        isOneOff: true,
        hint: 'Start by taking on courier work for Pigeon Corporation.',
      },
    },
  });

  console.log('✅ Opportunity definitions: 2 gigs, 2 jobs, 2 quests');

  // ==================== WORLD EVENTS ====================
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  await prisma.worldEvent.upsert({
    where: { id: 'event-antrolus-checkpoint-sweep' },
    update: {},
    create: {
      id: 'event-antrolus-checkpoint-sweep',
      title: 'Antrolus Checkpoint Sweep',
      description:
        'Law enforcement has set up random checkpoints across Antrolus. Smuggling risk is elevated.',
      scope: 'PLANET',
      affectedEntities: [{ type: 'PLANET', id: antrolus.id }],
      requirements: [],
      effects: [{ type: 'MODIFY_RISK', target: 'SMUGGLING', modifier: 0.2 }],
      startsAt: now,
      endsAt: in24h,
      status: 'ACTIVE',
    },
  });

  await prisma.worldEvent.upsert({
    where: { id: 'event-pigeon95-warehouse-delay' },
    update: {},
    create: {
      id: 'event-pigeon95-warehouse-delay',
      title: 'Pigeon95 Warehouse Delay',
      description:
        'A logistics backlog at Pigeon95 Fulfilment Core is causing delays in deliveries.',
      scope: 'DISTRICT',
      affectedEntities: [{ type: 'DISTRICT', id: fulfilmentCore.id }],
      requirements: [],
      effects: [{ type: 'MODIFY_REWARD', target: 'DELIVERY', modifier: -0.1 }],
      startsAt: now,
      endsAt: in48h,
      status: 'ACTIVE',
    },
  });

  await prisma.worldEvent.upsert({
    where: { id: 'event-los-panko-gang-tension' },
    update: {},
    create: {
      id: 'event-los-panko-gang-tension',
      title: 'Los Panko Gang Tension',
      description:
        'Rival factions are clashing in the Crooked Marina. Danger level temporarily elevated.',
      scope: 'DISTRICT',
      affectedEntities: [{ type: 'DISTRICT', id: crookedMarina.id }],
      requirements: [],
      effects: [{ type: 'MODIFY_DANGER', target: crookedMarina.id, modifier: 2 }],
      startsAt: in24h,
      endsAt: in48h,
      status: 'SCHEDULED',
    },
  });

  await prisma.worldEvent.upsert({
    where: { id: 'event-valerina-signal-leak' },
    update: {},
    create: {
      id: 'event-valerina-signal-leak',
      title: 'Valerina Signal Leak',
      description:
        'An encrypted signal has leaked from the Blacksite Mire. The Valerina Ghosts are investigating.',
      scope: 'DISTRICT',
      affectedEntities: [{ type: 'DISTRICT', id: blacksiteMire.id }],
      requirements: [],
      effects: [{ type: 'SPAWN_EVENT', eventId: 'event-ghost-investigation' }],
      startsAt: in48h,
      status: 'SCHEDULED',
    },
  });

  await prisma.worldEvent.upsert({
    where: { id: 'event-teraluma-market-rally' },
    update: {},
    create: {
      id: 'event-teraluma-market-rally',
      title: 'Teraluma Market Rally',
      description:
        'Markets on Teraluma are surging. SunSpoke Media is reporting record-high civic satisfaction.',
      scope: 'PLANET',
      affectedEntities: [{ type: 'PLANET', id: teraluma.id }],
      requirements: [],
      effects: [{ type: 'MODIFY_ECONOMY', target: teraluma.id, modifier: 0.15 }],
      startsAt: in24h,
      endsAt: in48h,
      status: 'SCHEDULED',
    },
  });

  console.log('✅ World events: 5 events seeded');

  console.log('\n🎮 Heliora seed complete!');
  console.log(`   Player ID: ${testPlayer.id}`);
  console.log(`   Character ID: ${novaRook.id}`);
  console.log('   Location: Antrolus / Arrival Yard / Arrival Processing Hub');
  console.log('   Credits: 250 | Health: 100/100');
  console.log('\n   Use these IDs to test the API!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
