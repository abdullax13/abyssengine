const { randomUUID } = require("crypto");

// نسب الـTier حسب الدنجن (تقدر نعدّلها بسهولة)
const TIER_RATES_BY_DUNGEON = {
  1: { common: 0.65, uncommon: 0.22, rare: 0.10, epic: 0.025, legendary: 0.005 },
  2: { common: 0.55, uncommon: 0.25, rare: 0.14, epic: 0.045, legendary: 0.01 },
  3: { common: 0.45, uncommon: 0.28, rare: 0.18, epic: 0.07, legendary: 0.02 },
  4: { common: 0.35, uncommon: 0.30, rare: 0.22, epic: 0.10, legendary: 0.03 }
};

// نسبة ظهور خصائص خاصة (crit/skillPower/manaRegen)
// أقل من نسب الـtier، مثل ما تبي
const SPECIAL_AFFIX_RATE_BY_TIER = {
  common: 0.00,
  uncommon: 0.05,
  rare: 0.12,
  epic: 0.20,
  legendary: 0.30
};

// معدات “معروفة” (مو عشوائية كل مرة)
// نبدأ قليلة ثم نزيدها لاحقاً
const BASE_ITEMS = {
  warrior: {
    weapon: [
      { baseId: "warrior_sword_1", name: "Iron Sword", slot: "weapon" },
      { baseId: "warrior_sword_2", name: "Steel Sword", slot: "weapon" }
    ],
    armor: [
      { baseId: "warrior_armor_1", name: "Leather Armor", slot: "armor" },
      { baseId: "warrior_armor_2", name: "Chain Armor", slot: "armor" }
    ],
    helmet: [
      { baseId: "warrior_helm_1", name: "Leather Helm", slot: "helmet" },
      { baseId: "warrior_helm_2", name: "Iron Helm", slot: "helmet" }
    ]
  },
  mage: {
    weapon: [
      { baseId: "mage_staff_1", name: "Oak Staff", slot: "weapon" },
      { baseId: "mage_staff_2", name: "Rune Staff", slot: "weapon" }
    ],
    armor: [
      { baseId: "mage_robe_1", name: "Apprentice Robe", slot: "armor" },
      { baseId: "mage_robe_2", name: "Arcane Robe", slot: "armor" }
    ],
    helmet: [
      { baseId: "mage_hat_1", name: "Cloth Hood", slot: "helmet" },
      { baseId: "mage_hat_2", name: "Mystic Hat", slot: "helmet" }
    ]
  }
};

function pickWeighted(map) {
  const r = Math.random();
  let acc = 0;
  for (const [k, v] of Object.entries(map)) {
    acc += v;
    if (r <= acc) return k;
  }
  return Object.keys(map)[0];
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// scaling بسيط حسب dungeonTier + level
function baseStatRoll(slot, tier, dungeonTier, level) {
  const tierMult = {
    common: 1.0,
    uncommon: 1.15,
    rare: 1.35,
    epic: 1.60,
    legendary: 2.0
  }[tier];

  const dMult = 1 + (dungeonTier - 1) * 0.25;
  const lMult = 1 + Math.min(level, 30) * 0.03;

  // قيم أساسية مختلفة حسب نوع القطعة
  if (slot === "weapon") {
    const atk = Math.round(rand(3, 6) * tierMult * dMult * lMult);
    return { atk };
  }
  if (slot === "armor") {
    const def = Math.round(rand(2, 5) * tierMult * dMult * lMult);
    const hp = Math.round(rand(5, 12) * tierMult * dMult * lMult);
    return { def, hp };
  }
  // helmet
  const mana = Math.round(rand(4, 10) * tierMult * dMult * lMult);
  const hp = Math.round(rand(3, 8) * tierMult * dMult * lMult);
  return { mana, hp };
}

function specialAffixRoll(tier) {
  // نختار affix واحد أو اثنين بالحد الأقصى (حسب tier)
  const chance = SPECIAL_AFFIX_RATE_BY_TIER[tier] || 0;
  if (Math.random() > chance) return {};

  const pool = ["crit", "skillPower", "manaRegen"];
  const pick1 = pool[rand(0, pool.length - 1)];
  let pick2 = null;

  // epic/legendary ممكن ياخذون اثنين
  if ((tier === "epic" || tier === "legendary") && Math.random() < 0.35) {
    do pick2 = pool[rand(0, pool.length - 1)];
    while (pick2 === pick1);
  }

  const out = {};
  for (const k of [pick1, pick2].filter(Boolean)) {
    if (k === "crit") out.crit = rand(1, tier === "legendary" ? 8 : 5); // %
    if (k === "skillPower") out.skillPower = rand(2, tier === "legendary" ? 12 : 8); // %
    if (k === "manaRegen") out.manaRegen = rand(1, tier === "legendary" ? 5 : 3);
  }
  return out;
}

// Materials per dungeon (فرم + نادر)
const MATERIAL_TABLE = {
  1: [
    { id: "core", name: "Core", min: 1, max: 3, chance: 0.90 },
    { id: "slime_gel", name: "Slime Gel", min: 1, max: 2, chance: 0.35 }
  ],
  2: [
    { id: "core", name: "Core", min: 2, max: 4, chance: 0.90 },
    { id: "crypt_bone", name: "Crypt Bone", min: 1, max: 2, chance: 0.30 }
  ],
  3: [
    { id: "core", name: "Core", min: 3, max: 5, chance: 0.90 },
    { id: "abyss_shard", name: "Abyss Shard", min: 1, max: 2, chance: 0.25 }
  ],
  4: [
    { id: "core", name: "Core", min: 4, max: 6, chance: 0.90 },
    { id: "void_essence", name: "Void Essence", min: 1, max: 1, chance: 0.18 }
  ]
};

function rollMaterials(dungeonTier) {
  const drops = [];
  for (const m of MATERIAL_TABLE[dungeonTier] || []) {
    if (Math.random() <= m.chance) {
      drops.push({
        id: m.id,
        name: m.name,
        qty: rand(m.min, m.max)
      });
    }
  }
  return drops;
}

function rollItem(playerClass, dungeonTier, level) {
  const rates = TIER_RATES_BY_DUNGEON[dungeonTier] || TIER_RATES_BY_DUNGEON[1];
  const tier = pickWeighted(rates);

  // slot random
  const slots = ["weapon", "armor", "helmet"];
  const slot = slots[rand(0, slots.length - 1)];

  const candidates = BASE_ITEMS[playerClass]?.[slot] || [];
  const base = candidates[rand(0, candidates.length - 1)];

  const baseStats = baseStatRoll(slot, tier, dungeonTier, level);
  const special = specialAffixRoll(tier);

  return {
    uid: randomUUID(),
    baseId: base.baseId,
    name: base.name,
    slot,
    tier,
    levelReq: Math.max(1, level - 2),
    dungeonTier,
    upgradeLevel: 0,
    stats: baseStats,
    special
  };
}

module.exports = { rollItem, rollMaterials };
