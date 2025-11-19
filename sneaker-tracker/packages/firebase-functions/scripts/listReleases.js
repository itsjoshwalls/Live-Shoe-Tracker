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

async function main() {
  const snap = await db.collection("releases").limit(10).get();
  
  if (snap.empty) {
    console.log("No releases found.");
    process.exit(0);
  }
  
  console.log(`\nFound ${snap.size} releases (showing up to 10):\n`);
  snap.forEach((doc) => {
    const data = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`  Name: ${data.productName || data.name || 'N/A'}`);
    console.log(`  Status: ${data.status || 'N/A'}`);
    console.log(`  Retailer: ${data.retailerName || data.retailerId || 'N/A'}`);
    console.log(``);
  });
  
  console.log(`\nTo flip a release status, run:`);
  console.log(`pnpm run set-status <releaseId> <newStatus>`);
  console.log(`Example: pnpm run set-status kith-12345 LIVE\n`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
