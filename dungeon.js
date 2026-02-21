const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const Player = require("./Player");
const { bar, xpToNextLevel } = require("./bar");

// in-memory combats (v1). Later we can persist if needed.
const fights = new Map(); // key: `${guildId}:${userId}`

function keyOf(interaction) {
  return `${interaction.guildId}:${interaction.user.id}`;
}

function roll(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function classStats(p) {
  // base stats; later derived from equipment
  if (p.class === "warrior") {
    return { atkMin: 10, atkMax: 16, def: 3, skillCost: 0 };
  }
  // mage
  return { atkMin: 8, atkMax: 14, def: 1, skillCost: 10 };
}

function makeMonsterForLevel(level) {
  // v1 simple scaling
  const hp = 60 + level * 12;
  const atkMin = 6 + Math.floor(level * 1.3);
  const atkMax = 10 + Math.floor(level * 1.6);

  return {
    name: level < 5 ? "Cave Slime" : level < 10 ? "Crypt Ghoul" : "Abyss Sentinel",
    level,
    hp,
    hpMax: hp,
    atkMin,
    atkMax
  };
}

function renderEmbed(p, m, logLines) {
  const pHpLine = `${p.hp}/${p.hpMax}  ${bar(p.hp, p.hpMax)}`;
  const pManaLine = `${p.mana}/${p.manaMax}  ${bar(p.mana, p.manaMax)}`;
  const mHpLine = `${m.hp}/${m.hpMax}  ${bar(m.hp, m.hpMax)}`;

  return new EmbedBuilder()
    .setTitle(`Dungeon — ${m.name} (Lv.${m.level})`)
    .addFields(
      { name: "Boss HP", value: mHpLine, inline: false },
      { name: "Your HP", value: pHpLine, inline: false },
      { name: "Your Mana", value: pManaLine, inline: false },
      { name: "Battle Log", value: logLines.length ? logLines.slice(-6).join("\n") : "—", inline: false }
    )
    .setFooter({ text: "Turn-based fast fight. Images will come later (Canvas layers)." });
}

function buttonsFor(p) {
  const attack = new ButtonBuilder().setCustomId("d_attack").setLabel("Attack").setStyle(ButtonStyle.Primary);

  const skillLabel = p.class === "warrior" ? "Power Strike" : "Firebolt";
  const skill = new ButtonBuilder()
    .setCustomId("d_skill")
    .setLabel(skillLabel)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(p.class === "mage" && p.mana < 10);

  const potion = new ButtonBuilder().setCustomId("d_potion").setLabel("Potion").setStyle(ButtonStyle.Success);

  const run = new ButtonBuilder().setCustomId("d_run").setLabel("Run").setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder().addComponents(attack, skill, potion, run);
}

async function finishVictory(interaction, p, m, logLines) {
  // rewards
  const goldGain = roll(10, 25) + p.level * 2;
  const xpGain = roll(15, 30) + p.level * 3;

  p.gold += goldGain;
  p.xp += xpGain;

  // level up check
  let leveled = false;
  while (p.xp >= xpToNextLevel(p.level) && p.level < 30) {
    p.xp -= xpToNextLevel(p.level);
    p.level += 1;
    leveled = true;

    // growth
    p.hpMax += p.class === "warrior" ? 15 : 10;
    p.manaMax += p.class === "mage" ? 8 : 3;
    p.hp = p.hpMax;
    p.mana = p.manaMax;
  }

  await p.save();

  const embed = new EmbedBuilder()
    .setTitle("Victory ✅")
    .setDescription(
      [
        `You defeated **${m.name}**.`,
        `Rewards: **+${xpGain} XP**, **+${goldGain} Gold**.`,
        leveled ? `Level Up! You are now **Lv.${p.level}**.` : ""
      ].filter(Boolean).join("\n")
    );

  await interaction.update({ embeds: [embed], components: [] });
}

async function finishDefeat(interaction, p, m) {
  // simple defeat: restore to half hp (can tune later)
  p.hp = Math.max(1, Math.floor(p.hpMax * 0.5));
  await p.save();

  const embed = new EmbedBuilder()
    .setTitle("Defeat ❌")
    .setDescription(`**${m.name}** defeated you.\nYou escaped with **${p.hp}/${p.hpMax} HP**.`);

  await interaction.update({ embeds: [embed], components: [] });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dungeon")
    .setDescription("Enter a dungeon and fight a boss (fast turn-based)."),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    const p = await Player.findOne({ guildId, userId });
    if (!p) {
      return interaction.reply({ content: "لازم تسوي شخصية أول: استخدم /start", ephemeral: true });
    }

    // prevent multiple fights
    const k = keyOf(interaction);
    if (fights.has(k)) {
      return interaction.reply({ content: "عندك قتال شغال. كمل القتال الحالي.", ephemeral: true });
    }

    // create monster based on player level ranges later; v1 uses player level
    const monster = makeMonsterForLevel(p.level);

    const logLines = [`You entered the dungeon...`, `A wild **${monster.name}** appears!`];
    fights.set(k, { monster, logLines });

    const embed = renderEmbed(p, monster, logLines);

    return interaction.reply({
      embeds: [embed],
      components: [buttonsFor(p)],
      ephemeral: true
    });
  },

  // button handler (called from index.js)
  async onButton(interaction) {
    const k = keyOf(interaction);
    const state = fights.get(k);
    if (!state) {
      return interaction.reply({ content: "مافي قتال شغال. استخدم /dungeon", ephemeral: true });
    }

    const p = await Player.findOne({ guildId: interaction.guildId, userId: interaction.user.id });
    if (!p) {
      fights.delete(k);
      return interaction.reply({ content: "لازم تسوي شخصية أول: /start", ephemeral: true });
    }

    const m = state.monster;
    const logLines = state.logLines;

    const stats = classStats(p);

    // player action
    if (interaction.customId === "d_attack") {
      const dmg = roll(stats.atkMin, stats.atkMax);
      m.hp = Math.max(0, m.hp - dmg);
      logLines.push(`You attack for **${dmg}**.`);
    }

    if (interaction.customId === "d_skill") {
      if (p.class === "mage") {
        if (p.mana < 10) {
          return interaction.reply({ content: "مانا غير كافي.", ephemeral: true });
        }
        p.mana -= 10;
        const dmg = roll(16, 26) + Math.floor(p.level / 2);
        m.hp = Math.max(0, m.hp - dmg);
        logLines.push(`You cast **Firebolt** for **${dmg}**.`);
      } else {
        // warrior skill: big hit
        const dmg = roll(18, 28) + Math.floor(p.level / 2);
        m.hp = Math.max(0, m.hp - dmg);
        logLines.push(`You use **Power Strike** for **${dmg}**.`);
      }
    }

    if (interaction.customId === "d_potion") {
      // simple potion restores hp; later inventory
      const heal = roll(20, 35);
      p.hp = Math.min(p.hpMax, p.hp + heal);
      logLines.push(`You drink a potion and heal **${heal}**.`);
    }

    if (interaction.customId === "d_run") {
      fights.delete(k);
      await p.save();
      const embed = new EmbedBuilder().setTitle("Escaped 🏃").setDescription("You ran away safely.");
      return interaction.update({ embeds: [embed], components: [] });
    }

    // check victory
    if (m.hp <= 0) {
      fights.delete(k);
      return finishVictory(interaction, p, m, logLines);
    }

    // boss turn (monster attacks)
    const bossDmgRaw = roll(m.atkMin, m.atkMax);
    const bossDmg = Math.max(1, bossDmgRaw - stats.def);
    p.hp = Math.max(0, p.hp - bossDmg);
    logLines.push(`**${m.name}** hits you for **${bossDmg}**.`);

    // check defeat
    if (p.hp <= 0) {
      fights.delete(k);
      return finishDefeat(interaction, p, m);
    }

    await p.save();

    const embed = renderEmbed(p, m, logLines);
    return interaction.update({
      embeds: [embed],
      components: [buttonsFor(p)]
    });
  }
};
