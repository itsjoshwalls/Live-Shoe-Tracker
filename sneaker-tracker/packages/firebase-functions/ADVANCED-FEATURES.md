# Advanced Firebase Functions - User Alerts, Queues & Metrics

## Overview

Extended Firebase Cloud Functions providing:
- **User Alerts** - Subscribe to release notifications
- **Scraper Queue** - Distributed job management
- **Metrics** - Real-time metrics tracking
- **Webhooks** - Discord & Slack integrations

## New Functions Deployed

### User Alert Management

#### `subscribeAlert` (Callable)
Subscribe authenticated user to release alerts.

```javascript
const functions = firebase.functions();
const result = await functions.httpsCallable('subscribeAlert')({
  alertData: {
    key: "aj4-bred",
    brand: "Jordan",
    keywords: ["bred", "jordan 4"],
    notifyMethods: ["email", "push"]
  }
});
```

#### `unsubscribeAlert` (Callable)
Unsubscribe from alert.

```javascript
await functions.httpsCallable('unsubscribeAlert')({
  alertKey: "aj4-bred"
});
```

#### `getMyAlerts` (Callable)
Get user's active alerts.

```javascript
const { data } = await functions.httpsCallable('getMyAlerts')();
console.log(data.alerts);  // Array of active alerts
```

### Webhook Alerts

#### `onReleaseStatusChange` (Firestore Trigger)
Automatically sends alerts when release status changes to LIVE or RAFFLE_OPEN.

**Sends to**:
- Discord (if `DISCORD_WEBHOOK_URL` env var set)
- Slack (if `SLACK_WEBHOOK_URL` env var set)
- Logs alert in Firestore `logs` collection

**Configure webhooks**:
```bash
firebase functions:config:set discord.webhook_url="https://discord.com/api/webhooks/..."
firebase functions:config:set slack.webhook_url="https://hooks.slack.com/services/..."
```

**Alert format**:
```
🔥 **Air Jordan 4 Bred** at NIKE is now *LIVE*!
https://nike.com/launch/xxx
```

### Scraper Queue

#### `addScraperJob` (Callable)
Add scraping job to queue.

```javascript
const { data } = await functions.httpsCallable('addScraperJob')({
  target: "kith",
  params: { collection: "footwear" }
});
console.log(data.jobId);  // "abc123..."
```

#### `getNextJob` (Callable)
Worker claims next pending job.

```javascript
const { data } = await functions.httpsCallable('getNextJob')({
  workerId: "worker-1"
});

if (data.job) {
  // Process job
  const result = await processScraper(data.job.target, data.job.params);
  
  // Mark complete
  await functions.httpsCallable('markJobComplete')({
    jobId: data.job.id,
    success: true,
    details: { itemsScraped: 150 }
  });
}
```

#### `markJobComplete` (Callable)
Mark job as done or failed.

```javascript
await functions.httpsCallable('markJobComplete')({
  jobId: "abc123",
  success: false,
  details: { error: "Connection timeout" }
});
```

### Metrics

#### `metricsEndpoint` (HTTP)
Prometheus-style metrics export.

**URL**: `https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/metricsEndpoint`

**Response**:
```
total_releases_count 543
alerts_sent_count 92
scrapers_run_count 1250
```

**Integration with Prometheus**:
```yaml
scrape_configs:
  - job_name: 'firebase-functions'
    scrape_interval: 60s
    static_configs:
      - targets: ['YOUR_REGION-YOUR_PROJECT.cloudfunctions.net']
    metrics_path: '/metricsEndpoint'
```

## Firestore Collections

### `users/{uid}/alerts/{alertKey}`
```javascript
{
  key: "aj4-bred",
  brand: "Jordan",
  keywords: ["bred", "jordan 4"],
  notifyMethods: ["email", "push"],
  active: true,
  createdAt: <timestamp>,
  updatedAt: <timestamp>
}
```

### `queues/{jobId}`
```javascript
{
  target: "kith",
  params: { collection: "footwear" },
  status: "pending" | "in_progress" | "done" | "failed",
  createdAt: <timestamp>,
  claimedBy: "worker-1",
  startedAt: <timestamp>,
  finishedAt: <timestamp>,
  details: { itemsScraped: 150 }
}
```

### `metrics/{metricName}`
```javascript
{
  count: 543,
  lastUpdated: <timestamp>
}
```

### `logs/{logId}`
```javascript
{
  type: "alert",
  eventType: "LIVE",
  releaseId: "kith-555088701",
  timestamp: <timestamp>
}
```

## Usage Examples

### Example 1: User Alert Subscription Flow

```javascript
// Frontend - User subscribes to alert
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

const functions = getFunctions();
const auth = getAuth();

// User must be signed in
await auth.signInWithEmailAndPassword(email, password);

// Subscribe to Jordan 4 Bred alerts
await httpsCallable(functions, 'subscribeAlert')({
  alertData: {
    key: "aj4-bred",
    brand: "Jordan",
    keywords: ["bred", "jordan 4"],
    notifyMethods: ["email", "push"]
  }
});

// Later, unsubscribe
await httpsCallable(functions, 'unsubscribeAlert')({
  alertKey: "aj4-bred"
});
```

### Example 2: Distributed Scraper Workers

