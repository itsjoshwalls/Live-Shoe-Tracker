#!/bin/bash

# Supabase CLI commands for managing the sneaker tracker project

# Set the Supabase project URL and API key
SUPABASE_URL="https://your-supabase-url.supabase.co"
SUPABASE_KEY="your-supabase-api-key"

# Login to Supabase
supabase login --api-url $SUPABASE_URL --api-key $SUPABASE_KEY

# Run migrations
supabase db push

# Seed the database with retailer data
supabase db seed --file ./packages/supabase-migrations/seeds/regions/US_retailers.csv
supabase db seed --file ./packages/supabase-migrations/seeds/regions/EU_retailers.csv

# List all tables in the database
supabase db list

# Open the Supabase dashboard
supabase dashboard

# Logout from Supabase
supabase logout