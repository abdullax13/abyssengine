const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Player = require("./Player");

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

    const embed = new EmbedBuilder()
      .setTitle(`Profile: ${p.name}`)
      .addFields(
        { name: "Class", value: p.class, inline: true },
        { name: "Gender", value: p.gender, inline: true },
        { name: "Level", value: String(p.level), inline: true },
        { name: "XP", value: String(p.xp), inline: true },
        { name: "HP", value: String(p.hp), inline: true },
        { name: "Mana", value: String(p.mana), inline: true },
        { name: "Gold", value: String(p.gold), inline: true }
      )
      .setFooter({ text: `User: ${interaction.user.username}` });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
