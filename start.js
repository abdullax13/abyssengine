const { SlashCommandBuilder } = require("discord.js");
const Player = require("./Player");

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
          { name: "Mage", value: "mage" },
          { name: "Assassin", value: "assassin" },
          { name: "Guardian", value: "guardian" }
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

    await Player.create({
      guildId,
      userId,
      name,
      gender,
      class: klass
    });

    await interaction.reply({
      content: `Character ${name} created successfully.`,
      ephemeral: true
    });
  }
};
