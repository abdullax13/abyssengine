require("dotenv").config();

const fs = require("fs");
const { Client, Collection, GatewayIntentBits, REST, Routes } = require("discord.js");

const { connectMongo } = require("./mongoose");
const logger = require("./logger");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const MONGODB_URI = process.env.MONGODB_URI;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

// Load command files manually
const commandFiles = ["ping.js", "start.js"];

const slashData = [];

for (const file of commandFiles) {
  const cmd = require(`./${file}`);
  client.commands.set(cmd.data.name, cmd);
  slashData.push(cmd.data.toJSON());
}

// Load events manually
const readyEvent = require("./ready");
const interactionEvent = require("./interactionCreate");

client.once(readyEvent.name, (...args) =>
  readyEvent.execute(...args, client)
);

client.on(interactionEvent.name, (...args) =>
  interactionEvent.execute(...args, client)
);

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: slashData });
  logger.info("Slash commands registered");
}

async function startBot() {
  await connectMongo(MONGODB_URI);
  await registerCommands();
  await client.login(TOKEN);
}

startBot().catch(console.error);
