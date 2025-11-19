FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    supabase \
    requests

COPY scraper-worker.py .

CMD ["python", "scraper-worker.py"]
