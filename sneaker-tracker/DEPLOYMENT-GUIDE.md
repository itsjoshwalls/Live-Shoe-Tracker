# Production Deployment Guide

## Quick Start (Windows Production Server)

### Option 1: PM2 Process Manager (Recommended)

```powershell
# Install PM2 globally
npm install -g pm2

# Start API Server
cd C:\path\to\sneaker-tracker\apps\api-server
$env:SUPABASE_URL="https://zaarnclwuiwxxtecrvvs.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
$env:PORT="4000"
$env:NODE_ENV="production"

npm run build
pm2 start dist/server.js --name sneaker-api --env production

# Verify
pm2 status
pm2 logs sneaker-api
curl http://localhost:4000/api/health

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Option 2: Windows Task Scheduler (Scraper Automation)

**Daily Scrape (2:00 AM)**

1. Open Task Scheduler → Create Task
2. **General**: "Sneaker Scraper - Daily Run"
3. **Triggers**: Daily at 2:00 AM
4. **Actions**:
   - Program: `powershell.exe`
   - Arguments:
     ```
     -NoProfile -ExecutionPolicy Bypass -File "C:\path\to\run-scraper.ps1"
     ```
5. **Settings**: ✅ Run whether user is logged on or not

**run-scraper.ps1**:
```powershell
$ErrorActionPreference = "Stop"
Set-Location "C:\path\to\sneaker-tracker"

$env:API_BASE_URL = "http://localhost:4000"
$env:FIREBASE_SERVICE_ACCOUNT = Get-Content 'C:\path\to\service-account.json' -Raw

pnpm --filter @sneaker-tracker/scrapers run start

# Optional: import any NDJSON failures
if (Test-Path "packages\scrapers\output\*.ndjson") {
    pnpm --filter @sneaker-tracker/scrapers run import:ndjson -- dir=output
}

# Finalize stats
pnpm --filter @sneaker-tracker/scrapers run stats:finalize:utc

# Cleanup old NDJSON files (keep last 7 days)
Get-ChildItem packages\scrapers\output -Filter *.ndjson | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | 
    Remove-Item -Force

# Log result
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path "logs\scraper-cron.log" -Value "$timestamp - Scraper run completed"
```

**Daily Stats Finalization (12:10 AM UTC)**

- Same setup, different schedule
- Script: `pnpm --filter @sneaker-tracker/scrapers run stats:finalize:utc`

---

## Option 3: Docker Compose (Linux/Cloud)

**docker-compose.yml** (in `sneaker-tracker/`):

```yaml
version: '3.8'

services:
  api:
    build: ./apps/api-server
    ports:
      - "4000:4000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - REDIS_URL=redis://redis:6379
      - PORT=4000
      - NODE_ENV=production
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

  scrapers:
    build: ./packages/scrapers
    environment:
      - API_BASE_URL=http://api:4000
      - FIREBASE_SERVICE_ACCOUNT=${FIREBASE_SERVICE_ACCOUNT}
    depends_on:
      - api
    command: ["pnpm", "run", "start"]
    profiles: ["scraper"]  # Only run manually: docker-compose --profile scraper up scrapers

volumes:
  redis-data:
```

**Start**:
```bash
docker-compose up -d api redis
docker-compose --profile scraper run scrapers  # Manual scrape
```

---

## Environment Variables (Production)

### API Server
```bash
SUPABASE_URL=https://zaarnclwuiwxxtecrvvs.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc...  # KEEP SECRET!
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
REDIS_URL=redis://localhost:6379
```

### Scrapers
```bash
API_BASE_URL=http://localhost:4000
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}  # Full JSON
```

**Security Notes**:
- Never commit service account keys or service role keys to git
- Use environment variable injection in CI/CD
- Rotate keys quarterly
- Use Supabase RLS policies for additional security

---

## Monitoring

### Health Checks

```bash
# API Server
curl http://localhost:4000/api/health

# Prometheus Metrics
curl http://localhost:4000/api/metrics
```

### Logs

**PM2**:
```bash
pm2 logs sneaker-api --lines 100
pm2 logs sneaker-api --err  # Errors only
```

**Docker**:
```bash
docker-compose logs -f api
docker-compose logs -f --tail=100 api
```

**Windows Event Log** (Task Scheduler):
- Event Viewer → Task Scheduler → History

### Prometheus + Grafana (Optional)

**prometheus.yml**:
```yaml
scrape_configs:
  - job_name: 'sneaker-api'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:4000']
    metrics_path: '/api/metrics'
