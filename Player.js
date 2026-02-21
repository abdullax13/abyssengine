const mongoose = require("mongoose");

const ItemStatsSchema = new mongoose.Schema(
  {
    atk: { type: Number, default: 0 },
    def: { type: Number, default: 0 },
    hp: { type: Number, default: 0 },
    mana: { type: Number, default: 0 },

    // special stats (rare)
    crit: { type: Number, default: 0 },        // percentage e.g. 3 = 3%
    skillPower: { type: Number, default: 0 },  // percentage
    manaRegen: { type: Number, default: 0 }    // flat per fight/turn later
  },
  { _id: false }
);

const ItemSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true }, // unique id in inventory
    templateId: { type: String, required: true }, // fixed template (predefined)
    name: { type: String, required: true },
    type: { type: String, enum: ["weapon", "armor", "helmet"], required: true },
    tier: { type: String, enum: ["common", "uncommon", "rare", "epic", "legendary"], required: true },

    levelReq: { type: Number, default: 1 },
    upgradeLevel: { type: Number, default: 0 },

    stats: { type: ItemStatsSchema, default: () => ({}) }
  },
  { _id: false }
);

const MaterialSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },   // e.g. "slime_core"
    name: { type: String, required: true },
    qty: { type: Number, default: 0 }
  },
  { _id: false }
);

const PlayerSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },

    // ثابت لمنع تغيّر شكل الشخصية مستقبلاً
    baseCharacterId: { type: Number, default: 1 }, // 1..4 later

    name: { type: String, required: true },
    gender: { type: String, enum: ["male", "female"], default: "male" },
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
    materials: { type: [MaterialSchema], default: [] }
  },
  { timestamps: true }
);

PlayerSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Player", PlayerSchema);
