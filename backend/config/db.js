const mongoose = require('mongoose');

mongoose.set('debug', false);

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
 minPoolSize: 2,
 serverSelectionTimeoutMS: 3000,
 socketTimeoutMS: 5000,
 compressors: 'zlib'
 });

 console.log(`MongoDB connected: ${cachedConnection.connection.name}`);

 return cachedConnection;
}

module.exports = connectDB;