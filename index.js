require("dotenv").config();

const { Client, Collection, GatewayIntentBits, REST, Routes } = require("discord.js");

const { connectMongo } = require("./mongoose");
const logger = require("./logger");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const MONGODB_URI = process.env.MONGODB_URI;

const GUILD_ID = process.env.GUILD_ID;        // لازم للتطوير السريع
const CLEAR_GLOBAL = process.env.CLEAR_GLOBAL; // حطها "1" مرة وحدة لو تبي تمسح التكرار

if (!TOKEN) throw new Error("Missing DISCORD_TOKEN");
if (!CLIENT_ID) throw new Error("Missing CLIENT_ID");
if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

// ✅ لازم تضيف dungeon هنا
const commandFiles = ["ping.js", "start.js", "profile.js", "dungeon.js"];

const slashData = [];

for (const file of commandFiles) {
  try {
    const cmd = require(`./${file}`);
    if (!cmd?.data?.name || typeof cmd.execute !== "function") {
      throw new Error(`Invalid command module structure: ${file}`);
    }
    client.commands.set(cmd.data.name, cmd);
    slashData.push(cmd.data.toJSON());
  } catch (e) {
    logger.error(`Failed to load command ${file}: ${e.message}`);
    throw e;
  }
}

// ✅ تشخيص: يطبع الأوامر المحمّلة
logger.info("Loaded commands: " + slashData.map(c => c.name).join(", "));

// Events
const readyEvent = require("./ready");
const interactionEvent = require("./interactionCreate");

client.once(readyEvent.name, (...args) =>
  readyEvent.execute(...args, client)
);

client.on(interactionEvent.name, (...args) =>
  interactionEvent.execute(...args, client)
);

async function clearGlobalCommandsIfNeeded() {
  if (CLEAR_GLOBAL !== "1") return;

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
  logger.info("Global commands cleared ✅ (CLEAR_GLOBAL=1)");

  // تنبيه: بعد ما تنجح مرة وحدة، رجّع CLEAR_GLOBAL إلى 0 أو احذفه
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  // للتطوير: Guild commands فوري
  if (!GUILD_ID) {
    logger.warn("GUILD_ID not set — registering GLOBAL commands (may take time to appear).");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: slashData });
    logger.info("Slash commands registered (GLOBAL)");
    return;
  }

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: slashData }
  );
  logger.info("Slash commands registered (GUILD)");
}

async function startBot() {
  await connectMongo(MONGODB_URI);

  await clearGlobalCommandsIfNeeded();
  await registerCommands();

  await client.login(TOKEN);
}

startBot().catch((err) => {
  console.error(err);
  process.exit(1);
});
