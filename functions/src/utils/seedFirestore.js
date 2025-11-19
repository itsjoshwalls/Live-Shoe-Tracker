import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const seedData = JSON.parse(fs.readFileSync("../../firestore.seed.json", "utf8"));

async function seed() {
  for (const [collection, docs] of Object.entries(seedData)) {
    for (const [id, data] of Object.entries(docs)) {
      await db.collection(collection).doc(id).set(data);
      console.log(`Seeded ${collection}/${id}`);
    }
  }
  console.log("✅ Firestore seeding complete.");
  process.exit(0);
}

seed();
