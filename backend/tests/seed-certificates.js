#!/usr/bin/env node
require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '.env' });

const mongoose = require('mongoose');

const testCertificates = [
 {
   id: 'SKV2025ML00001',
   name: 'sujith',
   domain: 'Machine Learning Engineer',
   email: 'sujith@example.com',
   issueDate: new Date('2026-01-01'),
   mentorName: 'Pavan',
   score: 95,
   verified: true
 },
 {
   id: 'SKV2025WD01101',
   name: 'RAHUL M',
   domain: 'Web Developer',
   email: 'rahul.m.bablu.2004@gmail.com',
   issueDate: new Date('2025-12-02'),
   mentorName: 'Sujith A C',
   score: 85,
   verified: true
 },
 {
   id: 'SKV2025ML00123',
   name: 'pavan',
   domain: 'Web Development',
   issueDate: new Date('2026-01-15'),
   mentorName: 'Admin',
   score: 75,
   verified: true
 }
];

async function seedCertificates() {
 try {
 console.log('🌱 Certificate Seeder\n');
 
 const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
 if (!mongoUri) {
 console.error('❌ ERROR: MONGODB_URI or MONGO_URI not set');
 process.exit(1);
 }
 
 console.log(`📍 Connecting to MongoDB...`);
 await mongoose.connect(mongoUri, {
 dbName: process.env.MONGODB_DB_NAME || undefined,
 maxPoolSize: 5,
 serverSelectionTimeoutMS: 5000,
 connectTimeoutMS: 10000
 });
 
 console.log(`✅ Connected to: ${mongoose.connection.name}\n`);
 
 const Certificate = require('../models/Certificate');
 
 // Count existing
 const existingCount = await Certificate.countDocuments();
 console.log(`📊 Existing certificates: ${existingCount}\n`);
 
 if (existingCount > 0) {
 console.log(`⚠️  Database already has ${existingCount} certificate(s)`);
 console.log(`   Skipping seed to avoid duplicates\n`);
 await mongoose.disconnect();
 return;
 }
 
 // Insert test certificates
 console.log(`📥 Seeding ${testCertificates.length} test certificates...`);
 const result = await Certificate.insertMany(testCertificates);
 console.log(`✅ Successfully created ${result.length} certificates:\n`);
 
 result.forEach(cert => {
 console.log(`   ✓ ${cert.id}: ${cert.name} (${cert.domain})`);
 });
 
 await mongoose.disconnect();
 console.log(`\n✅ Seed complete`);
 } catch (error) {
 console.error(`\n❌ ERROR: ${error.message}`);
 if (error.code === 11000) {
 console.error(`   Duplicate key error - certificate already exists`);
 }
 console.error(error);
 process.exit(1);
 }
}

seedCertificates();
