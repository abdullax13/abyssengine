const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  id: String,
  name: String,
  type: String, // weapon, armor, helmet
  tier: String, // common, rare, epic
  stats: {
    atk: { type: Number, default: 0 },
    def: { type: Number, default: 0 },
    hp: { type: Number, default: 0 },
    mana: { type: Number, default: 0 }
  }
});

const playerSchema = new mongoose.Schema({
  guildId: String,
  userId: String,

  baseCharacterId: Number,

  name: String,
  class: String,
  gender: String,

  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  gold: { type: Number, default: 0 },

  hp: Number,
  hpMax: Number,
  mana: Number,
  manaMax: Number,

  equipment: {
    weapon: itemSchema,
    armor: itemSchema,
    helmet: itemSchema
  },

  inventory: [itemSchema]
});

module.exports = mongoose.model("Player", playerSchema);
