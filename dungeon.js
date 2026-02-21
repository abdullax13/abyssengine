const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const Player = require("./Player");
const { bar, xpToNextLevel } = require("./bar");
const { rollItem, rollMaterials } = require("./loot");

const fights = new Map();

function keyOf(interaction) {
  return `${interaction.guildId}:${interaction.user.id}`;
}

function roll(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const BASE_CHARACTER_IDS = {
  warrior_male: 1,
  warrior_female: 2,
  mage_male: 3,
  mage_female: 4
};

function ensureBaseCharacterId(p) {
  const key = `${p.class}_${p.gender || "male"}`;
  if (!p.baseCharacterId || typeof p.baseCharacterId === "string") {
    p.baseCharacterId = BASE_CHARACTER_IDS[key] || 1;
  }
}

function classBaseStats(p) {
  if (p.class === "warrior") {
    return { atkMin: 10, atkMax: 16, def: 3 };
  }
  return { atkMin: 8, atkMax: 14, def: 1 };
}

function combinedStats(p) {
  const base = classBaseStats(p);
  return {
    atkMin: base.atkMin,
    atkMax: base.atkMax,
    def: base.def
  };
}

function makeMonsterForLevel(level) {
  const tier =
    level < 5 ? 1 :
    level < 10 ? 2 :
    level < 20 ? 3 :
    level < 30 ? 4 : 5;

  const hp = 60 + level * 12;
  const atkMin = 6 + Math.floor(level * 1.3);
  const atkMax = 10 + Math.floor(level * 1.6);

  const name =
    level < 5 ? "Cave Slime" :
    level < 10 ? "Crypt Ghoul" :
    level < 20 ? "Abyss Sentinel" :
    level < 30 ? "Warden of Depths" :
    "Abyss Overlord";

  return { tier, name, level, hp, hpMax: hp, atkMin, atkMax };
}

function renderEmbed(p, m, logLines) {
  const pHpLine = `${p.hp}/${p.hpMax}  ${bar(p.hp, p.hpMax)}`;
  const pManaLine = `${p.mana}/${p.manaMax}  ${bar(p.mana, p.manaMax)}`;
  const mHpLine = `${m.hp}/${m.hpMax}  ${bar(m.hp, m.hpMax)}`;

  const st = combinedStats(p);

  return new EmbedBuilder()
    .setTitle(`Dungeon Tier ${m.tier} — ${m.name} (Lv.${m.level})`)
    .addFields(
      { name: "Boss HP", value: mHpLine },
      { name: "Your HP", value: pHpLine },
      { name: "Your Mana", value: pManaLine },
      {
        name: "Stats",
        value: `ATK: ${st.atkMin}-${st.atkMax} | DEF: ${st.def}`
      },
      {
        name: "Battle Log",
        value: logLines.slice(-6).join("\n") || "—"
      }
    );
}

function buttonsFor(p) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("d_attack")
      .setLabel("Attack")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("d_skill")
      .setLabel(p.class === "warrior" ? "Power Strike" : "Firebolt")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(p.class === "mage" && p.mana < 10),

    new ButtonBuilder()
      .setCustomId("d_potion")
      .setLabel("Potion")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("d_run")
      .setLabel("Run")
      .setStyle(ButtonStyle.Danger)
  );
}

async function finishVictory(interaction, p, m) {
  const goldGain = roll(10, 25) + p.level * 2;
  const xpGain = roll(15, 30) + p.level * 3;

  p.gold += goldGain;
  p.xp += xpGain;

  const dungeonTier =
    p.level <= 5 ? 1 :
    p.level <= 10 ? 2 :
    p.level <= 20 ? 3 : 4;

  let droppedItem = null;
  if (Math.random() < 0.7) {
    droppedItem = rollItem(p.class, dungeonTier, p.level);
    p.inventory.push(droppedItem);
  }

  const mats = rollMaterials(dungeonTier);
  for (const d of mats) {
    const existing = p.materials.find(x => x.id === d.id);
    if (existing) existing.qty += d.qty;
    else p.materials.push({ id: d.id, name: d.name, qty: d.qty });
  }

  let leveled = false;
  while (p.xp >= xpToNextLevel(p.level) && p.level < 30) {
    p.xp -= xpToNextLevel(p.level);
    p.level++;
    leveled = true;
    p.hpMax += p.class === "warrior" ? 15 : 10;
    p.manaMax += p.class === "mage" ? 8 : 3;
    p.hp = p.hpMax;
    p.mana = p.manaMax;
  }

  ensureBaseCharacterId(p);
  await p.save();

  const itemLine = droppedItem
    ? `🎁 ${droppedItem.name} (${droppedItem.tier})`
    : "🎁 No item drop";

  const matsLine = mats.length
    ? mats.map(x => `🧱 ${x.name} x${x.qty}`).join("\n")
    : "🧱 No materials";

  const embed = new EmbedBuilder()
    .setTitle("Victory ✅")
    .setDescription(
      [
        `You defeated **${m.name}**`,
        `+${xpGain} XP | +${goldGain} Gold`,
        leveled ? `Level Up! Now Lv.${p.level}` : "",
        "",
        itemLine,
        matsLine
      ].filter(Boolean).join("\n")
    );

  await interaction.update({ embeds: [embed], components: [] });
}

