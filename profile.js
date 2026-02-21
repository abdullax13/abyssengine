const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Player = require("./Player");
const { generateProfileCard } = require("./profileCard");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Show your character profile"),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    const p = await Player.findOne({ guildId, userId });
    if (!p) {
      return interaction.reply({
        content: "ما عندك شخصية. استخدم /start أولاً.",
        ephemeral: true
      });
    }

    const image = await generateProfileCard(p);

return interaction.reply({
  files: [{ attachment: image, name: "profile.png" }],
  ephemeral: true
});
