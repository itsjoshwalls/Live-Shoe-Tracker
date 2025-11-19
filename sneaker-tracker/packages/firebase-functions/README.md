# Firebase Cloud Functions - Sneaker Tracker

This package contains Firebase Cloud Functions for the Sneaker Tracker platform, providing serverless triggers and callable functions for Firestore events.

## Functions Overview

### Callable Functions

#### `onReleaseIngest`
HTTPS callable function for ingesting release data from scrapers or external sources.

**Usage**:
```javascript
const functions = firebase.functions();
const result = await functions.httpsCallable('onReleaseIngest')({
  retailerId: 'kith',
  productName: 'Air Jordan 1 High OG',
  productId: '555088701',
  price: 170,
  stockData: {
    "US_9": { total: 50, available: 20 },
    "US_10": { total: 60, available: 0 }
  },
  isNew: true
});
```

**Process**:
1. Ensures retailer metadata exists
2. Creates/updates release document
3. Updates daily stats
4. Records stock snapshot (if provided)

### Scheduled Functions

#### `scheduledFinalizeDailyStats`
Runs daily at 12:10 AM UTC to finalize previous day's stats.

**Schedule**: `10 0 * * *` (cron format)  
**Timezone**: UTC

### Firestore Triggers

#### `onReleaseCreated`
Triggered when a new release document is created.
- Auto-updates daily stats counter

#### `onReleaseUpdated`
Triggered when a release document is updated.
- Only counts updates if status or price changed
- Prevents stat inflation from minor updates

#### `onRetailerChange`
Triggered when retailer metadata is created/updated/deleted.
- Logs changes for audit trail

### HTTP Endpoints

#### `health`
Simple health check endpoint.

**URL**: `https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/health`  
**Response**: `200 OK - "Sneaker Tracker backend operational ✅"`

## Deployment

### Prerequisites

1. **Firebase CLI** installed:
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project** initialized:
   ```bash
   firebase login
   firebase init functions
   ```

3. **Node.js 18** or higher

### Deploy All Functions

```bash
cd packages/firebase-functions
pnpm install
pnpm run deploy
```

### Deploy Specific Function

```bash
firebase deploy --only functions:onReleaseIngest
firebase deploy --only functions:scheduledFinalizeDailyStats
```

## Local Development

### Start Emulators

```bash
pnpm run serve
```

This starts:
- Functions emulator: `http://localhost:5001`
- Firestore emulator: `http://localhost:8080`

### Test Callable Function

```javascript
// In your app code
const functions = firebase.app().functions('us-central1');
functions.useEmulator('localhost', 5001);

const result = await functions.httpsCallable('onReleaseIngest')({
  retailerId: 'test',
  productName: 'Test Sneaker',
  isNew: true
});
```

### View Logs

```bash
pnpm run logs
# Or for specific function:
firebase functions:log --only onReleaseIngest
```

## Integration with Scrapers

The scrapers package can optionally call `onReleaseIngest` instead of writing directly to Firestore:

```javascript
// In scrapers/handlers/releaseHandler.js
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const ingestRelease = httpsCallable(functions, 'onReleaseIngest');

for (const release of releases) {
  await ingestRelease({
    retailerId: storeKey,
    productName: release.name,
    productId: release.sku,
    price: release.price,
    stockData: release.stock,
    isNew: true
  });
}
```

## Environment Configuration

### Firebase Config

The functions automatically use the Firebase project's default credentials when deployed.

For local development, set:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

### Function Configuration

Set runtime config:

```bash
firebase functions:config:set someservice.key="THE API KEY"
```

Access in code:

```javascript
const config = functions.config().someservice.key;
```

## Security

### Authentication

Callable functions automatically include `context.auth` with user info:

```javascript
export const onReleaseIngest = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be logged in'
    );
  }
  
  const uid = context.auth.uid;
  // ...
});
```

### Firestore Rules

Ensure your Firestore rules allow writes from authenticated users:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /releases/{releaseId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Monitoring

### Cloud Console

View function execution, errors, and logs:
- https://console.firebase.google.com/project/YOUR_PROJECT/functions

### Metrics

Key metrics to monitor:
- **Invocations**: Total function calls
- **Execution time**: Average duration
- **Errors**: Failed invocations
- **Memory usage**: Peak memory

### Alerts

Set up alerts in Firebase Console:
- Error rate threshold
- Execution time threshold
- Budget alerts

## Cost Optimization

### Free Tier Limits
- 2M invocations/month
- 400,000 GB-seconds
- 200,000 CPU-seconds

### Tips
- Use Firestore triggers sparingly (they consume quota)
- Batch operations when possible
- Set appropriate memory limits (default: 256MB)
- Use scheduled functions instead of polling

### Memory Configuration

```javascript
export const onReleaseIngest = functions
  .runWith({ memory: '512MB', timeoutSeconds: 60 })
  .https.onCall(async (data, context) => {
    // ...
  });
```

## Troubleshooting

### Function Not Triggering

1. Check function is deployed:
   ```bash
   firebase functions:list
   ```

2. Verify Firestore path matches:
   ```javascript
   .document("releases/{releaseId}")  // Exact collection name
   ```

3. Check logs for errors:
   ```bash
   pnpm run logs
   ```

### Permission Errors

Ensure service account has necessary roles:
- Cloud Datastore User
- Cloud Functions Developer

### Import Errors

If you see "Cannot find module" errors:
1. Ensure `package.json` has correct dependencies
2. Run `pnpm install` in `firebase-functions/` folder
3. Check import paths are relative (use `./` or `../`)

## Architecture

```
Scraper → onReleaseIngest (callable) → Firestore
                ↓
        ensureRetailerMetadata
        handleReleaseUpdate
        updateDailyStats
        recordStockSnapshot

Firestore → onReleaseCreated (trigger) → updateDailyStats
         → onReleaseUpdated (trigger) → updateDailyStats

Scheduler → scheduledFinalizeDailyStats → finalizeDailyStats
```

## Next Steps

- [ ] Add authentication to `onReleaseIngest`
- [ ] Implement rate limiting for callable functions
- [ ] Add webhook notifications for sold-out items
- [ ] Create admin functions for bulk operations
- [ ] Set up CI/CD pipeline for automatic deployments

## Resources

- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Cloud Scheduler](https://cloud.google.com/scheduler/docs)
- [Firestore Triggers](https://firebase.google.com/docs/functions/firestore-events)