async function finishDefeat(interaction, p, m) {
  p.hp = Math.max(1, Math.floor(p.hpMax * 0.5));
  ensureBaseCharacterId(p);
  await p.save();

  const embed = new EmbedBuilder()
    .setTitle("Defeat ❌")
    .setDescription(`Defeated by **${m.name}**`);

  await interaction.update({ embeds: [embed], components: [] });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dungeon")
    .setDescription("Enter a dungeon"),

  async execute(interaction) {
    const p = await Player.findOne({
      guildId: interaction.guildId,
      userId: interaction.user.id
    });

    if (!p) {
      return interaction.reply({
        content: "استخدم /start أولاً",
        ephemeral: true
      });
    }

    ensureBaseCharacterId(p);

    const k = keyOf(interaction);
    if (fights.has(k)) {
      return interaction.reply({
        content: "عندك قتال شغال",
        ephemeral: true
      });
    }

    const monster = makeMonsterForLevel(p.level);

    fights.set(k, {
      monster,
      logLines: [
        "You entered the dungeon...",
        `A wild ${monster.name} appears!`
      ]
    });

    return interaction.reply({
      embeds: [renderEmbed(p, monster, fights.get(k).logLines)],
      components: [buttonsFor(p)],
      ephemeral: true
    });
  },

  async onButton(interaction) {
    const k = keyOf(interaction);
    const state = fights.get(k);
    if (!state) {
      return interaction.reply({ content: "No active fight", ephemeral: true });
    }

    const p = await Player.findOne({
      guildId: interaction.guildId,
      userId: interaction.user.id
    });

    if (!p) return;

    ensureBaseCharacterId(p);

    const m = state.monster;
    const logLines = state.logLines;
    const st = combinedStats(p);

    if (interaction.customId === "d_attack") {
      const dmg = roll(st.atkMin, st.atkMax);
      m.hp -= dmg;
      logLines.push(`You hit for ${dmg}`);
    }

    if (interaction.customId === "d_skill") {
      if (p.class === "mage" && p.mana < 10)
        return interaction.reply({ content: "No mana", ephemeral: true });

      if (p.class === "mage") p.mana -= 10;

      const dmg = roll(16, 26);
      m.hp -= dmg;
      logLines.push(`Skill hit for ${dmg}`);
    }

    if (interaction.customId === "d_potion") {
      const heal = roll(20, 35);
      p.hp = Math.min(p.hpMax, p.hp + heal);
      logLines.push(`Healed ${heal}`);
    }

    if (interaction.customId === "d_run") {
      fights.delete(k);
      await p.save();
      return interaction.update({
        embeds: [new EmbedBuilder().setTitle("Escaped")],
        components: []
      });
    }

    if (m.hp <= 0) {
      fights.delete(k);
      return finishVictory(interaction, p, m);
    }

    const bossDmg = roll(m.atkMin, m.atkMax) - st.def;
    p.hp -= Math.max(1, bossDmg);
    logLines.push(`${m.name} hits for ${bossDmg}`);

    if (p.hp <= 0) {
      fights.delete(k);
      return finishDefeat(interaction, p, m);
    }

    await p.save();

    return interaction.update({
      embeds: [renderEmbed(p, m, logLines)],
      components: [buttonsFor(p)]
    });
  }
};
