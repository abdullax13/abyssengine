const mongoose = require("mongoose");
const logger = require("./logger");

async function connectMongo(uri) {
  if (!uri) throw new Error("MONGODB_URI missing");

  await mongoose.connect(uri);
  logger.info("Connected to MongoDB");
}

module.exports = { connectMongo };
