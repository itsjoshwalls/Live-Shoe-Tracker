# Multi-Environment Firebase Setup

## Overview
The sneaker tracker now supports **production** and **staging** Firebase environments. Switch between them using the `NEXT_PUBLIC_FIREBASE_ENV` variable.

## Quick Start

### Production (default)
```bash
# .env.local
NEXT_PUBLIC_FIREBASE_ENV=production
# or leave empty - production is default
```

### Staging
```bash
# .env.local
NEXT_PUBLIC_FIREBASE_ENV=staging
```

Then restart dev server:
```powershell
pnpm run dev
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_FIREBASE_ENV` | `production` or `staging` | Optional (defaults to production) |
| `NEXT_PUBLIC_FIREBASE_CONFIG` | Production Firebase config (JSON string) | Yes |
| `NEXT_PUBLIC_FIREBASE_STAGING_CONFIG` | Staging Firebase config (JSON string) | Only if using staging |

## Creating a Staging Project

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name: `sneaker-tracker-staging`
4. Follow wizard (disable Analytics for staging if desired)

### 2. Enable Services
- **Firestore**: Create database in test mode initially
- **Authentication**: Enable Google, Email/Password (match production)
- **Functions**: Will be enabled when you deploy

### 3. Get Web App Config
1. Project Settings → General → Your apps
2. Click "Web" icon to add web app
3. Copy the config object
4. Stringify it (remove newlines/spaces):
   ```javascript
   JSON.stringify({apiKey:"...",authDomain:"...",...})
   ```
5. Paste into `.env.local` as `NEXT_PUBLIC_FIREBASE_STAGING_CONFIG`

### 4. Deploy Firestore Rules
```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker

# Switch to staging project
firebase use --add
# Select your staging project from list
# Give it alias: staging

# Deploy rules
firebase use staging
firebase deploy --only firestore:rules,firestore:indexes

# Switch back to production
firebase use default  # or 'production' if that's your alias
```

### 5. Seed Staging Data (optional)
```powershell
# Set staging service account
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'path\to\staging-service-account.json' -Raw

# Run seed script (if you have one)
python packages/scrapers/python-workers/seed_firestore.py --source sneakers --dest sneakers_canonical
```

## Package.json Scripts

Add convenience scripts to `apps/web-nextjs/package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:staging": "cross-env NEXT_PUBLIC_FIREBASE_ENV=staging next dev",
    "build": "next build",
    "build:staging": "cross-env NEXT_PUBLIC_FIREBASE_ENV=staging next build",
    "start": "next start"
  }
}
```

Install cross-env for Windows compatibility:
```powershell
pnpm add -D cross-env
```

Then use:
```powershell
pnpm run dev:staging   # Dev server with staging Firebase
pnpm run build:staging # Production build using staging data
```

## Vercel Deployment (Multi-Environment)

### Production (main branch)
Environment variables in Vercel dashboard:
- `NEXT_PUBLIC_FIREBASE_ENV` = `production`
- `NEXT_PUBLIC_FIREBASE_CONFIG` = (your prod config JSON)

### Preview/Staging (develop branch)
Create a separate Vercel preview environment:
- `NEXT_PUBLIC_FIREBASE_ENV` = `staging`
- `NEXT_PUBLIC_FIREBASE_STAGING_CONFIG` = (your staging config JSON)

## Troubleshooting

### "Missing Firebase configuration for staging"
- Ensure `NEXT_PUBLIC_FIREBASE_STAGING_CONFIG` is set in `.env.local`
- Verify it's valid JSON (use a JSON validator)

### Data not appearing in staging
- Check Firestore rules allow read/write in staging project
- Verify you're authenticated (staging has separate users from production)
- Seed some test data manually via Firebase Console

### Functions not working in staging
```powershell
firebase use staging
cd packages/firebase-functions
npm run build
firebase deploy --only functions
```

## Security Best Practices

1. **Never commit `.env.local`** - it's in `.gitignore`
2. **Use separate service accounts** for prod and staging
3. **Restrict staging Firestore rules** during testing (test mode is fine)
4. **Regularly delete staging data** to avoid quota issues
5. **Don't expose staging API keys** publicly (though Firebase configs are safe to expose client-side)

## Rollback to Single Environment

If you want to revert to production-only:
1. Remove `NEXT_PUBLIC_FIREBASE_STAGING_CONFIG` from `.env.local`
2. Remove `NEXT_PUBLIC_FIREBASE_ENV` (or set to `production`)
3. The code gracefully falls back to production config

## Next Steps

- [ ] Create staging Firebase project
- [ ] Add staging config to `.env.local`
- [ ] Deploy Firestore rules to staging
- [ ] Test with `pnpm run dev:staging`
- [ ] Set up CI/CD for automatic staging deployments
