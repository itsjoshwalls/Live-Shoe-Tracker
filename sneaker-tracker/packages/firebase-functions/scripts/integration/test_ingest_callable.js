import { initializeApp } from "firebase/app";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import fs from "fs";

/**
 * This script calls the callable function `onReleaseIngest` and expects a Zod error
 * when providing a Nike/Jordan release without an SKU.
 *
 * Env requirements (one of):
 * - VITE_FIREBASE_CONFIG_JSON: stringified Firebase client config (preferred)
 * - FIREBASE_CLIENT_CONFIG_JSON: alternative name for the same
 * - Optionally set USE_FUNCTIONS_EMULATOR=true to hit the local emulator on localhost:5001
 */

function loadClientConfig() {
  let raw = process.env.VITE_FIREBASE_CONFIG_JSON || process.env.FIREBASE_CLIENT_CONFIG_JSON;
  const cfgPath = process.env.FIREBASE_CLIENT_CONFIG_PATH;
  if (!raw && cfgPath && fs.existsSync(cfgPath)) {
    raw = fs.readFileSync(cfgPath, "utf-8");
  }
  if (!raw) {
    return null;
  }
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

async function main() {
  const config = loadClientConfig();
  let callIngest;
  const region = process.env.FUNCTIONS_REGION || "us-central1";
  if (config) {
    const app = initializeApp(config);
    const functions = getFunctions(app, region);
    if (process.env.USE_FUNCTIONS_EMULATOR === "true") {
      connectFunctionsEmulator(functions, "localhost", 5001);
    }
    callIngest = (payload) => httpsCallable(functions, "onReleaseIngest")(payload);
  }

  // Nike without SKU should fail Zod schema with invalid-argument
  const badPayload = {
    retailerId: "nike",
    productName: "Zod Ingest Test - Missing SKU",
    brand: "Nike",
    status: "UPCOMING",
  };

  if (callIngest) {
    try {
      await callIngest(badPayload);
      console.error("❌ Expected invalid-argument error for missing SKU, but call succeeded");
      process.exit(1);
    } catch (e) {
      const code = e?.code || e?.error?.code || "unknown";
      const message = e?.message || e?.error?.message || String(e);
      const okCode = String(code).includes("invalid-argument");
      const mentionsSku = /sku is required/i.test(message);
      console.log(`Received error code: ${code}`);
      console.log(`Received message: ${message}`);
      if (okCode && mentionsSku) {
        console.log("✅ Zod validation enforced: missing SKU for Nike/Jordan rejected as expected");
        process.exit(0);
      } else {
        console.error("❌ Unexpected error response. Wanted invalid-argument mentioning SKU.");
        process.exit(1);
      }
    }
  } else {
    // Fallback: direct HTTP call to callable endpoint
    const projectId = process.env.FIREBASE_PROJECT_ID || "live-sneaker-release-tracker";
    const url = `https://${region}-${projectId}.cloudfunctions.net/onReleaseIngest`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: badPayload }),
    });
    const json = await res.json().catch(() => ({}));
    const err = json?.error || {};
    const status = (err.status || "").toString().toLowerCase();
    const message = err.message || JSON.stringify(json);
    const okCode = status.includes("invalid_argument") || status.includes("invalid-argument");
    const mentionsSku = /sku is required/i.test(message);
    console.log(`HTTP status: ${res.status}`);
    console.log(`Callable error status: ${err.status || "(none)"}`);
    console.log(`Message: ${message}`);
    if (okCode && mentionsSku) {
      console.log("✅ Zod validation enforced via HTTP fallback: missing SKU rejected as expected");
      process.exit(0);
    } else {
      console.error("❌ Unexpected HTTP response. Wanted invalid-argument mentioning SKU.");
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error("Test failed with exception:", err);
  process.exit(1);
});
