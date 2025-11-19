# 🚀 Deployment Checklist - Live Shoe Tracker

## 📋 Pre-Deployment

### Local Development ✅
- [ ] All Cloud Functions tested in emulators
- [ ] Firestore rules tested locally
- [ ] Seed data loaded successfully
- [ ] No errors in emulator logs
- [ ] All handlers working correctly

### Code Quality ✅
- [ ] No console.errors in production code
- [ ] All sensitive data in environment variables
- [ ] `.gitignore` includes `.env` and `serviceAccountKey.json`
- [ ] Code linted and formatted
- [ ] Function names follow naming conventions

### Configuration ✅
- [ ] `firebase.json` configured correctly
- [ ] `firestore.rules` reviewed and tested
- [ ] `firestore.indexes.json` includes all required indexes
- [ ] `package.json` has correct dependencies
- [ ] Service account key available (for seeding)

---

## 🔥 Firebase Console Setup

### Project Configuration
- [ ] Firebase project created
- [ ] Firestore Database enabled (Native mode)
- [ ] Authentication enabled (Email/Password, Google)
- [ ] Billing account linked (for Cloud Functions)
- [ ] Cloud Functions quota limits reviewed

### Authentication
- [ ] Authentication providers enabled:
  - [ ] Email/Password
  - [ ] Google Sign-In
  - [ ] Anonymous (if needed)
- [ ] Admin user created
- [ ] Admin custom claims set:
  ```javascript
  admin.auth().setCustomUserClaims(uid, { admin: true });
  ```

### Firestore Setup
- [ ] Database created in desired region
- [ ] Security rules deployed
- [ ] Composite indexes deployed
- [ ] Initial data seeded

---

## 📦 Deployment Steps

### 1. Deploy Firestore Rules
```powershell
firebase deploy --only firestore:rules
```
**Verify:** Check Firebase Console → Firestore → Rules

### 2. Deploy Firestore Indexes
```powershell
firebase deploy --only firestore:indexes
```
**Verify:** Check Firebase Console → Firestore → Indexes
⏱️ **Note:** Indexes may take several minutes to build

### 3. Deploy Cloud Functions
```powershell
cd functions
npm run deploy
```
**Verify:** Check Firebase Console → Functions → Dashboard

Expected functions:
- `onReleaseWrite`
- `onRetailerWrite`
- `onStockWrite`
- `onQueueJob`
- `sendAlertNotifications`
- `runScheduledScraper`
- `collectSystemMetrics`

### 4. Seed Production Data
```powershell
# Update GOOGLE_APPLICATION_CREDENTIALS in .env
# Point to production service account key
npm run seed
```

**Verify:** Check Firestore collections:
- `categories` (4 documents)
- `regions` (4 documents)
- `retailers` (5 documents)

### 5. Import Additional Data (if available)
```powershell
firebase firestore:import firestore.seed.json
```

---

## 🔗 Integration Setup

### Discord Alerts
1. Create Discord server (or use existing)
2. Create webhook: Server Settings → Integrations → Webhooks
3. Copy webhook URL
4. Set in Firebase Functions config:
```powershell
firebase functions:config:set alerts.discord_webhook="YOUR_WEBHOOK_URL"
```

### Slack Alerts
1. Create Slack app at api.slack.com/apps
2. Enable Incoming Webhooks
3. Add to workspace and copy webhook URL
4. Set in Firebase Functions config:
```powershell
firebase functions:config:set alerts.slack_webhook="YOUR_WEBHOOK_URL"
```

### Apply Config
```powershell
firebase deploy --only functions
```

---

## ✅ Post-Deployment Verification

### Cloud Functions
- [ ] All functions deployed successfully
- [ ] No deployment errors in logs
- [ ] Scheduled functions appear in Cloud Scheduler
- [ ] Test HTTP triggers (if any)

### Firestore
- [ ] Security rules active
- [ ] Indexes built (check status)
- [ ] Seed data present
- [ ] Test read/write operations

### Monitoring
- [ ] Function logs accessible:
  ```powershell
  firebase functions:log
  ```
- [ ] No runtime errors
- [ ] Scheduled functions executing on time
- [ ] Alert notifications working

### Performance
- [ ] Function execution time < 60s
- [ ] Memory usage within limits
- [ ] Cold start time acceptable
- [ ] No timeout errors

---

## 📊 Monitoring & Alerts

### Firebase Console
- [ ] Functions → Dashboard: Monitor invocations
- [ ] Functions → Logs: Check for errors
- [ ] Firestore → Usage: Monitor reads/writes
- [ ] Authentication → Users: Verify user counts

### Cost Monitoring
- [ ] Billing → Budget alerts set
- [ ] Cloud Functions quota limits reviewed
- [ ] Firestore read/write limits checked
- [ ] Expected monthly costs calculated

### Health Checks
```powershell
# View function logs
firebase functions:log --only sendAlertNotifications

# Check specific function
firebase functions:log --only onReleaseWrite --limit 50

# Follow logs in real-time
firebase functions:log --follow
```

---

## 🔐 Security Review

### Firestore Rules
- [ ] User data isolated (`users/{uid}`)
- [ ] Admin-only write for public collections
- [ ] Subcollections properly secured
- [ ] No wildcard allow rules

### Function Security
- [ ] No hardcoded secrets
- [ ] Environment variables properly set
- [ ] Service account key secure
- [ ] CORS configured (if using HTTP functions)

### Authentication
- [ ] Admin users have custom claims
- [ ] Email verification enabled (if required)
- [ ] Password strength requirements set
- [ ] Account recovery configured

---

## 🐛 Troubleshooting

### Functions Not Triggering
```powershell
# Check function logs
firebase functions:log

# Verify function deployed
firebase functions:list

# Test manually in Firebase Console
```

### Firestore Permission Denied
- Check security rules match collection names
- Verify user authentication
- Check admin custom claims

### Indexes Not Building
- Wait 10-15 minutes
- Check Firebase Console → Firestore → Indexes
- Verify index configuration is valid

### Scheduled Functions Not Running
- Check Cloud Scheduler in GCP Console
- Verify time zone settings
- Check function logs for errors

---

## 🎯 Go-Live Checklist

### Final Checks
- [ ] All tests passing
- [ ] No errors in logs
- [ ] Alerts configured and tested
- [ ] Monitoring dashboards set up
- [ ] Backup strategy in place
- [ ] Rollback plan documented
- [ ] Team notified of deployment

### Launch
- [ ] Deploy all components
- [ ] Verify production data
- [ ] Test critical user flows
- [ ] Monitor for 1-2 hours post-deployment
- [ ] Communicate with stakeholders

### Post-Launch
- [ ] Document any issues encountered
- [ ] Update runbook with lessons learned
- [ ] Schedule post-mortem (if needed)
- [ ] Plan next iteration

---

## 📞 Support Resources

- Firebase Docs: https://firebase.google.com/docs
- Cloud Functions: https://firebase.google.com/docs/functions
- Firestore: https://firebase.google.com/docs/firestore
- Stack Overflow: https://stackoverflow.com/questions/tagged/firebase

---

**Last Updated:** November 8, 2025
