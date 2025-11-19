# ✅ Staging Environment Setup Complete!

## Configuration Summary

### Firebase Projects
- **Production**: `live-sneaker-release-tracker` (default)
- **Staging**: `live-shoe-tracker`

### Environment Status
✅ Staging config added to `.env.local`  
✅ Firestore rules deployed to staging  
✅ Firestore indexes deployed to staging  
✅ Development server running with staging environment  

---

## Verification Steps

### 1. Check Console Output
Open http://localhost:3000 and check browser console for:
```
🔥 Firebase initialized: live-shoe-tracker (staging)
```

### 2. Verify Environment
Current server is running with:
- Environment: **staging**
- Project ID: **live-shoe-tracker**
- Port: **3000**

---

## Quick Commands Reference

### Switch Environments
```powershell
# Switch to staging
.\switch-firebase-env.ps1 staging
pnpm run dev:staging

# Switch to production
.\switch-firebase-env.ps1 production
pnpm run dev
```

### Deploy Rules
```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker

# Deploy to staging
firebase use staging
firebase deploy --only firestore:rules,firestore:indexes

# Deploy to production
firebase use default
firebase deploy --only firestore:rules,firestore:indexes
```

### Build Commands
```powershell
# Production build
pnpm run build

# Staging build
pnpm run build:staging
```

---

## What's Different in Staging?

- **Separate Firestore database** - Test data won't affect production
- **Separate users** - Auth is isolated per project
- **Same codebase** - No code changes needed
- **Same rules** - Security rules match production

---

## Testing Checklist

- [ ] Open http://localhost:3000
- [ ] Check browser console for "🔥 Firebase initialized: live-shoe-tracker (staging)"
- [ ] Sign in (will need to create user in staging project)
- [ ] Navigate to Dashboard, Analytics, Mileage pages
- [ ] Verify data loads (or shows empty if no staging data exists)
- [ ] Test mileage increment (will write to staging Firestore)

---

## Seed Staging Data (Optional)

If you want test data in staging:

### Option 1: Manual Entry
1. Go to https://console.firebase.google.com/project/live-shoe-tracker/firestore
2. Create collections manually (releases, retailers, etc.)

### Option 2: Copy from Production
```powershell
# Export from production
firebase use default
gcloud firestore export gs://live-sneaker-release-tracker.appspot.com/backup

# Import to staging
firebase use staging
gcloud firestore import gs://live-sneaker-release-tracker.appspot.com/backup
```

### Option 3: Run Scrapers Against Staging
```powershell
# Set staging service account
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'path\to\staging-service-account.json' -Raw

# Run scrapers (will write to staging)
cd packages/scrapers
npm run monitor
```

---

## Troubleshooting

### "Missing Firebase configuration"
- Ensure `NEXT_PUBLIC_FIREBASE_STAGING_CONFIG` is in `.env.local`
- Restart dev server after changing `.env.local`

### "Permission denied" errors
- Check Firestore rules in staging project
- Ensure you're authenticated (staging has separate users)

### Data not showing
- Staging Firestore is initially empty
- Seed data manually or run scrapers

### Wrong project in console
- Check console message shows "live-shoe-tracker (staging)"
- Verify `NEXT_PUBLIC_FIREBASE_ENV=staging` is set

---

## Next Steps

1. ✅ **Test current setup** - Verify staging works
2. Create staging user accounts for testing
3. (Optional) Seed test data
4. Deploy to Vercel with staging branch

---

## Current Server Status

🟢 **Running**: http://localhost:3000  
🔧 **Environment**: staging  
📦 **Project**: live-shoe-tracker  

**Stop server**: Press Ctrl+C in terminal
