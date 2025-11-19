# Live Sneaker Tracker - Complete Feature Comparison & Gap Analysis

**Date**: November 6, 2025  
**Purpose**: Ensure feature parity across all apps and identify implementation gaps

---

## 🎯 Executive Summary

We have **three frontend applications** with varying feature sets:

1. **`shoe-tracker/`** - Firebase + Vite prototype (most complete UI features)
2. **`sneaker-tracker/apps/web-nextjs`** - Next.js + Supabase (minimal UI, missing key features)
3. **`sneaker-tracker/apps/desktop-electron`** - Electron desktop (basic shell only)

**Backend**: Firebase Cloud Functions (17 deployed) + Express API + Supabase DB

---

## ✅ Complete Feature Matrix

| Feature | shoe-tracker (Vite) | web-nextjs | desktop-electron | Backend Support | Priority |
|---------|---------------------|------------|------------------|-----------------|----------|
| **User Authentication** |
| Google Sign-in | ✅ Firebase Auth | ❌ Missing | ❌ Missing | ✅ Firebase Auth | 🔴 **CRITICAL** |
| Sign out | ✅ | ❌ | ❌ | ✅ | 🔴 **CRITICAL** |
| Admin role check | ✅ Custom claims | ❌ | ❌ | ✅ | 🟡 Medium |
| User session persistence | ✅ | ❌ | ❌ | ✅ | 🔴 **CRITICAL** |
| **Release Listings** |
| View all releases | ✅ Real-time | ✅ Static fetch | ❌ | ✅ Firestore + Supabase | 🔴 **CRITICAL** |
| Real-time updates | ✅ onSnapshot | ❌ | ❌ | ✅ Firestore triggers | 🔴 **CRITICAL** |
| Filter by status | ❌ | ❌ | ❌ | ✅ Backend ready | 🟡 Medium |
| Filter by brand | ❌ | ❌ | ❌ | ✅ Backend ready | 🟡 Medium |
| Search releases | ❌ | ❌ | ❌ | ✅ Backend ready | 🟡 Medium |
| **User Actions** |
| Increment mileage | ✅ | ❌ | ❌ | ✅ Firestore | 🟢 Low (prototype feature) |
| Edit mileage | ✅ Admin only | ❌ | ❌ | ✅ | 🟢 Low |
| Delete release | ✅ Admin only | ❌ | ❌ | ✅ | 🟡 Medium |
| **Alert Subscriptions** |
| Subscribe to alerts | ❌ | ❌ | ❌ | ✅ `subscribeAlert` callable | 🔴 **CRITICAL** |
| Unsubscribe | ❌ | ❌ | ❌ | ✅ `unsubscribeAlert` callable | 🔴 **CRITICAL** |
| View my alerts | ❌ | ❌ | ❌ | ✅ `getMyAlerts` callable | 🔴 **CRITICAL** |
| Receive Discord alerts | N/A | N/A | N/A | ✅ `onReleaseTriggerUserAlerts` | ✅ Backend only |
| Receive Slack alerts | N/A | N/A | N/A | ✅ | ✅ Backend only |
| **Admin Features** |
| Retailer management | ❌ | ✅ View/Delete | ❌ | ✅ Supabase | 🟡 Medium |
| Manual release ingest | ❌ | ❌ | ❌ | ✅ `onReleaseIngest` callable | 🟡 Medium |
| View scraper queue | ❌ | ❌ | ❌ | ✅ Firestore `queues` | 🟢 Low |
| Trigger scraper job | ❌ | ❌ | ❌ | ✅ `addScraperJob` callable | 🟢 Low |
| **Analytics & Metrics** |
| View metrics dashboard | ❌ | ❌ | ❌ | ✅ `/metrics` endpoint | 🟡 Medium |
| BigQuery analytics | N/A | N/A | N/A | ✅ Pub/Sub → BigQuery | ✅ Backend only |
| Release status change events | N/A | N/A | N/A | ✅ | ✅ Backend only |
| Queue job events | N/A | N/A | N/A | ✅ | ✅ Backend only |
| **Data Display** |
| Product name | ✅ | ✅ | ❌ | ✅ | ✅ |
| Release date | ❌ | ✅ | ❌ | ✅ | 🔴 **CRITICAL** |
| Retail price | ❌ | ✅ | ❌ | ✅ | 🔴 **CRITICAL** |
| Status badge | ✅ | ❌ | ❌ | ✅ | 🔴 **CRITICAL** |
| Store/retailer name | ❌ | ✅ | ❌ | ✅ | 🔴 **CRITICAL** |
| Brand | ✅ | ❌ | ❌ | ✅ | 🔴 **CRITICAL** |
| SKU | ✅ | ❌ | ❌ | ✅ | 🟡 Medium |
| Locations/stores | ✅ | ❌ | ❌ | ✅ | 🟡 Medium |
| **UI/UX** |
| Responsive design | ✅ | ✅ | ❌ | N/A | 🔴 **CRITICAL** |
| Header navigation | ✅ | ✅ | ❌ | N/A | 🔴 **CRITICAL** |
| Loading states | ✅ | ✅ | ❌ | N/A | 🔴 **CRITICAL** |
| Error handling | ⚠️ Basic | ⚠️ Basic | ❌ | N/A | 🟡 Medium |
| Empty state messages | ✅ | ❌ | ❌ | N/A | 🟡 Medium |

