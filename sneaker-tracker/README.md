# Sneaker Tracker

## Overview
Sneaker Tracker is a comprehensive application designed to track sneaker releases across various platforms and retailers. It provides users with real-time updates, demand scoring, and a centralized dashboard to manage their sneaker interests.

## Features
- **Real-time Release Tracking**: Stay updated with the latest sneaker releases from various retailers.
- **Demand Scoring**: Analyze the demand for specific sneakers using machine learning algorithms.
- **Multi-Platform Support**: Available as a web application, desktop application, and API server.
- **Retailer Management**: Admin interface to manage retailer information and release data.
- **Regional Data**: Access to sneaker retailers and releases segmented by region (US, EU, APAC, LATAM, MENA).

## Project Structure
The project is organized into several applications and packages:
- **apps/web-nextjs**: The Next.js web application.
- **apps/desktop-electron**: The Electron desktop application.
- **apps/api-server**: The API server for handling requests and data management.
- **packages/supabase-migrations**: Contains SQL migrations and seed data for the Supabase database.
- **packages/ml**: Implements machine learning features for demand scoring.
- **packages/scrapers**: Contains scrapers for gathering sneaker release data from various sources.
- **infra**: Infrastructure configuration files for deployment and database management.
- **region-data**: CSV files containing retailer data segmented by region.
- **docs**: Documentation files covering architecture, deployment, and dataset schema.
- **tests**: Unit tests for both the web application and API server.

## Getting Started
1. Clone the repository:
   ```
   git clone <repository-url>
   cd sneaker-tracker
   ```

2. Install dependencies:
   ```
   pnpm install
   ```

3. Set up the database:
   - Configure Supabase settings in `infra/supabase.toml`.
   - Run migrations:
     ```
     ./scripts/run_migrations.sh
     ```

4. Seed the database with retailer data:
   ```
   ./scripts/seed_retailers.sh
   ```

5. Start the applications:
   - For the web application:
     ```
     cd apps/web-nextjs
     pnpm run dev
     ```
   - For the desktop application:
     ```
     cd apps/desktop-electron
     pnpm run start
     ```
   - For the API server:
     ```
     cd apps/api-server
     pnpm run start
     ```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.