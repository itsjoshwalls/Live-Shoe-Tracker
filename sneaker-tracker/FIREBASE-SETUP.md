# Firebase Setup Guide

Complete step-by-step instructions to get Firebase working with your Live Shoe Tracker.

## What Firebase Does in This Project

Firebase provides two main services:
1. **Firestore** - Stores scraped product data from Shopify stores (100+ products)
2. **Authentication** - User login/signup for the web app (optional)

## Current Status

✅ **Client-side config** - Already set for Next.js frontend  
❌ **Server-side credentials** - Missing (needed for Python scrapers)

---

## Step-by-Step Setup

### Step 1: Access Firebase Console

1. Open your browser and go to:
   ```
   https://console.firebase.google.com/project/live-sneaker-release-tra-df5a4
   ```

2. You should see your project dashboard

### Step 2: Download Service Account Key

This is the crucial step for scrapers to write to Firestore.

1. In the Firebase Console, click the **⚙️ gear icon** (Settings) in the left sidebar

2. Select **"Project settings"**

3. Click the **"Service accounts"** tab at the top

4. Click **"Generate new private key"** button

5. A popup will appear warning you to keep this file secure. Click **"Generate key"**

6. A JSON file will download with a name like:
   ```
   live-sneaker-release-tra-df5a4-firebase-adminsdk-xxxxx-xxxxxxxxxx.json
   ```

7. **Rename** this file to:
   ```
   firebase-service-account.json
   ```

8. **Move** it to your project root:
   ```
   C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\firebase-service-account.json
   ```

### Step 3: Set Environment Variable

Open PowerShell in your project directory and run:

```powershell
# Load the service account JSON into environment variable
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\firebase-service-account.json' -Raw

# Verify it's set (should show JSON content)
$env:FIREBASE_SERVICE_ACCOUNT
```

### Step 4: Test Firebase Connection

Test that Python can connect to Firestore:

```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\shoe-tracker
python -c "import firebase_admin; from firebase_admin import credentials, firestore; cred = credentials.Certificate('C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\firebase-service-account.json'); firebase_admin.initialize_app(cred); db = firestore.client(); print('✓ Firebase connected successfully!')"
```

If you see `✓ Firebase connected successfully!` - you're all set!

### Step 5: Test Shopify Scraper

Now test the scraper that needs Firebase:

```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\shoe-tracker
python scripts\shopify_scraper.py --limit 5 --pause 0.5
```

Expected output:
```
Scraped 5 products...
Saved to Firestore: sneakers collection
✓ Success!
```

---

## Making it Permanent

The environment variable above only lasts for your current PowerShell session. To make it permanent:

### Option 1: Add to .env File (Recommended)

The setup script already created a `.env` file. Add this line:

```bash
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"live-sneaker-release-tra-df5a4",...}
```

**Note**: Copy the entire JSON content from your `firebase-service-account.json` file and put it on ONE line (remove all newlines).

### Option 2: Add to PowerShell Profile

```powershell
# Open your PowerShell profile
notepad $PROFILE

# Add this line at the end:
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\firebase-service-account.json' -Raw

# Save and close
# Restart PowerShell for changes to take effect
```

### Option 3: Use dotenv Package

Install dotenv to auto-load `.env` files:

```powershell
npm install -g dotenv-cli
dotenv -e .env -- python scripts/shopify_scraper.py
```

---

## Firestore Structure

Once Firebase is working, your data will be stored like this:

```
live-sneaker-release-tra-df5a4 (Firebase Project)
└── Firestore Database
    ├── sneakers (collection)
    │   ├── {doc-id-1}
    │   │   ├── name: "Air Jordan 1 High"
    │   │   ├── price: "$170"
    │   │   ├── store: "a-ma-maniere.com"
    │   │   ├── status: "available"
    │   │   └── scraped_at: "2025-11-18T..."
    │   └── {doc-id-2}
    │       └── ...
    └── sneakers_canonical (collection)
        ├── {sku-1}
        │   ├── name: "Air Jordan 1 High OG"
        │   ├── locations: [{store: "...", price: "..."}, ...]
        │   └── mileage: 0
        └── {sku-2}
            └── ...
```

