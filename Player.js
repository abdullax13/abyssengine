const mongoose = require("mongoose");

const StatSchema = new mongoose.Schema(
  {
    hp: { type: Number, default: 0 },
    mana: { type: Number, default: 0 },
    atk: { type: Number, default: 0 },
    def: { type: Number, default: 0 },

    // special
    crit: { type: Number, default: 0 },       // %
    skillPower: { type: Number, default: 0 }, // %
    manaRegen: { type: Number, default: 0 }   // flat per fight (later per turn)
  },
  { _id: false }
);

const ItemSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true }, // unique id for this copy
    baseId: { type: String, required: true }, // e.g. "warrior_sword_1"
    name: { type: String, required: true },

    slot: { type: String, enum: ["weapon", "armor", "helmet"], required: true },
    tier: { type: String, enum: ["common", "uncommon", "rare", "epic", "legendary"], required: true },

    levelReq: { type: Number, default: 1 },
    dungeonTier: { type: Number, default: 1 }, // 1..4 maps to your dungeon ranges

    upgradeLevel: { type: Number, default: 0 }, // +0 .. +N
    stats: { type: StatSchema, default: () => ({}) },  // base stats
    special: { type: StatSchema, default: () => ({}) } // rare affixes only (crit/skillPower/manaRegen)
  },
  { _id: false }
);

const MaterialStackSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },  // e.g. "core", "slime_gel"
    name: { type: String, required: true },
    qty: { type: Number, default: 0 }
  },
  { _id: false }
);

const PlayerSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },

    // ثابت للصور لاحقاً
    baseCharacterId: { type: Number, required: true }, // 1..4

    name: { type: String, required: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    class: { type: String, enum: ["warrior", "mage"], required: true },

    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },

    hp: { type: Number, default: 100 },
    hpMax: { type: Number, default: 100 },

    mana: { type: Number, default: 50 },
    manaMax: { type: Number, default: 50 },

    equipment: {
      weapon: { type: ItemSchema, default: null },
      armor: { type: ItemSchema, default: null },
      helmet: { type: ItemSchema, default: null }
    },

    inventory: { type: [ItemSchema], default: [] },
    materials: { type: [MaterialStackSchema], default: [] }
  },
  { timestamps: true }
);

PlayerSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Player", PlayerSchema);
