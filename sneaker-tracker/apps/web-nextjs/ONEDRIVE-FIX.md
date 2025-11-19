# 🔧 ONEDRIVE SYMLINK FIX - Next.js EINVAL Error

## Problem Diagnosed
```
Error: EINVAL: invalid argument, readlink
path: '.next\server\interception-route-rewrite-manifest.js'
```

**Root Cause**: OneDrive interferes with Next.js symlinks in the `.next` build cache.

---

## ✅ SOLUTION: 3-Step Fix

### Step 1: Clean Corrupt Cache
```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\web-nextjs
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
```

### Step 2: Exclude .next from OneDrive (Optional)
```powershell
# Mark .next folder to skip OneDrive sync
attrib +U .next /S /D
```

### Step 3: Start Next.js
```powershell
# From apps/web-nextjs directory
npx next dev -p 3002
```

---

## 🚀 ONE-LINE FIX (Copy & Paste)

```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\apps\web-nextjs; Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue; npx next dev -p 3002
```

---

## 🔍 Verification

Once running, test in a **new** PowerShell window:

```powershell
# Test API route
Invoke-RestMethod "http://localhost:3002/api/releases?limit=3"

# Test in browser
Start-Process "http://localhost:3002"
Start-Process "http://localhost:3002/unified-dashboard"
```

---

## ⚠️ Long-Term Fix Options

### Option A: Move Project Out of OneDrive (Recommended)
```powershell
# Move to local C: drive
Move-Item C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker C:\Dev\Live-Shoe-Tracker
cd C:\Dev\Live-Shoe-Tracker\sneaker-tracker\apps\web-nextjs
```

### Option B: Configure OneDrive to Exclude .next
1. Right-click OneDrive icon in system tray
2. Settings → Sync and backup → Manage backup
3. Add `.next` to exclusion list

### Option C: Use next.config.js to change output directory
Add to `next.config.js`:
```javascript
module.exports = {
  distDir: 'C:\\Temp\\next-build', // Outside OneDrive
}
```

---

## 🐛 If Still Failing

### Check 1: OneDrive Status
```powershell
# See if OneDrive is syncing
Get-Process OneDrive -ErrorAction SilentlyContinue
```

### Check 2: File Locks
```powershell
# Find processes locking .next
Get-ChildItem .next -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Attributes -match 'ReparsePoint' }
```

### Check 3: Clean npm cache
```powershell
npx next info
npm cache clean --force
Remove-Item node_modules\.cache -Recurse -Force -ErrorAction SilentlyContinue
```

---

## 📋 VERIFY-STACK.ps1 Location Issue

**Error**: `.\VERIFY-STACK.ps1` not found  
**Reason**: Script is in parent directory

**Fix**:
```powershell
# From apps/web-nextjs
..\..\..\VERIFY-STACK.ps1

# Or from sneaker-tracker root
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker
.\VERIFY-STACK.ps1
```

---

## ✅ Expected Success Output

```
  ▲ Next.js 14.2.33
  - Local:        http://localhost:3002
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 3.5s
```

Then navigate to:
- **Homepage**: http://localhost:3002
- **Dashboard**: http://localhost:3002/unified-dashboard
- **API Test**: http://localhost:3002/api/releases?limit=5

---

**Status**: OneDrive + Next.js symlinks = known incompatibility  
**Workaround**: Clear cache before each start (or move project)
