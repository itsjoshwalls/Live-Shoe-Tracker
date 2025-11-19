FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir \
    supabase \
    requests \
    beautifulsoup4 \
    lxml

# Copy scraper code
COPY scraper-worker.py .

# Run scraper
CMD ["python", "scraper-worker.py"]
