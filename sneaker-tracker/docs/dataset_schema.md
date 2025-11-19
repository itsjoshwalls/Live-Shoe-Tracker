# Dataset Schema for Sneaker Tracker Application

## Retailers Dataset

### Schema

| Field Name          | Data Type | Description                                           |
|---------------------|-----------|-------------------------------------------------------|
| `name`              | String    | Name of the retailer/store                             |
| `url`               | String    | Website URL of the retailer/store                      |
| `tier`              | Integer   | Tier level of the retailer (1-10)                     |
| `type`              | String    | Type of retailer (e.g., brand_official, chain, boutique, skate, resale) |
| `region`            | String    | Geographic region of the retailer (e.g., US, EU)      |
| `region_group`      | String    | Grouping of regions for easier management              |
| `notes`             | String    | Additional notes about the retailer                    |
| `verified`          | Boolean   | Indicates if the retailer is verified                  |
| `resale_market`     | Boolean   | Indicates if the retailer is a resale marketplace       |
| `has_raffles`       | Boolean   | Indicates if the retailer conducts raffles             |
| `raffle_url_pattern`| String    | URL pattern for raffle entries                         |
| `api_endpoint`      | String    | API endpoint for accessing retailer data               |
| `contact_email`     | String    | Contact email for the retailer                         |
| `phone`             | String    | Contact phone number for the retailer                  |
| `country_code`      | String    | ISO country code for the retailer                      |
| `last_checked`      | Date      | Date when the retailer information was last checked    |

### Example Entry

| name                       | url                                   | tier | type            | region | region_group | notes                       | verified | resale_market | has_raffles | raffle_url_pattern            | api_endpoint                  | contact_email         | phone          | country_code | last_checked |
|----------------------------|---------------------------------------|------|-----------------|--------|--------------|-----------------------------|----------|---------------|-------------|-------------------------------|-------------------------------|-----------------------|----------------|--------------|--------------|
| Nike SNKRS (US)           | https://www.nike.com/launch          | 9    | brand_official  | US     | US           | Nike official SNKRS launches & raffles | true     | false         | true        | https://www.nike.com/launch/* | https://api.nike.com/launch  | help@nike.com        |                | US           |              |
| StockX                     | https://stockx.com                   | 6    | resale          | Global | US           | Resale marketplace           | true     | true          | false       | https://stockx.com/*         | https://stockx.com/api        | help@stockx.com      |                | US           |              |

## Notes

- The `tier` field indicates the exclusivity and demand level of the retailer.
- The `type` field helps categorize the retailer for better filtering and searching.
- The `last_checked` field is crucial for maintaining up-to-date information on retailers.