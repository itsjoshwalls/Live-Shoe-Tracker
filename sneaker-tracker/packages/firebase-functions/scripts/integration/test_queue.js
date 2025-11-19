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
  const job = {
    target: "kith",
    params: { page: 1 },
    targetUrl: "https://kith.com/collections/new-arrivals", // required by trigger
    status: "pending",
    createdAt: new Date(),
  };

  const doc = await db.collection("queues").add(job);
  console.log("✅ Integration: enqueued job", doc.id);
  console.log("ℹ️ Check Firebase logs for onQueueJobCreated outputs.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
