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

// in-memory combats
const fights = new Map(); // key: `${guildId}:${userId}`

function keyOf(interaction) {
  return `${interaction.guildId}:${interaction.user.id}`;
}

function roll(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function dungeonTierFromLevel(level) {
  if (level <= 5) return 1;
  if (level <= 10) return 2;
  if (level <= 20) return 3;
  return 4; // 20-30
}

function classBaseStats(p) {
  if (p.class === "warrior") return { atkMin: 10, atkMax: 16, def: 3 };
  return { atkMin: 8, atkMax: 14, def: 1 }; // mage
}

function getItemStats(item) {
  if (!item) return { hp: 0, mana: 0, atk: 0, def: 0, crit: 0, skillPower: 0, manaRegen: 0 };

  const s = item.stats || {};
  const sp = item.special || {};
  return {
    hp: Number(s.hp || 0),
    mana: Number(s.mana || 0),
    atk: Number(s.atk || 0),
    def: Number(s.def || 0),

    crit: Number(sp.crit || 0),
    skillPower: Number(sp.skillPower || 0),
    manaRegen: Number(sp.manaRegen || 0)
  };
}

function derivedStats(p) {
  const base = classBaseStats(p);

  const w = getItemStats(p.equipment?.weapon);
  const a = getItemStats(p.equipment?.armor);
  const h = getItemStats(p.equipment?.helmet);

  const atkBonus = w.atk + a.atk + h.atk;
  const defBonus = w.def + a.def + h.def;

  const hpBonus = w.hp + a.hp + h.hp;
  const manaBonus = w.mana + a.mana + h.mana;

  const crit = w.crit + a.crit + h.crit;
  const skillPower = w.skillPower + a.skillPower + h.skillPower;
  const manaRegen = w.manaRegen + a.manaRegen + h.manaRegen;

  // note: hpMax/manaMax في DB موجودة، لكن نعرض bonuses هنا فقط (للواجهة). لاحقاً نقدر نعيد حساب max.
  return {
    atkMin: base.atkMin + Math.floor(atkBonus * 0.7),
    atkMax: base.atkMax + atkBonus,
    def: base.def + defBonus,
    hpBonus,
    manaBonus,
    crit,
    skillPower,
    manaRegen
  };
}

function makeMonsterForTier(dungeonTier, level) {
  // scaling by tier + level
  const tierMult = 1 + (dungeonTier - 1) * 0.35;
  const hp = Math.round((60 + level * 12) * tierMult);

  const atkMin = Math.round((6 + Math.floor(level * 1.3)) * tierMult);
  const atkMax = Math.round((10 + Math.floor(level * 1.6)) * tierMult);

  const name =
    dungeonTier === 1 ? "Cave Slime" :
    dungeonTier === 2 ? "Crypt Ghoul" :
    dungeonTier === 3 ? "Abyss Sentinel" :
    "Void Warden";

  return { name, level, hp, hpMax: hp, atkMin, atkMax, dungeonTier };
}

function fmtItem(item) {
  if (!item) return "No drop";
  const sp = item.special || {};
  const specialParts = [];
  if (sp.crit) specialParts.push(`crit +${sp.crit}%`);
  if (sp.skillPower) specialParts.push(`skillPower +${sp.skillPower}%`);
  if (sp.manaRegen) specialParts.push(`manaRegen +${sp.manaRegen}`);

  const specialLine = specialParts.length ? ` | ${specialParts.join(", ")}` : "";
  return `**${item.name}** (${item.tier}) [${item.slot}]${specialLine}`;
}

function renderEmbed(p, m, logLines) {
  const pHpLine = `${p.hp}/${p.hpMax}  ${bar(p.hp, p.hpMax)}`;
  const pManaLine = `${p.mana}/${p.manaMax}  ${bar(p.mana, p.manaMax)}`;
  const mHpLine = `${m.hp}/${m.hpMax}  ${bar(m.hp, m.hpMax)}`;

  const stats = derivedStats(p);

  return new EmbedBuilder()
    .setTitle(`Dungeon Tier ${m.dungeonTier} — ${m.name} (Lv.${m.level})`)
    .addFields(
      { name: "Boss HP", value: mHpLine, inline: false },
      { name: "Your HP", value: pHpLine, inline: false },
      { name: "Your Mana", value: pManaLine, inline: false },
      {
        name: "Stats (with equipment)",
        value: `ATK: ${stats.atkMin}-${stats.atkMax} | DEF: ${stats.def}\nCrit: ${stats.crit}% | SkillPower: ${stats.skillPower}% | ManaRegen: ${stats.manaRegen}`,
        inline: false
      },
      { name: "Battle Log", value: logLines.length ? logLines.slice(-6).join("\n") : "—", inline: false }
    )
    .setFooter({ text: "v1: Loot + Materials active. Equip/Sell/Upgrade coming next." });
}

function buttonsFor(p) {
  const attack = new ButtonBuilder()
    .setCustomId("d_attack")
    .setLabel("Attack")
    .setStyle(ButtonStyle.Primary);

  const skillLabel = p.class === "warrior" ? "Power Strike" : "Firebolt";

  const skillDisabled = p.class === "mage" && p.mana < 10;

  const skill = new ButtonBuilder()
    .setCustomId("d_skill")
    .setLabel(skillLabel)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(skillDisabled);

  const potion = new ButtonBuilder()
    .setCustomId("d_potion")
    .setLabel("Potion")
    .setStyle(ButtonStyle.Success);

  const run = new ButtonBuilder()
    .setCustomId("d_run")
    .setLabel("Run")
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder().addComponents(attack, skill, potion, run);
}

async function finishVictory(interaction, p, m, logLines) {
  const goldGain = roll(10, 25) + p.level * 2;
  const xpGain = roll(15, 30) + p.level * 3;

  p.gold += goldGain;
  p.xp += xpGain;

  // Loot (items + materials)
  const dungeonTier = m.dungeonTier;

  let droppedItem = null;
  if (Math.random() < 0.70) {
    droppedItem = rollItem(p.class, dungeonTier, p.level);
    p.inventory.push(droppedItem);
  }

  const mats = rollMaterials(dungeonTier);
  for (const d of mats) {
    const existing = p.materials.find(x => x.id === d.id);
    if (existing) existing.qty += d.qty;
    else p.materials.push({ id: d.id, name: d.name, qty: d.qty });
  }

  // level up
  let leveled = false;
  while (p.xp >= xpToNextLevel(p.level) && p.level < 30) {
    p.xp -= xpToNextLevel(p.level);
    p.level += 1;
    leveled = true;

    p.hpMax += p.class === "warrior" ? 15 : 10;
    p.manaMax += p.class === "mage" ? 8 : 3;

    // restore on level up
    p.hp = p.hpMax;
    p.mana = p.manaMax;
  }

  await p.save();

  const matsLine = mats.length
    ? mats.map(x => `🧱 ${x.name} x${x.qty}`).join("\n")
    : "🧱 No materials";

  const embed = new EmbedBuilder()
    .setTitle("Victory ✅")
    .setDescription(
      [
        `You defeated **${m.name}**.`,
        `Rewards: **+${xpGain} XP**, **+${goldGain} Gold**.`,
        leveled ? `Level Up! You are now **Lv.${p.level}**.` : "",
        "",
        `🎁 Item: ${fmtItem(droppedItem)}`,
        matsLine
      ].filter(Boolean).join("\n")
    );

  await interaction.update({ embeds: [embed], components: [] });
}

async function finishDefeat(interaction, p, m) {
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

    const k = keyOf(interaction);
    if (fights.has(k)) {
      return interaction.reply({ content: "عندك قتال شغال. كمل القتال الحالي.", ephemeral: true });
    }

    const dungeonTier = dungeonTierFromLevel(p.level);
    const monster = makeMonsterForTier(dungeonTier, p.level);

    const logLines = ["You entered the dungeon...", `A wild **${monster.name}** appears!`];
    fights.set(k, { monster, logLines });

    const embed = renderEmbed(p, monster, logLines);

    return interaction.reply({
      embeds: [embed],
      components: [buttonsFor(p)],
      ephemeral: true
    });
  },

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

    const stats = derivedStats(p);

    // player action
    if (interaction.customId === "d_attack") {
      // crit chance
      const critRoll = Math.random() < (stats.crit / 100);
      let dmg = roll(stats.atkMin, stats.atkMax);
      if (critRoll) dmg = Math.round(dmg * 1.6);

      m.hp = Math.max(0, m.hp - dmg);
      logLines.push(critRoll ? `You attack for **${dmg}** (CRIT).` : `You attack for **${dmg}**.`);
    } else if (interaction.customId === "d_skill") {
      if (p.class === "mage") {
        if (p.mana < 10) {
          return interaction.reply({ content: "مانا غير كافي.", ephemeral: true });
        }
        p.mana -= 10;

        // skillPower scales skill dmg
        const spMult = 1 + (stats.skillPower / 100);
        let dmg = Math.round((roll(16, 26) + Math.floor(p.level / 2)) * spMult);

        m.hp = Math.max(0, m.hp - dmg);
        logLines.push(`You cast **Firebolt** for **${dmg}**.`);
      } else {
        const spMult = 1 + (stats.skillPower / 100);
        let dmg = Math.round((roll(18, 28) + Math.floor(p.level / 2)) * spMult);

        m.hp = Math.max(0, m.hp - dmg);
        logLines.push(`You use **Power Strike** for **${dmg}**.`);
      }
    } else if (interaction.customId === "d_potion") {
      const heal = roll(20, 35);
      p.hp = Math.min(p.hpMax, p.hp + heal);
      logLines.push(`You drink a potion and heal **${heal}**.`);
    } else if (interaction.customId === "d_run") {
      fights.delete(k);
      await p.save();
      const embed = new EmbedBuilder().setTitle("Escaped 🏃").setDescription("You ran away safely.");
      return interaction.update({ embeds: [embed], components: [] });
    } else {
      return interaction.reply({ content: "زر غير معروف.", ephemeral: true });
    }

    // boss dead?
    if (m.hp <= 0) {
      fights.delete(k);
      return finishVictory(interaction, p, m, logLines);
    }

    // boss attacks
    const bossDmgRaw = roll(m.atkMin, m.atkMax);
    const bossDmg = Math.max(1, bossDmgRaw - stats.def);

    p.hp = Math.max(0, p.hp - bossDmg);
    logLines.push(`**${m.name}** hits you for **${bossDmg}**.`);

    // mana regen (from special affix) after boss hit (v1)
    if (stats.manaRegen > 0) {
      p.mana = Math.min(p.manaMax, p.mana + stats.manaRegen);
      logLines.push(`Mana Regen: +${stats.manaRegen}`);
    }

    // defeat?
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
