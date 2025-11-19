# Multi-Environment Firebase Setup - Quick Reference

## ✅ Setup Complete

Your sneaker tracker now supports **production** and **staging** Firebase environments.

---

## 🚀 Quick Commands

### Switch to Staging
```powershell
.\switch-firebase-env.ps1 staging
pnpm run dev:staging
```

### Switch to Production
```powershell
.\switch-firebase-env.ps1 production
pnpm run dev
```

### Build for Staging
```powershell
pnpm run build:staging
```

---

## 📋 What Changed

### Files Modified
- ✅ `lib/firebaseClient.ts` - Added environment detection
- ✅ `.env.local` - Added `NEXT_PUBLIC_FIREBASE_ENV` and staging config placeholder
- ✅ `package.json` - Added `dev:staging` and `build:staging` scripts

### Files Created
- ✅ `.env.example` - Template with all required variables
- ✅ `FIREBASE-MULTI-ENV.md` - Complete documentation
- ✅ `switch-firebase-env.ps1` - PowerShell helper script

### Dependencies Added
- ✅ `cross-env` - Cross-platform environment variable support

---

## 🎯 Next Steps to Enable Staging

### 1. Create Staging Project in Firebase Console
```
1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Name: sneaker-tracker-staging
4. Enable Firestore + Authentication
```

### 2. Get Staging Config
```
1. Project Settings → General → Your apps → Add app (Web)
2. Copy the config object:
   {
     apiKey: "...",
     authDomain: "...",
     projectId: "sneaker-tracker-staging",
     ...
   }
3. Stringify it (remove newlines): JSON.stringify({...})
4. Replace NEXT_PUBLIC_FIREBASE_STAGING_CONFIG in .env.local
```

### 3. Deploy Firestore Rules to Staging
```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker

# Add staging project
firebase use --add
# Select your new staging project
# Alias: staging

# Deploy rules
firebase use staging
firebase deploy --only firestore:rules,firestore:indexes

# Switch back
firebase use default
```

### 4. Test Staging Environment
```powershell
pnpm run dev:staging
```

Look for console message:
```
🔥 Firebase initialized: sneaker-tracker-staging (staging)
```

---

## 🔧 Current Status

**Production:**  
✅ Working (`live-sneaker-release-tracker`)

**Staging:**  
⚠️ Needs configuration  
- Create Firebase project
- Add config to `.env.local`
- Deploy rules

---

## 💡 Tips

### Verify Active Environment
The console will show which project is active:
```
🔥 Firebase initialized: <project-id> (production|staging)
```

### Environment Variables
```bash
# Production (default)
NEXT_PUBLIC_FIREBASE_ENV=production

# Staging
NEXT_PUBLIC_FIREBASE_ENV=staging
```

### No Code Changes Needed
All existing pages (dashboard, analytics, mileage) automatically use the correct environment. The switcher is transparent.

---

## 📚 Full Documentation
See `FIREBASE-MULTI-ENV.md` for:
- Detailed setup instructions
- Vercel deployment guide
- Troubleshooting tips
- Security best practices

---

## ✨ Features

- ✅ **Zero code changes** in components/pages
- ✅ **Hot-swap environments** via env variable
- ✅ **Separate data** for testing vs production
- ✅ **Easy CI/CD** integration
- ✅ **PowerShell helper** for quick switching
- ✅ **Type-safe** (existing TypeScript works as-is)

---

**Ready to use!** Switch environments anytime without touching code.
