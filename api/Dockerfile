FROM python:3.12-slim

WORKDIR /app

# System dependencies for PostGIS / geospatial
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
COPY src/ src/
COPY alembic/ alembic/
COPY alembic.ini .

RUN pip install --no-cache-dir . && pip install --no-cache-dir curl_cffi || true

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8000}/v1/status')" || exit 1

CMD ["sh", "-c", "echo 'Running migrations...' && alembic upgrade head && echo 'Starting uvicorn on port ${PORT:-8000}...' && exec uvicorn salmonwatch.main:app --host 0.0.0.0 --port ${PORT:-8000} --log-level info"]
