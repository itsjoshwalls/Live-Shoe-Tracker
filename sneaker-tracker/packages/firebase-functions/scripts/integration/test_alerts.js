import admin from "firebase-admin";
import fs from "fs";

// Load Admin using FIREBASE_SERVICE_ACCOUNT or ADC
if (admin.apps.length === 0) {
  let svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  const svcPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!svc && svcPath && fs.existsSync(svcPath)) {
    svc = fs.readFileSync(svcPath, "utf-8");
  }
  if (svc) {
    const json = typeof svc === "string" ? JSON.parse(svc) : svc;
    const projectId = json.project_id || process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
    admin.initializeApp({ credential: admin.credential.cert(json), projectId });
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
    admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
  }
}

const db = admin.firestore();

async function main() {
  const id = "it-alerts-aj1";
  const releaseRef = db.collection("releases").doc(id);

  // Ensure release exists with productId
  await releaseRef.set(
    {
      productId: id,
      productName: "IT Test AJ1",
      retailerId: "nike",
      retailerName: "Nike",
      status: "UPCOMING",
      price: 180,
      region: "US",
      createdAt: new Date(),
    },
    { merge: true }
  );

  // Create a test user alert that targets this productId so we can assert trigger path
  const testUid = "it-user-1";
  const alertKey = id;
  await db
    .collection("users")
    .doc(testUid)
    .collection("alerts")
    .doc(alertKey)
    .set(
      {
        key: alertKey,
        productId: id,
        brand: "Jordan",
        notifyEmail: true,
        email: "test@example.com",
        notifyPush: false,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );

  // Flip status to LIVE and wait briefly to allow triggers to run
  await releaseRef.update({ status: "LIVE", updatedAt: new Date() });

  console.log("✅ Integration: status flipped to LIVE for", id);
  console.log("ℹ️ Check Firebase logs for onReleaseStatusChange and onReleaseTriggerUserAlerts outputs (should send email for it-user-1).");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
