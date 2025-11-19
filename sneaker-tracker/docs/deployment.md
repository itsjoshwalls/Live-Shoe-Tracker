# Deployment Instructions for Sneaker Tracker Application

## Overview
This document provides step-by-step instructions for deploying the Sneaker Tracker application, which consists of a Next.js web application, an Electron desktop application, and an API server.

## Prerequisites
- Node.js (version 14 or higher)
- pnpm (package manager)
- Supabase account and project
- Vercel account for deployment of the Next.js application

## Deployment Steps

### 1. Clone the Repository
Clone the sneaker tracker repository to your local machine:
```bash
git clone <repository-url>
cd sneaker-tracker
```

### 2. Install Dependencies
Navigate to each application directory and install the necessary dependencies using pnpm:
```bash
# For Next.js web application
cd apps/web-nextjs
pnpm install

# For Electron desktop application
cd ../desktop-electron
pnpm install

# For API server
cd ../api-server
pnpm install
```

### 3. Set Up Supabase
- Create a new Supabase project at [Supabase](https://supabase.io).
- Configure your database and obtain the API keys.
- Update the Supabase client configuration in `apps/web-nextjs/lib/supabaseClient.ts` with your project details.

### 4. Run Migrations
Run the database migrations to set up the initial schema:
```bash
cd ../packages/supabase-migrations
pnpm run migrate
```

### 5. Seed Retailer Data
Seed the database with retailer data:
```bash
pnpm run seed
```

### 6. Deploy the Next.js Application
- Ensure you have the Vercel CLI installed:
```bash
npm install -g vercel
```
- Deploy the Next.js application:
```bash
cd apps/web-nextjs
vercel
```
Follow the prompts to complete the deployment.

### 7. Run the API Server
Start the API server locally:
```bash
cd ../api-server
pnpm run start
```

### 8. Run the Electron Application
To run the Electron application, navigate to the desktop-electron directory and start it:
```bash
cd ../desktop-electron
pnpm run start
```

## Additional Notes
- Ensure that all environment variables are set correctly in your deployment environment.
- Monitor the logs for any errors during deployment and address them as necessary.

## Conclusion
Following these steps will help you successfully deploy the Sneaker Tracker application. For any issues or further assistance, refer to the documentation or reach out to the development team.