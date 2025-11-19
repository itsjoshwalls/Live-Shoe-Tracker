CREATE TABLE retailers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    tier INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    region VARCHAR(50) NOT NULL,
    region_group VARCHAR(50),
    notes TEXT,
    verified BOOLEAN DEFAULT FALSE,
    resale_market BOOLEAN DEFAULT FALSE,
    has_raffles BOOLEAN DEFAULT FALSE,
    raffle_url_pattern VARCHAR(255),
    api_endpoint VARCHAR(255),
    contact_email VARCHAR(255),
    phone VARCHAR(50),
    country_code VARCHAR(10),
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shoe_releases (
    id SERIAL PRIMARY KEY,
    retailer_id INT REFERENCES retailers(id),
    shoe_name VARCHAR(255) NOT NULL,
    release_date TIMESTAMP NOT NULL,
    demand_score INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);