FROM node:18-slim

WORKDIR /app

# Install dependencies
RUN npm install --no-save \
    @supabase/supabase-js \
    node-fetch

# Copy scraper code
COPY scraper-worker.js .

# Run scraper
CMD ["node", "scraper-worker.js"]
