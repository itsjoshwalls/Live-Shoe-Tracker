FROM node:18-slim

WORKDIR /app

RUN npm install --no-save \
    @supabase/supabase-js \
    node-fetch

COPY scraper-worker.js .

CMD ["node", "scraper-worker.js"]