---

## 🔴 **CRITICAL Missing Features** (Must Implement)

### In Next.js Web App (`apps/web-nextjs`)

1. **User Authentication System** 🚨 HIGHEST PRIORITY
   - Firebase Auth integration (Google sign-in)
   - Session persistence
   - Protected routes (admin pages require auth)
   - User profile display in header

2. **Real-time Release Updates**
   - Replace static fetch with Firestore `onSnapshot` or Supabase real-time subscriptions
   - Auto-refresh when releases change
   - Live status badge updates

3. **Alert Subscription UI**
   - Subscribe to brand/product alerts
   - Manage user alert preferences
   - View active subscriptions

4. **Enhanced Release Display**
   - Status badges (LIVE, UPCOMING, SOLD OUT, etc.)
   - Brand display
   - Release date formatting
   - SKU display
   - Multiple store locations

### In Electron Desktop App (`apps/desktop-electron`)

1. **Complete UI Port**
   - Port entire Next.js UI to Electron renderer
   - Offline-capable local data cache
   - Native notifications for status changes

---

## 🟡 Medium Priority Features

1. **Search & Filters**
   - Filter by status, brand, retailer
   - Text search across product names
   - Date range filters

2. **Admin Dashboard**
   - Manual release ingest form
   - Scraper job queue management
   - Metrics dashboard

3. **Enhanced Retailer Management**
   - Add new retailers (currently only delete exists)
   - Edit retailer metadata
   - Tier management

---

## 🟢 Low Priority (Nice-to-Have)

1. **Mileage Tracking** (prototype-specific feature)
2. **Advanced Analytics UI** (BigQuery data is backend-only for now)
3. **Scraper Queue UI** (admin-only, CLI tools exist)

---

## 🏗️ Implementation Plan

### Phase 1: Authentication & Real-time (Next.js) - **2-3 hours**
```typescript
// apps/web-nextjs/lib/firebaseClient.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || '{}');
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
```

```tsx
// apps/web-nextjs/components/AuthProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../lib/firebaseClient';
import { onAuthStateChanged, User } from 'firebase/auth';

const AuthContext = createContext<{ user: User | null }>({ user: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);
  
  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
```

### Phase 2: Alert Subscription UI - **1-2 hours**
```tsx
// apps/web-nextjs/pages/alerts.tsx
import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../components/AuthProvider';

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const functions = getFunctions();
  
  const subscribe = async (alertData) => {
    const fn = httpsCallable(functions, 'subscribeAlert');
    await fn({ alertData });
    // Refresh list
  };
  
  // ... UI for managing alerts
}
```

### Phase 3: Enhanced Dashboard - **2-3 hours**
- Real-time Firestore subscriptions
- Status badges with color coding
- Filter/search UI
- Complete data display (brand, SKU, locations)

### Phase 4: Electron App - **3-4 hours**
- Port Next.js pages to Electron renderer
- Implement IPC for backend communication
- Add native notifications
- Offline data caching

---

## 📋 Backend Feature Checklist (Already Implemented ✅)

- ✅ Firebase Cloud Functions (17 deployed)
  - ✅ `onReleaseIngest` - Zod-validated ingest with Nike/Jordan sku rule
  - ✅ `subscribeAlert`, `unsubscribeAlert`, `getMyAlerts` - User alert management
  - ✅ `addScraperJob`, `getNextJob`, `markJobComplete` - Queue management
  - ✅ `onQueueJobCreated` - Auto-fetch scraper trigger
  - ✅ `onReleaseCreated`, `onReleaseUpdated` - Stats + productId backfill
  - ✅ `onReleaseTriggerUserAlerts` - Discord/Slack notifications
  - ✅ `onReleaseStatusChange` - Firestore trigger for status changes
  - ✅ `onAnalyticsEvent` - Pub/Sub → BigQuery sink
  - ✅ `scheduledFinalizeDailyStats` - Midnight UTC job
  - ✅ `health`, `metrics`, `metricsEndpoint` - Monitoring

- ✅ Express API (TypeScript, localhost:4000)
  - ✅ Helmet + CORS + rate limiting + compression
  - ✅ Zod validation on routes
  - ✅ Prometheus metrics export
  - ✅ Redis cache stubs (optional)

- ✅ Supabase Database
  - ✅ Migrations for `shoe_releases`, `retailers`
  - ✅ Real-time subscriptions ready

