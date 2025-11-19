#!/bin/bash

# This script seeds the retailer data into the Supabase database.

# Set the Supabase project URL and API key
SUPABASE_URL="https://your-supabase-url.supabase.co"
SUPABASE_API_KEY="your-supabase-api-key"

# Path to the CSV files
US_RETAILERS_CSV="packages/supabase-migrations/seeds/regions/US_retailers.csv"
EU_RETAILERS_CSV="packages/supabase-migrations/seeds/regions/EU_retailers.csv"

# Function to seed data from a CSV file
seed_data() {
  local csv_file=$1
  local table_name=$2

  echo "Seeding data from $csv_file into $table_name..."

  # Use Supabase CLI to import the CSV data
  supabase db push --file "$csv_file" --table "$table_name" --url "$SUPABASE_URL" --apikey "$SUPABASE_API_KEY"
}

# Seed US retailers
seed_data "$US_RETAILERS_CSV" "retailers"

# Seed EU retailers
seed_data "$EU_RETAILERS_CSV" "retailers"

echo "Seeding completed."