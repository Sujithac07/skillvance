const mongoose = require('mongoose');

let cachedConnection = null;

async function connectDB() {
  if (cachedConnection) {
    return cachedConnection;
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('Missing required environment variable: MONGODB_URI');
  }

  const dbName = process.env.MONGODB_DB_NAME || undefined;

  cachedConnection = await mongoose.connect(mongoUri, {
    dbName,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000
  });

  console.log(`MongoDB connected: ${cachedConnection.connection.name}`);

  return cachedConnection;
}

module.exports = connectDB;