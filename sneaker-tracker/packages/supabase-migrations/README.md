# Supabase Migrations

This directory contains the SQL migration scripts and seed data for the sneaker tracker application using Supabase.

## Migrations

The `migrations` folder includes SQL files that define the schema and structure of the database. Each migration file should be named in a sequential manner (e.g., `001_init_schema.sql`) to ensure proper execution order.

## Seeds

The `seeds` folder contains CSV files that provide initial data for the application. The data is organized by region, with separate files for US and EU retailers. These files can be imported into the database to populate the necessary tables.

### Usage

To run migrations and seed the database, use the provided scripts in the `scripts` directory:

- `run_migrations.sh`: Executes the SQL migration scripts.
- `seed_retailers.sh`: Seeds the retailer data into the database.

Ensure that your Supabase project is properly configured and that you have the necessary permissions to execute migrations and seed data.

## Contributing

If you wish to contribute to the migrations or seed data, please follow the naming conventions and ensure that your changes are tested before submitting a pull request.