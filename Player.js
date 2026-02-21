const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },

    name: { type: String, required: true },
    gender: { type: String, enum: ["male", "female"], default: "male" },
    class: { type: String, enum: ["warrior", "mage"], required: true },

    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },

    hp: { type: Number, default: 100 },
    hpMax: { type: Number, default: 100 },

    mana: { type: Number, default: 50 },
    manaMax: { type: Number, default: 50 },

    gold: { type: Number, default: 0 },

    // v1 equipment placeholders (for future image layers)
    equipment: {
      head: { type: String, default: null },
      weapon: { type: String, default: null },
      chest: { type: String, default: null }
    }
  },
  { timestamps: true }
);

PlayerSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Player", PlayerSchema);
