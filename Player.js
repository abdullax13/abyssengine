const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },

  name: { type: String, required: true },
  gender: { type: String, enum: ["male", "female"], required: true },
  class: {
    type: String,
    enum: ["warrior", "mage", "assassin", "guardian"],
    required: true
  },

  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },

  hp: { type: Number, default: 100 },
  mana: { type: Number, default: 50 },
  gold: { type: Number, default: 0 }

}, { timestamps: true });

PlayerSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Player", PlayerSchema);
