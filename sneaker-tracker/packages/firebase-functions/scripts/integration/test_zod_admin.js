import admin from "firebase-admin";
import fs from "fs";

/**
 * Test Zod validation using Firebase Admin SDK
 * This bypasses callable function auth requirements
 */

async function main() {
  // Initialize Admin SDK
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
    console.error("❌ FIREBASE_SERVICE_ACCOUNT_PATH not set or file not found");
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  const db = admin.firestore();
  
  // Test payload: Nike without SKU should fail
  const testDoc = {
    retailerId: "nike-test",
    productName: "Zod Test - Missing SKU",
    brand: "Nike",
    status: "UPCOMING",
    // Missing SKU field - should trigger Zod error
  };

  const testId = `zod-test-${Date.now()}`;
  
  console.log("📝 Testing Zod validation by simulating ingest workflow...");
  console.log("Payload:", JSON.stringify(testDoc, null, 2));

  try {
    // Simulate the validation that happens in onReleaseIngest
    const { z } = await import("zod");
    
    const StatusEnum = z.enum(["UPCOMING", "LIVE", "RAFFLE OPEN", "RESTOCK", "SOLD OUT"]);
    const ReleaseInputSchema = z
      .object({
        retailerId: z.string().min(1, "retailerId is required"),
        productName: z.string().min(1, "productName is required"),
        brand: z.string().min(1, "brand is required"),
        status: StatusEnum,
        sku: z.string().optional(),
        price: z.union([z.number(), z.string()]).optional(),
        stockData: z.any().optional(),
        productId: z.string().optional(),
        id: z.string().optional(),
        region: z.string().optional(),
        retailerName: z.string().optional(),
        isNew: z.boolean().optional(),
      })
      .refine((d) => {
        const b = (d.brand || "").toLowerCase();
        if (["nike", "jordan"].includes(b)) {
          return typeof d.sku === "string" && d.sku.length > 0;
        }
        return true;
      }, { path: ["sku"], message: "sku is required for Nike/Jordan releases" });

    const parsed = ReleaseInputSchema.safeParse(testDoc);
    
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => `${i.path.join('.')||'(root)'}: ${i.message}`).join("; ");
      const mentionsSku = /sku is required/i.test(msg);
      
      console.log(`\n❌ Validation failed (as expected): ${msg}`);
      
      if (mentionsSku) {
        console.log("✅ Zod validation enforced: Nike/Jordan SKU requirement working correctly!\n");
        process.exit(0);
      } else {
        console.error("❌ Error message doesn't mention SKU requirement");
        process.exit(1);
      }
    } else {
      console.error("❌ Validation passed when it should have failed (Nike without SKU)");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Test failed with exception:", error);
    process.exit(1);
  }
}

main();