---

## Viewing Your Data

### Firestore Console
1. Go to: https://console.firebase.google.com/project/live-sneaker-release-tra-df5a4/firestore
2. Click **"Firestore Database"** in the left sidebar
3. You'll see your collections (`sneakers`, `sneakers_canonical`)
4. Click to browse documents

### Using Web App
Once Firebase is set up, the mileage tracker page will work:
```
http://localhost:3002/mileage
```

---

## Troubleshooting

### Error: "FIREBASE_SERVICE_ACCOUNT not set"

**Solution**: Run this in PowerShell:
```powershell
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\firebase-service-account.json' -Raw
```

### Error: "Service account file not found"

**Solution**: Check the file exists:
```powershell
Test-Path 'C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\firebase-service-account.json'
```
Should return `True`. If not, download it again from Firebase Console.

### Error: "Permission denied" or "Insufficient permissions"

**Solution**: 
1. Go to Firebase Console
2. Navigate to **Settings > Service accounts**
3. Verify the service account has **"Firebase Admin SDK"** role
4. Re-generate the key if needed

### Error: "Cannot find module 'firebase-admin'"

**Solution**: Install Python dependencies:
```powershell
cd shoe-tracker
pip install -r requirements.txt
```

### Scraper runs but no data in Firestore

**Solution**: Check Firestore rules:
1. Go to: https://console.firebase.google.com/project/live-sneaker-release-tra-df5a4/firestore/rules
2. Your rules should look like this:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // Dev only - restrict in production!
    }
  }
}
```

---

## Quick Reference

### Service Account File Location
```
C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\firebase-service-account.json
```

### Set Environment Variable (PowerShell)
```powershell
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\firebase-service-account.json' -Raw
```

### Test Connection
```powershell
cd shoe-tracker
python scripts\seed_firestore.py --limit 5
```

### Firebase Console Links
- **Project Dashboard**: https://console.firebase.google.com/project/live-sneaker-release-tra-df5a4
- **Firestore Database**: https://console.firebase.google.com/project/live-sneaker-release-tra-df5a4/firestore
- **Service Accounts**: https://console.firebase.google.com/project/live-sneaker-release-tra-df5a4/settings/serviceaccounts/adminsdk

---

## What Requires Firebase?

**These features need Firebase:**
- ✅ Shopify scraper (36 boutiques)
- ✅ Playwright monitor (12 targets)
- ✅ Mileage tracker page
- ✅ Firebase ingestion/normalization scripts

**These work WITHOUT Firebase:**
- ✅ Raffle scraper → writes to Supabase
- ✅ News aggregator → writes to Supabase
- ✅ Raffles page → reads from Supabase
- ✅ News page → reads from Supabase
- ✅ Next.js web app → uses both Firebase (mileage) and Supabase (raffles/news)

---

## Security Best Practices

⚠️ **IMPORTANT**: The service account JSON contains sensitive credentials!

1. **Never commit to Git**:
   ```powershell
   # Add to .gitignore
   echo "firebase-service-account.json" >> .gitignore
   ```

2. **Restrict Firestore rules in production**:
   ```javascript
   // Allow only authenticated users
   allow read, write: if request.auth != null;
   ```

3. **Use environment variables**:
   - For local dev: `.env` file (git-ignored)
   - For production: Vercel/Docker secrets

4. **Rotate keys if exposed**:
   - Generate new key in Firebase Console
   - Delete old key
   - Update environment variables

---

## Summary

1. Download `firebase-service-account.json` from Firebase Console
2. Save it to project root: `C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\`
3. Set env var: `$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'firebase-service-account.json' -Raw`
4. Test: `python scripts\shopify_scraper.py --limit 5`
5. Make permanent: Add to `.env` or PowerShell profile

**That's it! Firebase is now fully integrated.** 🎉
