#!/usr/bin/env node
require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '../../.env' });

const mongoose = require('mongoose');

async function fullDiagnostic() {
 console.log('\n🔍 FULL DATABASE DIAGNOSTIC\n');
 console.log('=' .repeat(60));
 
 try {
 // Step 1: Check environment
 console.log('\n📋 ENVIRONMENT CHECK:');
 const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
 const dbName = process.env.MONGODB_DB_NAME;
 
 console.log(`   MONGODB_URI: ${mongoUri ? '✓ Set' : '❌ NOT SET'}`);
 console.log(`   MONGO_URI: ${process.env.MONGO_URI ? '✓ Set' : '❌ NOT SET'}`);
 console.log(`   MONGODB_DB_NAME: ${dbName ? `✓ Set to "${dbName}"` : '❌ NOT SET'}`);
 console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
 
 if (!mongoUri) {
 console.error('\n❌ ERROR: No MongoDB URI found');
 process.exit(1);
 }
 
 // Step 2: Connect to MongoDB
 console.log('\n🔌 CONNECTING TO MONGODB:');
 console.log(`   URI: ${mongoUri.slice(0, 50)}...`);
 
 await mongoose.connect(mongoUri, {
 dbName: dbName || undefined,
 maxPoolSize: 5,
 serverSelectionTimeoutMS: 5000,
 connectTimeoutMS: 10000
 });
 
 console.log('   ✅ Connection successful');
 
 // Step 3: Check connection details
 console.log('\n📊 CONNECTION DETAILS:');
 console.log(`   Database Name: ${mongoose.connection.name}`);
 console.log(`   Host: ${mongoose.connection.host}`);
 console.log(`   Port: ${mongoose.connection.port}`);
 console.log(`   Ready State: ${mongoose.connection.readyState} (1=connected)`);
 
 // Step 4: List all collections
 console.log('\n📦 COLLECTIONS IN DATABASE:');
 const collections = await mongoose.connection.db.listCollections().toArray();
 if (collections.length === 0) {
 console.log('   ❌ No collections found (database is empty)');
 } else {
 collections.forEach(col => console.log(`   • ${col.name}`));
 }
 
 // Step 5: Check Certificate model
 console.log('\n🎓 CERTIFICATE COLLECTION:');
 const Certificate = require('../models/Certificate');
 
 const certExists = collections.some(c => c.name === 'certificates');
 
 if (!certExists) {
 console.log('   ❌ certificates collection not found');
 } else {
 console.log('   ✓ certificates collection exists');
 }
 
 // Step 6: Count documents
 console.log('\n📈 DOCUMENT COUNTS:');
 const certCount = await Certificate.countDocuments();
 console.log(`   Certificates: ${certCount}`);
 
 if (certCount === 0) {
 console.log('   ⚠️  No certificates in database');
 } else {
 console.log('   ✓ Found certificates');
 
 // Step 7: Show sample certificates
 console.log('\n📋 SAMPLE CERTIFICATES:');
 const samples = await Certificate.find({}).limit(5).lean();
 samples.forEach(cert => {
 console.log(`   • ${cert.id}: ${cert.name} (${cert.domain})`);
 });
 }
 
 // Step 8: Check for indexes
 console.log('\n🔑 INDEXES:');
 const indexes = await Certificate.collection.getIndexes();
 Object.keys(indexes).forEach(key => {
 console.log(`   • ${key}`);
 });
 
 // Step 9: Direct collection query
 console.log('\n🔍 DIRECT QUERY TEST:');
 const raw = await mongoose.connection.collection('certificates').find({}).toArray();
 console.log(`   Raw query returned: ${raw.length} documents`);
 
 // Step 10: Check Admin collection
 console.log('\n👤 ADMIN COLLECTION:');
 const Admin = require('../models/Admin');
 const adminCount = await Admin.countDocuments();
 console.log(`   Admin users: ${adminCount}`);
 
 if (adminCount > 0) {
 const admins = await Admin.find({}).select('username email role').lean();
 admins.forEach(admin => {
 console.log(`   • ${admin.username} (${admin.role})`);
 });
 }
 
 console.log('\n' + '='.repeat(60));
 console.log('✅ Diagnostic complete\n');
 
 await mongoose.disconnect();
 
 } catch (error) {
 console.error('\n❌ DIAGNOSTIC ERROR:');
 console.error(`   ${error.message}`);
 if (error.code) console.error(`   Code: ${error.code}`);
 console.error(error);
 process.exit(1);
 }
}

fullDiagnostic();
