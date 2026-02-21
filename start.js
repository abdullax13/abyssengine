const { SlashCommandBuilder } = require("discord.js");
const Player = require("./Player");

function buildBaseCharacterId(gender, klass) {
  // ثابت وما يتغير مع الوقت (مهم عشان الصور لاحقاً)
  // أمثلة: warrior_male, mage_female
  return `${klass}_${gender}`;
}

function starterStats(klass) {
  // ستاتس مبدئي بسيط (نقدر نعدله لاحقاً)
  if (klass === "warrior") {
    return {
      level: 1,
      xp: 0,
      gold: 0,
      hpMax: 120,
      hp: 120,
      manaMax: 30,
      mana: 30
    };
  }

  // mage
  return {
    level: 1,
    xp: 0,
    gold: 0,
    hpMax: 100,
    hp: 100,
    manaMax: 60,
    mana: 60
  };
}

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
        content: "عندك شخصية مسبقاً. استخدم /profile أو كمل /dungeon.",
        ephemeral: true
      });
    }

    const baseCharacterId = buildBaseCharacterId(gender, klass);
    const stats = starterStats(klass);

    // IMPORTANT: نخلي البنية مرنة حتى لو Player.js عندك فيه حقول زيادة
    // (MongoDB بيتجاهل الحقول اللي مو موجودة بالـ schema)
    const doc = {
      guildId,
      userId,
      name,
      gender,
      class: klass,

      baseCharacterId,

      level: stats.level,
      xp: stats.xp,
      gold: stats.gold,
      hpMax: stats.hpMax,
      hp: stats.hp,
      manaMax: stats.manaMax,
      mana: stats.mana,

      // تجهيزات أولية (حتى لو ما تستخدمها الحين)
      equipment: {
        weapon: null,
        armor: null,
        helm: null,
        boots: null,
        ring: null
      },
      inventory: [],
      materials: {}
    };

    await Player.create(doc);

    await interaction.reply({
      content: `✅ تم إنشاء الشخصية: **${name}**\nClass: **${klass}** | Gender: **${gender}**\nID: **${baseCharacterId}**`,
      ephemeral: true
    });
  }
};