```

**Start**:
```bash
docker run -d -p 9090:9090 -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus
docker run -d -p 3001:3000 grafana/grafana
```

**Dashboards**: Import Grafana dashboard for Express.js metrics.

---

## Scaling

### Horizontal Scaling (Multiple API Instances)

1. **Load Balancer**: nginx/HAProxy in front of multiple API servers
2. **Shared Redis**: All instances connect to same Redis cluster
3. **Database**: Supabase handles connection pooling

**nginx.conf**:
```nginx
upstream sneaker_api {
    least_conn;
    server localhost:4000;
    server localhost:4001;
    server localhost:4002;
}

server {
    listen 80;
    location /api {
        proxy_pass http://sneaker_api;
    }
}
```

### Distributed Scraping

- Split stores across multiple cron jobs/containers
- Use message queue (RabbitMQ/Redis Queue) for job distribution
- Centralize NDJSON output to shared storage → single importer

---

## Backup & Recovery

### Database

```bash
# Supabase: Use built-in daily backups (Settings → Database → Backups)
# Manual snapshot: pg_dump via Supabase CLI
```

### NDJSON Archives

```powershell
# Compress and archive monthly
$month = (Get-Date).AddMonths(-1).ToString("yyyy-MM")
Compress-Archive -Path "packages\scrapers\output\*.ndjson" -DestinationPath "archives\scrapers-$month.zip"
```

### Configuration

- Version control `.env.example` templates (NOT real secrets)
- Store actual secrets in password manager (1Password/Vault)
- Document secret rotation procedures

---

## Troubleshooting

### API Server Won't Start

```powershell
# Check port availability
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue

# Check Supabase connectivity
curl https://zaarnclwuiwxxtecrvvs.supabase.co/rest/v1/

# Check logs
pm2 logs sneaker-api --err --lines 50
```

### Scrapers Failing

```powershell
# Test single store manually
cd packages\scrapers
pnpm run start kith

# Check NDJSON output
Get-ChildItem output -Filter *.ndjson | Sort-Object LastWriteTime -Descending | Select-Object -First 5
Get-Content output\kith-*.ndjson | Select-Object -First 1 | ConvertFrom-Json
```

### Database Connection Issues

```bash
# Test Supabase connection
node -e "const {createClient} = require('@supabase/supabase-js'); const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); s.from('releases').select('count').then(r => console.log(r))"
```

### Redis Connection Issues

- Non-critical: API runs without cache
- Fix: Start Redis → `redis-server` (Linux) or `wsl redis-server` (Windows)

---

## Performance Tuning

### API Server

```typescript
// Increase rate limits for production traffic
max: process.env.NODE_ENV === 'production' ? 500 : 1000  // 500 req/15min
```

### Scrapers

```javascript
// config.js - Increase concurrency
const limit = pLimit(5);  // Up to 5 concurrent stores
```

### Database

- Add indexes on frequently queried fields (`sku`, `status`, `brand`)
- Use Supabase caching for read-heavy queries
- Consider materialized views for complex aggregations

---

## Cost Optimization

### Supabase

- **Free Tier**: 500MB DB, 2GB bandwidth/month
- **Pro**: $25/month (8GB DB, 50GB bandwidth)
- **Monitor**: Database size, API requests in dashboard

### Compute

- **API Server**: Single VPS ($5-10/month) handles moderate traffic
- **Redis**: Shared hosting or local instance (free)
- **Scrapers**: Run on same VPS (low resource usage)

### Estimated Monthly Costs

- VPS (1GB RAM): $5-10
- Supabase Pro: $25
- Domain: $12/year
- **Total**: ~$35-40/month for production

---

## Support & Resources

- **Documentation**: `sneaker-tracker/docs/`
- **API Reference**: `apps/api-server/README.md`
- **Scrapers Guide**: `packages/scrapers/README.md`
- **Issues**: Create issues in GitHub repo
- **Community**: Discord/Slack channel (TBD)

---

**Last Updated**: 2025-11-04  
**Maintainer**: Development Team
