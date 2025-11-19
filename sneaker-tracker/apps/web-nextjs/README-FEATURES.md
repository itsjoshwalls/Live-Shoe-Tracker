# Live Sneaker Tracker - Next.js Web App

Real-time sneaker release tracking with Firebase authentication, live updates, and alert subscriptions.

## 🚀 Features Implemented

### ✅ Authentication
- Google Sign-in with Firebase Auth
- User session persistence
- Admin role detection (via custom claims)
- Protected routes and conditional UI

### ✅ Real-time Dashboard
- Live Firestore subscriptions (`onSnapshot`)
- Auto-updating release cards
- Status badges with color coding (LIVE, UPCOMING, SOLD OUT, RAFFLE OPEN)
- Comprehensive data display:
  - Product name, brand, SKU
  - Retailer name
  - Price and release date
  - Available locations
  - Real-time status updates

### ✅ Alert Subscription System
- Subscribe to brand/product alerts
- Manage active subscriptions
- Unsubscribe from alerts
- Firebase callable functions integration
- Keywords-based alert matching

### ✅ Analytics Dashboard
- **Overview Metrics:**
  - Total retailers, releases, users, alerts
  - Active releases count
  - Last update timestamp
  
- **Release Analytics:**
  - Releases by status (bar charts)
  - Releases by brand (top 10)
  - Active vs closed releases
  
- **Retailer Insights:**
  - Retailer table (name, region, release count, active count)
  - Top retailers by release count
  - Most active retailers

- **Admin Features:**
  - Full user analytics (admin only)
  - All alerts visibility (admin only)

## 🔧 Setup

### 1. Install Dependencies
```bash
cd apps/web-nextjs
pnpm install
```