```javascript
// Worker process (runs on schedule or continuously)
import admin from 'firebase-admin';
import { getFunctions, httpsCallable } from 'firebase-admin/functions';

admin.initializeApp();
const functions = getFunctions();

async function scraperWorker() {
  while (true) {
    // Claim next job
    const { job } = await httpsCallable(functions, 'getNextJob')({
      workerId: process.env.WORKER_ID
    });
    
    if (!job) {
      await sleep(5000);  // Wait 5s if no jobs
      continue;
    }
    
    try {
      // Run scraper
      const releases = await runScraper(job.target, job.params);
      
      // Mark success
      await httpsCallable(functions, 'markJobComplete')({
        jobId: job.id,
        success: true,
        details: { itemsScraped: releases.length }
      });
    } catch (err) {
      // Mark failure
      await httpsCallable(functions, 'markJobComplete')({
        jobId: job.id,
        success: false,
        details: { error: err.message }
      });
    }
  }
}

scraperWorker();
```

### Example 3: Discord/Slack Webhook Setup

```bash
# Set environment variables
firebase functions:config:set discord.webhook_url="https://discord.com/api/webhooks/YOUR_WEBHOOK"
firebase functions:config:set slack.webhook_url="https://hooks.slack.com/services/YOUR_WEBHOOK"

# Redeploy functions
firebase deploy --only functions
```

**Create Discord Webhook**:
1. Discord Server → Edit Channel → Integrations → Webhooks
2. Create Webhook → Copy URL
3. Set in Firebase config

**Create Slack Webhook**:
1. https://api.slack.com/apps → Create App
2. Incoming Webhooks → Activate → Add New Webhook
3. Copy URL → Set in Firebase config

### Example 4: Monitoring with Grafana

```bash
# Prometheus scrape config
scrape_configs:
  - job_name: 'sneaker-tracker'
    scrape_interval: 60s
    static_configs:
      - targets: ['us-central1-YOUR_PROJECT.cloudfunctions.net']
    metrics_path: '/metricsEndpoint'
    scheme: https
```

**Grafana Dashboard Queries**:
```promql
# Total releases over time
total_releases_count

# Alert rate (alerts per hour)
rate(alerts_sent_count[1h]) * 3600

# Scraper job completion rate
rate(scrapers_run_count[5m]) * 60
```

## Security

### Authentication Required

User alert functions require authentication:

```javascript
export const subscribeAlert = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }
  // User is authenticated, proceed...
});
```

### Admin-Only Functions

To restrict scraper queue management to admins:

```javascript
export const addScraperJob = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token?.admin) {
    throw new functions.https.HttpsError("permission-denied", "Admin only");
  }
  // Admin verified, proceed...
});
```

**Set custom claims**:
```javascript
// Set user as admin
await admin.auth().setCustomUserClaims(uid, { admin: true });
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User alerts - only own alerts
    match /users/{uid}/alerts/{alertId} {
      allow read, write: if request.auth.uid == uid;
    }
    
    // Queues - read-only for workers
    match /queues/{jobId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    
    // Metrics - read-only
    match /metrics/{metricId} {
      allow read: if true;
      allow write: if false;  // Only Cloud Functions can write
    }
    
    // Logs - read-only
    match /logs/{logId} {
      allow read: if request.auth != null;
      allow write: if false;  // Only Cloud Functions can write
    }
  }
}
```

## Cost Implications

### Free Tier
- 2M invocations/month
- 400,000 GB-seconds
- 200,000 CPU-seconds

### Estimated Usage (with all features)
- `onReleaseStatusChange` trigger: ~150/day = 4,500/month
- `subscribeAlert` calls: ~100/day = 3,000/month
- `metricsEndpoint` scrapes: 1440/day (every minute) = 43,200/month
- Worker `getNextJob` calls: ~1000/day = 30,000/month
- **Total**: ~81,000 invocations/month

**Status**: ✅ **Still within free tier!**

## Troubleshooting

### Webhooks Not Sending

Check environment config:
```bash
firebase functions:config:get
```

Should show:
```json
{
  "discord": {
    "webhook_url": "https://..."
  },
  "slack": {
    "webhook_url": "https://..."
  }
}
```

### User Alerts Not Working

1. Verify user is authenticated
2. Check Firestore rules allow writes to `users/{uid}/alerts`
3. View logs: `firebase functions:log --only subscribeAlert`

### Queue Jobs Stuck in "in_progress"

Add timeout cleanup function:
```javascript
// Run daily to clean up stale jobs
export const cleanupStaleJobs = functions.pubsub
  .schedule('0 */6 * * *')  // Every 6 hours
  .onRun(async () => {
    const staleTime = Date.now() - (3600 * 1000);  // 1 hour ago
    const staleJobs = await db.collection('queues')
      .where('status', '==', 'in_progress')
      .where('startedAt', '<', new Date(staleTime))
      .get();
    
    for (const doc of staleJobs.docs) {
      await doc.ref.update({ status: 'failed', details: 'Timeout' });
    }
  });
```

## Next Steps

- [ ] Implement personalized user alert matching (keywords → releases)
- [ ] Add email notification handler
- [ ] Add push notification handler (FCM)
- [ ] Implement rate limiting for user alerts
- [ ] Add webhook retry logic with exponential backoff
- [ ] Create admin dashboard for queue management
- [ ] Add metrics for queue performance (avg job duration, failure rate)
