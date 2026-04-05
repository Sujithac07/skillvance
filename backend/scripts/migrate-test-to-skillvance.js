require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

async function run() {
 const uri = process.env.MONGODB_URI;
 const targetDb = process.env.MONGODB_DB_NAME || 'skillvance';

 if (!uri) {
 throw new Error('Missing MONGODB_URI');
 }

 const src = await mongoose
 .createConnection(uri, { dbName: 'test', serverSelectionTimeoutMS: 10000 })
 .asPromise();
 const dst = await mongoose
 .createConnection(uri, { dbName: targetDb, serverSelectionTimeoutMS: 10000 })
 .asPromise();

 try {
 const sourceCertificates = src.collection('certificates');
 const targetCertificates = dst.collection('certificates');

 const docs = await sourceCertificates.find({}).toArray();
 let upserts = 0;

 for (const doc of docs) {
 if (!doc.id) {
 continue;
 }

 await targetCertificates.updateOne(
 { id: doc.id },
 {
 $set: {
 id: doc.id,
 name: doc.name,
 domain: doc.domain,
 completionDate: doc.completionDate,
 mentorName: doc.mentorName,
 verified: doc.verified !== false,
 createdAt: doc.createdAt || new Date(),
 updatedAt: new Date()
 }
 },
 { upsert: true }
 );

 upserts += 1;
 }

 console.log(`MIGRATED_CERTIFICATES ${upserts}`);
 } finally {
 await src.close();
 await dst.close();
 }
}

run().catch(error => {
 console.error(`MIGRATE_ERR ${error.message}`);
 process.exit(1);
});