### 2. Configure Firebase
1. Go to [Firebase Console](https://console.firebase.google.com/project/live-sneaker-release-tracker/settings/general)
2. Navigate to **Project Settings → General**
3. Scroll to **Your apps** section
4. Click your web app (or add one if none exists)
5. Copy the `firebaseConfig` object

### 3. Set Environment Variables
```bash
# Copy the example file
cp .env.local.example .env.local

# Edit .env.local and add your Firebase config
# IMPORTANT: Must be a stringified JSON object
NEXT_PUBLIC_FIREBASE_CONFIG='{"apiKey":"AIza...","authDomain":"...","projectId":"live-sneaker-release-tracker",...}'
```

**Example `.env.local`:**
```env
NEXT_PUBLIC_FIREBASE_CONFIG={"apiKey":"AIzaSyC...","authDomain":"live-sneaker-release-tracker.firebaseapp.com","projectId":"live-sneaker-release-tracker","storageBucket":"live-sneaker-release-tracker.appspot.com","messagingSenderId":"502208285918","appId":"1:502208285918:web:abc123"}
```

### 4. Run Development Server
```bash
pnpm run dev
```

App will be available at [http://localhost:3000](http://localhost:3000)

### 5. Build for Production
```bash
pnpm run build
pnpm start
```

## 📁 File Structure

```
apps/web-nextjs/
├── components/
│   ├── AuthProvider.tsx       # Firebase auth context & hooks
│   └── Header.tsx              # Navigation with auth UI
├── lib/
│   ├── firebaseClient.ts       # Firebase SDK initialization
│   └── supabaseClient.ts       # Supabase client (legacy)
├── pages/
│   ├── _app.tsx                # App wrapper with AuthProvider
│   ├── index.tsx               # Home page
│   ├── dashboard.tsx           # Real-time releases dashboard
│   ├── alerts.tsx              # Alert subscription management
│   ├── analytics.tsx           # Analytics dashboard
│   └── admin.tsx               # Admin panel (retailer mgmt)
└── styles/
    └── globals.css             # Global styles
```

## 🔐 Authentication Flow

1. User clicks "Sign in with Google" in Header
2. `AuthProvider` handles Firebase `signInWithPopup`
3. `onAuthStateChanged` listener updates user state
4. Custom claim `admin` is checked via `getIdTokenResult`
5. UI conditionally renders based on `user` and `isAdmin`

## 🔥 Firebase Integration

### Firestore Collections Used
- `releases` - Sneaker release documents (real-time subscriptions)
- `retailers` - Retailer metadata
- `user_alerts` - User alert subscriptions
- `users` - User profiles (admin view only)

### Firebase Functions Called
- `subscribeAlert` - Subscribe to alert
- `unsubscribeAlert` - Unsubscribe from alert
- `getMyAlerts` - Get user's active alerts

### Real-time Updates
Dashboard uses Firestore `onSnapshot` for live updates:
```typescript
onSnapshot(query(releasesRef, orderBy('productName')), (snapshot) => {
  // Updates state automatically when data changes
});
```

## 📊 Analytics Dashboard

### Data Sources
- **Firestore Collections:**
  - `releases` - Release data
  - `retailers` - Retailer metadata
  - `user_alerts` - Alert subscriptions
  - `users` - User data (admin only)

### Metrics Calculated
1. **Overview:**
   - Total retailers, releases, active releases
   - Total users (admin only)
   - Total alerts (user's own or all if admin)

2. **Releases Analytics:**
   - Group by status (LIVE, UPCOMING, SOLD OUT, etc.)
   - Group by brand
   - Group by retailer

3. **Retailer Insights:**
   - Releases per retailer
   - Active releases per retailer
   - Region distribution

### Future: BigQuery Integration

For advanced analytics (time-series trends, user growth, raffle duration), you can:

1. **Export Firestore to BigQuery:**
   - Enable [Firestore BigQuery Export](https://firebase.google.com/docs/firestore/extend-with-bigquery)
   - Collections exported: `releases`, `retailers`, `users`, `user_alerts`
   - Tables created in `live-sneaker-release-tracker.firestore_exports.*`

2. **Use Looker Studio for Dashboards:**
   - Import pre-built dashboard JSON
   - Connect to BigQuery data source
   - Get:
     - Raffles by retailer (bar chart)
     - Active vs closed raffles (pie chart)
     - New users over time (line chart)
     - Retailers by country (map)

3. **Query Examples:**
   ```sql
   -- Active raffles by retailer
   SELECT 
     retailerId,
     COUNT(*) as raffle_count
   FROM `live-sneaker-release-tracker.firestore_exports.releases_raw_latest`
   WHERE status IN ('LIVE', 'RAFFLE OPEN')
   GROUP BY retailerId
   ORDER BY raffle_count DESC;
   ```

## 🎨 Styling

- Uses Next.js CSS Modules + styled-jsx for scoped styles
- Inline styles used for rapid prototyping (can be refactored to CSS modules)
- Color palette:
  - LIVE: `#10b981` (green)
  - UPCOMING: `#3b82f6` (blue)
  - SOLD OUT: `#ef4444` (red)
  - RAFFLE: `#f59e0b` (amber)

## 🔒 Protected Routes

Pages requiring authentication:
- `/alerts` - Alert management (requires sign-in)
- `/analytics` - Analytics dashboard (requires sign-in, enhanced for admin)
- `/admin` - Admin panel (requires admin claim)

## 🐛 Troubleshooting

### "Missing Firebase configuration" Error
- Check that `NEXT_PUBLIC_FIREBASE_CONFIG` is set in `.env.local`
- Ensure it's a valid JSON string (use quotes around the entire object)
- Restart dev server after changing env vars

### "Error fetching releases"
- Verify Firestore rules allow read access
- Check that `releases` collection exists in Firestore
- Ensure Firebase project ID matches your deployed project

### "Sign-in popup blocked"
- Allow popups for `localhost:3000` in browser settings
- Or use redirect-based auth instead of popup

### Real-time updates not working
- Verify Firestore is initialized correctly
- Check browser console for errors
- Ensure `onSnapshot` listener is not being unsubscribed prematurely

## 📦 Dependencies

Key packages:
- `firebase` - Firebase client SDK (Auth, Firestore, Functions)
- `next` - Next.js framework
- `react` - React library
- `@supabase/supabase-js` - Supabase client (legacy, can be removed)

## 🚢 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variable:
   ```
   NEXT_PUBLIC_FIREBASE_CONFIG={"apiKey":"..."}
   ```
4. Deploy

### Manual Build
```bash
pnpm run build
pnpm start
```

## 🔜 Roadmap

- [ ] Move inline styles to CSS modules
- [ ] Add search/filter UI for releases
- [ ] Implement BigQuery analytics integration
- [ ] Add Looker Studio dashboard templates
- [ ] Desktop notifications for alerts
- [ ] Email alert delivery
- [ ] Admin release management UI
- [ ] Scraper job queue UI

## 📄 License

Copyright © 2025

---

**Status:** ✅ **Production Ready**  
**Last Updated:** November 6, 2025
