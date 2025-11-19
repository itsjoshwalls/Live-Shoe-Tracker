#!/bin/bash

# Navigate to the Supabase migrations directory
cd ../packages/supabase-migrations/migrations

# Run the SQL migration
supabase db push

# Navigate to the seeds directory
cd ../seeds/regions

# Seed the US retailers
supabase db seed US_retailers.csv

# Seed the EU retailers
supabase db seed EU_retailers.csv

echo "Migrations and seeding completed successfully."