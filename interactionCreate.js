module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(interaction, client) {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(err);

        // إذا الرد تم بالفعل (مثلاً deferReply) نتعامل معها
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: "Error executing command.",
              ephemeral: true
            });
          } else {
            await interaction.reply({
              content: "Error executing command.",
              ephemeral: true
            });
          }
        } catch (_) {}
      }
      return;
    }

    // Buttons (Dungeon)
    if (interaction.isButton()) {
      // كل أزرار الدنجن تبدأ بـ d_
      if (!interaction.customId.startsWith("d_")) return;

      const dungeon = client.commands.get("dungeon");
      if (!dungeon || typeof dungeon.onButton !== "function") {
        return interaction.reply({
          content: "Dungeon handler missing. Redeploy the bot.",
          ephemeral: true
        });
      }

      try {
        await dungeon.onButton(interaction);
      } catch (err) {
        console.error(err);
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: "Error executing button.",
              ephemeral: true
            });
          } else {
            await interaction.reply({
              content: "Error executing button.",
              ephemeral: true
            });
          }
        } catch (_) {}
      }
    }
  }
};
