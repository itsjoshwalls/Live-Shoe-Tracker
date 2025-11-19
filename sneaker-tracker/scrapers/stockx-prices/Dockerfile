FROM python:3.11-slim

WORKDIR /app

# Install Node.js for sneaks-api
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir supabase requests

# Install Node dependencies
RUN npm install --no-save sneaks-api

# Copy scraper code
COPY scraper-worker.py .
COPY stockx_prices.cjs .

CMD ["python", "scraper-worker.py"]