- ✅ Analytics Pipeline
  - ✅ Pub/Sub topic (`sneaker-analytics-events`)
  - ✅ BigQuery dataset (`sneaker_analytics`)
  - ✅ Tables: `release_events`, `queue_events`
  - ✅ Event publisher + sink function

- ✅ Scrapers
  - ✅ Shopify scraper (shoe-tracker/scripts/)
  - ✅ Playwright monitor (targets.json)
  - ✅ Ingestion worker (ingest.py)
  - ✅ Orchestration worker

---

## 🎯 Next Steps (Immediate Action Items)

### Step 1: Get Firebase Web Config & Run Zod Test
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select `live-sneaker-release-tracker` project
3. Click ⚙️ (Project settings) → General
4. Scroll to "Your apps" → Select your web app (or add one)
5. Copy the `firebaseConfig` object
6. Save as `firebase-web-config.json`:
   ```json
   {
     "apiKey": "AIza...",
     "authDomain": "live-sneaker-release-tracker.firebaseapp.com",
     "projectId": "live-sneaker-release-tracker",
     "storageBucket": "live-sneaker-release-tracker.appspot.com",
     "messagingSenderId": "...",
     "appId": "..."
   }
   ```
7. Run test:
   ```powershell
   $env:FIREBASE_CLIENT_CONFIG_PATH = "C:\path\to\firebase-web-config.json"
   pnpm -C "...\packages\firebase-functions" run test:int:ingest-zod
   ```

### Step 2: Verify BigQuery Analytics
```powershell
# Flip a release status to trigger release_status_change event
pnpm -C "...\packages\firebase-functions" run set-status
# Check logs + BigQuery console for new rows
```

### Step 3: Port Critical Features to Next.js
1. Add Firebase Auth (AuthProvider + login UI)
2. Replace dashboard static fetch with real-time Firestore
3. Add alert subscription page
4. Enhance release cards with all data fields

### Step 4: Build Electron App
1. Create renderer pages using Next.js components
2. Set up IPC handlers
3. Add offline storage with IndexedDB
4. Implement native notifications

---

## 📊 Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTENDS                             │
├─────────────────────────────────────────────────────────────┤
│  shoe-tracker (Vite)          ✅ Most complete UI           │
│  ├─ Firebase Auth             ✅ Google sign-in             │
│  ├─ Real-time updates         ✅ onSnapshot                 │
│  └─ Admin actions             ✅ Mileage tracking           │
│                                                              │
│  web-nextjs (Next.js)         ⚠️  Basic UI only             │
│  ├─ Firebase Auth             ❌ MISSING                    │
│  ├─ Real-time updates         ❌ Static fetch only          │
│  ├─ Alert subscriptions       ❌ MISSING                    │
│  └─ Enhanced displays         ❌ Minimal fields             │
│                                                              │
│  desktop-electron             ❌ Shell only                 │
│  └─ All features              ❌ Not implemented            │
└─────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND (All ✅)                        │
├─────────────────────────────────────────────────────────────┤
│  Firebase Functions (17)      ✅ Deployed to us-central1    │
│  ├─ Callable endpoints         ✅ onReleaseIngest + alerts  │
│  ├─ Firestore triggers         ✅ Stats + backfill          │
│  ├─ Scheduled jobs             ✅ Daily stats finalization  │
│  └─ Analytics sink             ✅ Pub/Sub → BigQuery        │
│                                                              │
│  Express API (TypeScript)      ✅ Running on :4000          │
│  ├─ Hardening                  ✅ Helmet/CORS/rate limit    │
│  ├─ Validation                 ✅ Zod schemas               │
│  └─ Metrics                    ✅ Prometheus export         │
│                                                              │
│  Scrapers                      ✅ Shopify + Playwright      │
│  └─ Workers                    ✅ Ingest + orchestration    │
└─────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER (All ✅)                     │
├─────────────────────────────────────────────────────────────┤
│  Firestore                     ✅ releases, retailers, etc. │
│  Supabase                      ✅ shoe_releases, retailers  │
│  BigQuery                      ✅ sneaker_analytics         │
│  └─ Tables                     ✅ release_events, queue_ev  │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Success Criteria

### Minimum Viable Product (MVP)
- ✅ Backend functions deployed
- ✅ Scrapers operational
- ✅ Analytics pipeline working
- ❌ **Next.js has auth + real-time + alerts** ← BLOCKING
- ❌ Electron app functional

### Full Feature Parity
- All features from `shoe-tracker` prototype ported to monorepo
- Electron desktop app mirrors web functionality
- Admin dashboard complete
- Search/filter UI implemented

---

## 📝 Notes

- **shoe-tracker** is the prototype with the most complete feature set
- **web-nextjs** is the production target but missing critical features
- **Backend is complete** - all necessary Cloud Functions and APIs deployed
- **Gap is purely frontend** - need to port UI features from prototype to monorepo

**Last Updated**: November 6, 2025  
**Status**: Backend ✅ Complete | Frontend ⚠️ In Progress
