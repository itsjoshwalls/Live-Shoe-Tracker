# Firebase Cloud Functions Quick Start

## Setup (One-Time)

```powershell
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (if not done)
cd sneaker-tracker
firebase init functions
# Select: Use existing project
# Choose: JavaScript (ESM)
# Install dependencies: Yes
```

## Deploy Functions

```powershell
# Deploy all functions
cd sneaker-tracker/packages/firebase-functions
pnpm install
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:onReleaseIngest
firebase deploy --only functions:scheduledFinalizeDailyStats
```

## Test Locally

```powershell
# Start emulators
cd sneaker-tracker/packages/firebase-functions
pnpm run serve

# In another terminal, test callable function
node
```

```javascript
// In Node REPL
const { getFunctions, httpsCallable } = await import('firebase/functions');
const { initializeApp } = await import('firebase/app');

const app = initializeApp({ projectId: 'your-project-id' });
const functions = getFunctions(app);
functions.useEmulator('localhost', 5001);

const ingest = httpsCallable(functions, 'onReleaseIngest');
const result = await ingest({
  retailerId: 'kith',
  productName: 'Test Sneaker',
  productId: 'TEST-001',
  price: 150,
  isNew: true
});

console.log(result.data);
```

## Monitor

```powershell
# View logs
firebase functions:log

# View specific function logs
firebase functions:log --only onReleaseIngest

# Watch logs in real-time
firebase functions:log --lines 100
```

## Integration with Scrapers

To have scrapers call Cloud Functions instead of writing directly to Firestore:

```javascript
// Add to scrapers/handlers/releaseHandler.js
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp } from 'firebase/app';

const firebaseConfig = JSON.parse(process.env.FIREBASE_CLIENT_CONFIG);
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// In production
// const ingestRelease = httpsCallable(functions, 'onReleaseIngest');

// In development (using emulator)
if (process.env.NODE_ENV === 'development') {
  functions.useEmulator('localhost', 5001);
}

const ingestRelease = httpsCallable(functions, 'onReleaseIngest');

// Call from scraper
for (const release of releases) {
  await ingestRelease({
    retailerId: storeKey,
    productName: release.name,
    productId: release.sku,
    price: release.price,
    stockData: release.stock,
    isNew: !existingReleases.has(release.sku)
  });
}
```

## Functions Deployed

After deployment, you'll have these functions:

**Callable**:
- `onReleaseIngest` - Ingest release data via HTTPS call

**Scheduled**:
- `scheduledFinalizeDailyStats` - Runs daily at 12:10 AM UTC

**Firestore Triggers**:
- `onReleaseCreated` - Auto-updates stats on new release
- `onReleaseUpdated` - Auto-updates stats on release changes
- `onRetailerChange` - Logs retailer metadata changes

**HTTP Endpoints**:
- `health` - Health check endpoint

## URLs

After deployment, Firebase will provide URLs like:

```
https://us-central1-YOUR_PROJECT.cloudfunctions.net/onReleaseIngest
https://us-central1-YOUR_PROJECT.cloudfunctions.net/health
```

## Cost

**Free Tier**:
- 2M invocations/month
- 400,000 GB-seconds
- 200,000 CPU-seconds

**Estimated Usage** (with scrapers running daily):
- ~150 releases/day × 30 days = 4,500 invocations/month
- Well within free tier ✅

## Next Steps

1. Deploy functions: `firebase deploy --only functions`
2. Test health endpoint: `curl https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/health`
3. Update scrapers to call `onReleaseIngest` (optional)
4. Monitor in Firebase Console → Functions
