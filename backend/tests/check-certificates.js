#!/usr/bin/env node
require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '.env' });

const path = require('path');
const mongoose = require('mongoose');

async function checkCertificates() {
 try {
 console.log('🔍 Certificate Database Checker\n');
 
 const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
 console.log(`📍 Connecting to: ${mongoUri ? mongoUri.split('@')[1] : 'NOT SET'}`);
 
 if (!mongoUri) {
 console.error('❌ ERROR: MONGODB_URI or MONGO_URI not set');
 process.exit(1);
 }
 
 await mongoose.connect(mongoUri, {
 dbName: process.env.MONGODB_DB_NAME || undefined,
 maxPoolSize: 5,
 serverSelectionTimeoutMS: 5000,
 connectTimeoutMS: 10000
 });
 
 console.log(`✅ Connected to: ${mongoose.connection.name}\n`);
 
 const Certificate = require('../models/Certificate');
 const Admin = require('../models/Admin');
 
 // Check collections
 const certCount = await Certificate.countDocuments();
 const adminCount = await Admin.countDocuments();
 
 console.log(`📊 Database Statistics:`);
 console.log(`   Certificates: ${certCount}`);
 console.log(`   Admins: ${adminCount}\n`);
 
 if (certCount > 0) {
 console.log(`📋 Sample Certificates (first 5):`);
 const certs = await Certificate.find({}).limit(5).lean();
 certs.forEach(cert => {
 console.log(`   - ${cert.id}: ${cert.name} (${cert.domain})`);
 });
 } else {
 console.log(`⚠️  No certificates found in database`);
 }
 
 console.log(`\n🔗 Collections in database:`);
 const collections = await mongoose.connection.db.listCollections().toArray();
 console.log(`   ${collections.map(c => c.name).join(', ')}`);
 
 await mongoose.disconnect();
 console.log(`\n✅ Check complete`);
 } catch (error) {
 console.error(`\n❌ ERROR: ${error.message}`);
 console.error(error);
 process.exit(1);
 }
}

checkCertificates();
