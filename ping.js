const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency"),
  async execute(interaction) {
    const ms = Date.now() - interaction.createdTimestamp;
    await interaction.reply({
      content: `pong (${ms}ms)`,
      ephemeral: true
    });
  }
};
