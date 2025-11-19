import admin from "firebase-admin";

if (admin.apps.length === 0) {
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (svc) {
    const json = typeof svc === "string" ? JSON.parse(svc) : svc;
    admin.initializeApp({ credential: admin.credential.cert(json) });
  } else {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
}

const db = admin.firestore();

async function main() {
  console.log("🔧 Backfilling productId for releases missing it...");
  const snap = await db.collection("releases").get();
  let updated = 0;
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    if (!data.productId) {
      await doc.ref.set({ productId: doc.id }, { merge: true });
      updated++;
      console.log(`  ✔ set productId=${doc.id} for ${doc.id}`);
    }
  }
  console.log(`✅ Done. Updated ${updated} release(s).`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("❌ Backfill failed:", e);
  process.exit(1);
});
