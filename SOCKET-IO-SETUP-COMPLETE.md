# Socket.IO Real-Time Updates - Setup Complete! ✅

## What's Working

### Backend (API Server)
✅ Socket.IO server integrated into Express app
✅ Running on `http://localhost:4000`
✅ Real-time WebSocket connections enabled
✅ Exports `io` for use in other modules (routes can emit events)

### Frontend (Next.js)
✅ Socket.IO client installed
✅ Live-releases page updated with real-time connection
✅ Running on `http://localhost:3002`
✅ Displays beautiful cards with image support
✅ Shows placeholder when images are empty
✅ Real-time connection status indicator

## How It Works

1. **Page Load**: Frontend fetches initial data via REST API (`/api/releases`)
2. **Socket Connection**: Establishes WebSocket connection to backend
3. **Real-Time Updates**: Backend can emit events like:
   - `releases:updated` - Full dataset refresh
   - `release:new` - Single new release added
4. **Frontend Receives**: Automatically updates UI without page reload

## What You See Now

Since all 165 releases have **empty `images: []` arrays**, you'll see:
- Beautiful grid of sneaker cards
- 👟 Placeholder images with "No image available"
- All release data (name, SKU, price, status, date, etc.)
- Live connection status: "🟢 Live" when Socket.IO connected

## Next Steps to Populate Images

### 1. Get Supabase Service Role Key
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/npvqqzuofwojhbdlozgh/settings/api)
2. Copy the **service_role key** (secret, don't commit to git)

### 2. Set Environment Variables
```powershell
$env:SUPABASE_URL = "https://npvqqzuofwojhbdlozgh.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...." # Your actual key
```

### 3. Run the Image Scraper
```powershell
cd shoe-tracker
python scripts/supabase_image_scraper.py
```

This will:
- Scrape Shopify stores from `scripts/shopify_stores.json`
- Extract product images
- Update Supabase `releases` table with image URLs
- Images will appear on the live page **in real-time** (if we add emit events to the scraper)

## URLs

- **Frontend**: http://localhost:3002/live-releases
- **API**: http://localhost:4000/api/releases
- **Health Check**: http://localhost:4000/api/health

## Socket.IO Events (Available)

Backend can emit these events (add to scrapers/routes as needed):

```typescript
// In any route file (after importing { io } from '../server')
io.emit('releases:updated', updatedReleases); // Broadcast full update
io.emit('release:new', newRelease); // Broadcast new item
```

Frontend listens for:
- `releases:updated` - Replaces entire release list
- `release:new` - Prepends new release to list

## Architecture Summary

```
┌─────────────────┐         WebSocket          ┌─────────────────┐
│   Next.js Web   │◄──────────────────────────►│  Express API    │
│   (Port 3002)   │                             │  (Port 4000)    │
│                 │         REST API            │   + Socket.IO   │
│  Socket.IO      │◄────────────────────────────┤                 │
│  Client         │                             │   Supabase      │
└─────────────────┘                             └────────┬────────┘
                                                         │
                                                         ▼
                                                  ┌─────────────┐
                                                  │  PostgreSQL │
                                                  │  (Supabase) │
                                                  │ 165 releases│
                                                  └─────────────┘
```

## Differences from Old Firebase Setup

**Before** (Firebase):
- Polling every 10 seconds
- Firebase imports required
- Timestamp conversion needed
- Old field names (title, release_date, image_url, source, scraped_at)

**Now** (Supabase + Socket.IO):
- Real-time Socket.IO push updates
- No Firebase dependency
- Standard date strings
- New field names (name, date, images array, created_at, updated_at)
- Images support multiple URLs (array)
- Cleaner architecture

## Troubleshooting

### Socket.IO not connecting?
- Check `NEXT_PUBLIC_API_URL` matches API server URL
- Verify both servers running
- Check browser console for errors

### Images still empty?
- Run the scraper (see steps above)
- Check Supabase `releases.images` column
- Verify scraper has `SUPABASE_SERVICE_ROLE_KEY`

### Changes not appearing?
- Check browser console for Socket.IO events
- Verify backend emits events when data changes
- Hard refresh page (Ctrl+Shift+R)
