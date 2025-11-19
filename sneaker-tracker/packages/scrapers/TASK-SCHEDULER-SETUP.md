# Windows Task Scheduler Setup Instructions

## Quick Setup (Run as Administrator)

1. **Copy this command and run in PowerShell as Administrator:**

```powershell
$Action = New-ScheduledTaskAction -Execute "pwsh.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers\run-hourly.ps1`"" `
    -WorkingDirectory "C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers"

$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration ([TimeSpan]::MaxValue)

$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable

Register-ScheduledTask -TaskName "SneakerTracker-HourlyScrape" `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "Runs sneaker scrapers every hour and imports to Supabase" `
    -User $env:USERNAME
```

2. **Verify it's created:**
```powershell
Get-ScheduledTask -TaskName "SneakerTracker-HourlyScrape"
```

3. **Test run manually:**
```powershell
Start-ScheduledTask -TaskName "SneakerTracker-HourlyScrape"
```

4. **View logs:**
```powershell
Get-ScheduledTaskInfo -TaskName "SneakerTracker-HourlyScrape"
```

5. **Disable/Enable:**
```powershell
Disable-ScheduledTask -TaskName "SneakerTracker-HourlyScrape"
Enable-ScheduledTask -TaskName "SneakerTracker-HourlyScrape"
```

6. **Remove task:**
```powershell
Unregister-ScheduledTask -TaskName "SneakerTracker-HourlyScrape" -Confirm:$false
```

---

## Manual GUI Setup (Alternative)

1. Open **Task Scheduler** (`taskschd.msc`)
2. Click **Create Task** (not "Create Basic Task")
3. **General tab:**
   - Name: `SneakerTracker-HourlyScrape`
   - Description: `Runs sneaker scrapers every hour`
   - Run whether user is logged on or not: ✅
   - Run with highest privileges: ❌ (not needed)

4. **Triggers tab:**
   - Click **New**
   - Begin the task: `On a schedule`
   - Daily, start today at current time
   - Repeat task every: `1 hour`
   - Duration: `Indefinitely`
   - Enabled: ✅

5. **Actions tab:**
   - Click **New**
   - Action: `Start a program`
   - Program: `pwsh.exe`
   - Arguments: `-NoProfile -ExecutionPolicy Bypass -File "C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers\run-hourly.ps1"`
   - Start in: `C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers`

6. **Conditions tab:**
   - Start only if on AC power: ❌ (uncheck)
   - Start only if network available: ✅

7. **Settings tab:**
   - Allow task to run on demand: ✅
   - Run as soon as possible after missed: ✅
   - Stop task if runs longer than: `1 hour`

8. Click **OK** and enter your Windows password if prompted

---

## Environment Variables

The script will automatically load from `.env` if present. Create one with:

```powershell
cd C:\Users\sneak\OneDrive\Desktop\Live-Shoe-Tracker\sneaker-tracker\packages\scrapers

@"
SUPABASE_URL=https://npvqqzuofwojhbdlozgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdnFxenVvZndvamhiZGxvemdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA3OTYxNCwiZXhwIjoyMDc4NjU1NjE0fQ.X-NWR22vzkXbGl5GNBdFYQF47Y2r7B8Tz1J2rgH_kmk
API_BASE_URL=http://localhost:4000/api
"@ | Out-File -FilePath .env -Encoding UTF8
```

---

## Monitoring

Check task history:
```powershell
Get-WinEvent -LogName "Microsoft-Windows-TaskScheduler/Operational" -MaxEvents 50 | 
    Where-Object { $_.Message -like "*SneakerTracker*" } |
    Select-Object TimeCreated, Id, Message
```

View output files:
```powershell
Get-ChildItem output\*.ndjson | 
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 10 Name, Length, LastWriteTime
```

Query Supabase for recent imports:
```powershell
node -e "import('@supabase/supabase-js').then(async ({createClient}) => { 
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); 
    const {data} = await sb.from('releases').select('retailer').order('created_at', {ascending: false}).limit(50); 
    console.log(data.reduce((acc,r) => { acc[r.retailer] = (acc[r.retailer]||0)+1; return acc; }, {})); 
})"
```
