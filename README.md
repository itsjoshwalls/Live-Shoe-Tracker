# 🚀 Live Shoe Tracker - Complete Backend Implementation

> **Production-ready Cloud Functions backend with Firestore, real-time alerts, and automated scraping**

[![Firebase](https://img.shields.io/badge/Firebase-Cloud%20Functions-orange)](https://firebase.google.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18-green)](https://nodejs.org/)
[![Firestore](https://img.shields.io/badge/Firestore-Database-blue)](https://firebase.google.com/docs/firestore)

---

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Documentation](#-documentation)
- [Project Structure](#-project-structure)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

---

## ✨ Features

### 🔥 Cloud Functions (7 Total)
- **4 Firestore Triggers** - Auto-respond to database changes
- **3 Scheduled Functions** - Automated scraping, alerts, and metrics

### 🗄️ Firestore Database
- **9 Collections** - Releases, retailers, users, alerts, queues, metrics, categories, regions
- **4 Composite Indexes** - Optimized queries for performance
- **Complete Security Rules** - User isolation and admin-only writes

### 🔔 Real-time Notifications
- **Discord Integration** - Instant alerts for stock changes
- **Slack Integration** - Team notifications
- **User Alerts** - Personalized notifications

### 🕷️ Automated Scraping
- **Queue System** - Managed job processing
- **Scheduled Execution** - Every 30 minutes
- **Retailer Management** - 5 pre-configured retailers

### 📊 Monitoring & Metrics
- **System Stats** - Releases, retailers, users
- **Function Logs** - Comprehensive logging
- **Performance Tracking** - Execution metrics

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Firebase CLI
- Firebase project with Firestore enabled

### 1. Automated Setup (Recommended)
```powershell
.\Setup-LocalDev.ps1
```

### 2. Manual Setup
```powershell
# Install dependencies
cd functions
npm install

# Configure environment
Copy-Item .env.example .env
# Edit .env with your credentials

# Download service account key from Firebase Console
# Save as: functions/serviceAccountKey.json

# Seed initial data
npm run seed

# Start emulators
cd ..
firebase emulators:start
```

### 3. Access
- **Emulator UI**: http://localhost:4000
- **Firestore**: http://localhost:8080
- **Functions**: http://localhost:5001

---

## 🏗️ Architecture

```
┌──────────────┐
│   Scrapers   │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────┐
│    Cloud Functions          │
│  • releaseHandler           │
│  • retailerHandler          │
│  • stockHandler             │
│  • alertsHandler            │
│  • scraperQueueHandler      │
│  • schedulerHandler         │
│  • metricsHandler           │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│    Firestore Database       │
│  • releases                 │
│  • retailers                │
│  • users                    │
│  • alerts                   │
│  • queues                   │
│  • metrics                  │
│  • categories               │
│  • regions                  │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│    Notifications            │
│  • Discord Webhooks         │
│  • Slack Webhooks           │
└─────────────────────────────┘
```

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for detailed diagrams.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[SETUP-GUIDE.md](./SETUP-GUIDE.md)** | Comprehensive setup instructions |
| **[QUICK-START.md](./QUICK-START.md)** | Quick reference for common tasks |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | System architecture diagrams |
| **[DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md)** | Production deployment guide |
| **[IMPLEMENTATION-COMPLETE.md](./IMPLEMENTATION-COMPLETE.md)** | Implementation summary |

---

## 📁 Project Structure

```
/Live-Shoe-Tracker
│
├── functions/
│   ├── src/
│   │   ├── handlers/          # 8 Cloud Function handlers
│   │   ├── utils/             # Firestore, logger, notifications
│   │   └── index.js           # Main exports
│   ├── .env.example           # Environment template
│   └── package.json           # Dependencies & scripts
│
├── firestore.indexes.json     # Composite indexes
├── firestore.seed.json        # Initial seed data
├── firestore.rules            # Security rules
├── firebase.json              # Emulator configuration
│
├── Setup-LocalDev.ps1         # Automated setup script
│
└── docs/                      # Documentation
    ├── SETUP-GUIDE.md
    ├── QUICK-START.md
    ├── ARCHITECTURE.md
    ├── DEPLOYMENT-CHECKLIST.md
    └── IMPLEMENTATION-COMPLETE.md
```

---

## 🚀 Deployment

### Deploy Everything
```powershell
firebase deploy
```

### Deploy Specific Components
```powershell
# Firestore rules
firebase deploy --only firestore:rules

# Firestore indexes
firebase deploy --only firestore:indexes

# Cloud Functions
firebase deploy --only functions
```

### Set Environment Variables
```powershell
# Discord webhook
firebase functions:config:set alerts.discord_webhook="YOUR_WEBHOOK_URL"

# Slack webhook
firebase functions:config:set alerts.slack_webhook="YOUR_WEBHOOK_URL"

# Apply changes
firebase deploy --only functions
```

See **[DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md)** for complete guide.

---

## 🔐 Security

### Firestore Rules
- **User data isolation** - Users can only access their own data
- **Admin-only writes** - Public collections require admin role
- **Subcollection security** - Inherited from parent documents

### Environment Variables
- **Never commit** `.env` or `serviceAccountKey.json`
- **Use Firebase secrets** for production credentials
- **Rotate keys regularly**

### Admin Access
Set custom claims for admin users:
```javascript
admin.auth().setCustomUserClaims(uid, { admin: true });
```

---

## 📊 Monitoring

### View Logs
```powershell
# All function logs
firebase functions:log

# Specific function
firebase functions:log --only onReleaseWrite

# Follow in real-time
firebase functions:log --follow
```

### Metrics Endpoint
System metrics collected hourly:
- Total releases
- Total retailers
- Total users

---

## 🛠️ Development

### Run Emulators
```powershell
firebase emulators:start
```

### Seed Data
```powershell
npm run seed --prefix functions
```

### Run Tests
```powershell
# Coming soon
npm test --prefix functions
```

---

## 🐛 Troubleshooting

### Emulators won't start
```powershell
Get-Process -Name "java" | Stop-Process -Force
firebase emulators:start
```

### Functions not deploying
- Check billing is enabled
- Verify Firebase project: `firebase use default`
- Check `package.json` syntax

### Permission denied errors
- Review `firestore.rules`
- Verify user authentication
- Check admin custom claims

See **[SETUP-GUIDE.md](./SETUP-GUIDE.md)** for more solutions.

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- Firebase Team for Cloud Functions and Firestore
- Open source community for inspiration

---

## 📞 Support

- **Documentation**: See `/docs` folder
- **Issues**: Open a GitHub issue
- **Firebase Docs**: https://firebase.google.com/docs

---

## 🎯 Next Steps

1. ✅ Review **[SETUP-GUIDE.md](./SETUP-GUIDE.md)**
2. ✅ Run `.\Setup-LocalDev.ps1`
3. ✅ Start emulators
4. ✅ Test functions in Emulator UI
5. ✅ Deploy to production

---

**Built with ❤️ using Firebase Cloud Functions**

Last Updated: November 8, 2025
