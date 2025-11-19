import admin from "firebase-admin";
import fs from "fs";

if (admin.apps.length === 0) {
  let svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  const svcPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!svc && svcPath && fs.existsSync(svcPath)) {
    svc = fs.readFileSync(svcPath, "utf-8");
  }
  if (svc) {
    const json = typeof svc === "string" ? JSON.parse(svc) : svc;
    admin.initializeApp({ credential: admin.credential.cert(json) });
  } else {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
}

const db = admin.firestore();

async function testValidation() {
  console.log("🧪 Testing release schema hardening...\n");

  // Test 1: Release with all fields including productId
  console.log("✅ Test 1: Release with all required fields + productId");
  const id1 = "test-val-complete";
  await db.collection("releases").doc(id1).set({
    productId: id1,
    productName: "Test Complete Release",
    brand: "Nike",
    retailerId: "nike",
    status: "UPCOMING",
    price: 150,
    createdAt: new Date(),
  });
  const snap1 = await db.collection("releases").doc(id1).get();
  console.log(`   productId present: ${snap1.data().productId === id1 ? "✅" : "❌"}\n`);

  // Test 2: Release missing productId (trigger should backfill)
  console.log("✅ Test 2: Release without productId (onCreate should backfill)");
  const id2 = "test-val-missing-productid";
  await db.collection("releases").doc(id2).set({
    productName: "Test Missing ProductId",
    brand: "Adidas",
    retailerId: "adidas",
    status: "LIVE",
    price: 180,
    createdAt: new Date(),
  });
  
  // Wait briefly for trigger to run
  // Wait for trigger to backfill productId with polling (up to 30s)
  const start = Date.now();
  const maxWaitMs = 30000;
  const intervalMs = 1000;
  let hasProductId = false;
  console.log("   Waiting up to 30s for onCreate trigger (polling)...");
  while (Date.now() - start < maxWaitMs) {
    const snap = await db.collection("releases").doc(id2).get();
    hasProductId = snap.exists && snap.data()?.productId === id2;
    if (hasProductId) break;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.log(`   productId backfilled by trigger: ${hasProductId ? "✅" : "❌"}\n`);

  // Test 3: Verify seeded release has productId
  console.log("✅ Test 3: Check seeded demo release has productId");
  const snap3 = await db.collection("releases").doc("nike-air-jordan-1").get();
  if (snap3.exists) {
    const hasProductId3 = !!snap3.data().productId;
    console.log(`   Demo release productId present: ${hasProductId3 ? "✅" : "❌"}\n`);
  } else {
    console.log("   Demo release not found (run seed script first)\n");
  }

  console.log("✅ Validation tests complete!");
  console.log("ℹ️  Note: onReleaseIngest callable validation (missing brand/status) must be tested via client SDK or authenticated API calls.");
}

testValidation()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Test suite failed:", e);
    process.exit(1);
  });
