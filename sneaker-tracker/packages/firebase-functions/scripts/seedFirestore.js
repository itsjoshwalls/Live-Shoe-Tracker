import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";

// Bootstrapping admin SDK
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (admin.apps.length === 0) {
  // Prefer FIREBASE_SERVICE_ACCOUNT (JSON string) if provided, else use ADC
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (svc) {
    const json = typeof svc === "string" ? JSON.parse(svc) : svc;
    admin.initializeApp({
      credential: admin.credential.cert(json),
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
}

const db = admin.firestore();

async function seedFirestore() {
  console.log("🚀 Seeding Firestore collections...");

  // 1️⃣ Regions
  const regions = [
    { id: "US", name: "United States", currency: "USD", timezone: "America/New_York" },
    { id: "EU", name: "Europe", currency: "EUR", timezone: "Europe/London" },
    { id: "AS", name: "Asia", currency: "JPY", timezone: "Asia/Tokyo" },
  ];

  for (const region of regions) {
    await db.collection("regions").doc(region.id).set(region);
  }
  console.log("🌎 Regions seeded.");

  // 2️⃣ Categories
  const categories = [
    { id: "basketball", name: "Basketball Shoes" },
    { id: "running", name: "Running Shoes" },
    { id: "lifestyle", name: "Lifestyle / Casual" },
    { id: "skate", name: "Skate Shoes" },
    { id: "collabs", name: "Collaborations / Limited" },
  ];

  for (const category of categories) {
    await db.collection("categories").doc(category.id).set(category);
  }
  console.log("🗂️ Categories seeded.");

  // 3️⃣ Retailers
  const retailers = [
    {
      id: "nike",
      name: "Nike",
      region: "US",
      apiURL: "https://api.nike.com/product_feed/threads/v2",
      rafflePattern: "https://www.nike.com/launch",
      logoURL: "https://static.nike.com/favicon.ico",
    },
    {
      id: "adidas",
      name: "Adidas",
      region: "EU",
      apiURL: "https://www.adidas.com/api/releases",
      rafflePattern: "https://www.adidas.com/yeezy",
      logoURL: "https://www.adidas.com/favicon.ico",
    },
    {
      id: "footlocker",
      name: "Foot Locker",
      region: "US",
      apiURL: "https://www.footlocker.com/api/products",
      rafflePattern: "https://launches.footlocker.com",
      logoURL: "https://www.footlocker.com/favicon.ico",
    },
    {
      id: "sns",
      name: "SneakersNStuff",
      region: "EU",
      apiURL: "https://www.sneakersnstuff.com/en/api/releases",
      rafflePattern: "https://www.sneakersnstuff.com/en/raffles",
      logoURL: "https://www.sneakersnstuff.com/favicon.ico",
    },
    {
      id: "end",
      name: "END Clothing",
      region: "EU",
      apiURL: "https://launches.endclothing.com/api",
      rafflePattern: "https://launches.endclothing.com",
      logoURL: "https://launches.endclothing.com/favicon.ico",
    },
  ];

  for (const retailer of retailers) {
    await db.collection("retailers").doc(retailer.id).set({
      ...retailer,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log("🏪 Retailers seeded.");

  // 4️⃣ Example Users
  const users = [
    {
      uid: "test-user-1",
      email: "tester1@example.com",
      preferences: { alertsEnabled: true, regions: ["US"], categories: ["basketball", "collabs"] },
    },
    {
      uid: "test-user-2",
      email: "tester2@example.com",
      preferences: { alertsEnabled: true, regions: ["EU"], categories: ["running", "lifestyle"] },
    },
  ];

  for (const user of users) {
    const userRef = db.collection("users").doc(user.uid);
    await userRef.set({
      email: user.email,
      preferences: user.preferences,
      createdAt: new Date(),
    });

    // Add alert subscriptions
    await userRef.collection("alerts").doc("sample-alert").set({
      productId: "nike-air-jordan-1",
      notifyEmail: true,
      notifyPush: true,
    });
  }
  console.log("👤 Test users seeded.");

  // 5️⃣ Example Release (Demo)
  await db.collection("releases").doc("nike-air-jordan-1").set({
    productId: "nike-air-jordan-1",
    productName: "Air Jordan 1 Retro High OG",
    sku: "555088-101",
    brand: "Nike",
    category: "basketball",
    retailerId: "nike",
    retailerName: "Nike",
    releaseDate: new Date(Date.now() + 86400000), // +1 day
    status: "UPCOMING",
    price: 180,
    region: "US",
    createdAt: new Date(),
  });
  console.log("👟 Example release seeded.");

  console.log("✅ Firestore seeding complete!");
  process.exit(0);
}

seedFirestore().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
