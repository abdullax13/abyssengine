const { SlashCommandBuilder } = require("discord.js");
const Player = require("./Player");

const baseIdMap = {
  warrior: { male: 1, female: 2 },
  mage: { male: 3, female: 4 }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("start")
    .setDescription("Create your character")
    .addStringOption(opt =>
      opt.setName("name").setDescription("Character name").setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("gender")
        .setDescription("Gender")
        .setRequired(true)
        .addChoices(
          { name: "Male", value: "male" },
          { name: "Female", value: "female" }
        )
    )
    .addStringOption(opt =>
      opt.setName("class")
        .setDescription("Class")
        .setRequired(true)
        .addChoices(
          { name: "Warrior", value: "warrior" },
          { name: "Mage", value: "mage" }
        )
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    const name = interaction.options.getString("name");
    const gender = interaction.options.getString("gender");
    const klass = interaction.options.getString("class");

    const existing = await Player.findOne({ guildId, userId });
    if (existing) {
      return interaction.reply({
        content: "You already have a character.",
        ephemeral: true
      });
    }

    const baseCharacterId = baseIdMap?.[klass]?.[gender];
    if (!baseCharacterId) {
      return interaction.reply({
        content: "Invalid class/gender selection.",
        ephemeral: true
      });
    }

    // initial stats (v1)
    const initial =
      klass === "warrior"
        ? { hpMax: 120, manaMax: 35 }
        : { hpMax: 90, manaMax: 70 };

    await Player.create({
      guildId,
      userId,
      baseCharacterId,
      name,
      gender,
      class: klass,
      level: 1,
      xp: 0,
      gold: 0,
      hpMax: initial.hpMax,
      hp: initial.hpMax,
      manaMax: initial.manaMax,
      mana: initial.manaMax,
      equipment: { weapon: null, armor: null, helmet: null },
      inventory: [],
      materials: []
    });

    await interaction.reply({
      content: `Character ${name} created successfully.`,
      ephemeral: true
    });
  }
};
