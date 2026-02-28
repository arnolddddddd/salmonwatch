# SalmonWatch BC

An open-source Pacific salmon intelligence platform for British Columbia.

SalmonWatch unifies 100 years of scattered federal salmon data with real-time environmental conditions into a single interactive explorer. Built on DFO's NuSEDS database (9,800+ populations), Conservation Unit assessments, and Environment Canada's hydrometric API.

## Why

- DFO's own Pacific Salmon Data Portal is still in early development
- Salmon data is scattered across 10+ federal and provincial portals in inconsistent formats
- 80% of BC spawning streams haven't been surveyed since 2018
- No existing tool combines population trends with real-time water conditions
- No predictive analytics on 100 years of escapement data

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Mapping | Deck.gl + react-map-gl (Mapbox GL JS) |
| Charts | uPlot |
| Backend | Python 3.14, FastAPI |
| Database | PostgreSQL 16 + PostGIS |
| Deployment | Vercel (frontend) + Railway (API) |

## Data Sources

- **NuSEDS** — 9,800+ salmon populations, 100 years of escapement data ([open.canada.ca](https://open.canada.ca/data/en/dataset/c48669a3-045b-400d-b730-48aafe8c5ee6))
- **Conservation Units** — 468 CUs with biological status assessments ([open.canada.ca](https://open.canada.ca/data/en/dataset/1ac00a39-4770-443d-8a6b-9656c06df6a3))
- **Environment Canada Water Office** — Real-time water level and flow ([api.weather.gc.ca](https://api.weather.gc.ca/collections/hydrometric-realtime))
- **BC Freshwater Atlas** — Complete stream network ([gov.bc.ca](https://www2.gov.bc.ca/gov/content/data/geographic-data-services/topographic-data/freshwater))

## Project Structure

```
salmonwatch/
├── web/          # Next.js 16 frontend
├── api/          # Python FastAPI backend
├── data/         # Raw data downloads (gitignored)
├── scripts/      # Data processing scripts
└── docs/         # Design docs and plans
```

## Development

### Prerequisites

- Node.js 18+
- Python 3.12+
- PostgreSQL 16 with PostGIS extension
- A Mapbox token (free tier works) — or MapLibre with CARTO basemaps (default, no token needed)

### 1. Clone

```bash
git clone https://github.com/arnolddddddd/salmonwatch.git
cd salmonwatch
```

### 2. API setup

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Create `api/.env` from the example:

```bash
cp .env.example .env
```

Required environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `SALMONWATCH_DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/salmonwatch` |
| `SALMONWATCH_CORS_ORIGINS` | JSON array of allowed origins | `["http://localhost:3000"]` |
| `SALMONWATCH_DEBUG` | Debug mode | `false` |

Run database migrations:

```bash
alembic upgrade head
```

Ingest NuSEDS data:

```bash
# Download raw data from DFO
bash ../scripts/download_nuseds.sh

# Run the ingest pipeline
python -m salmonwatch.ingest.nuseds
```

Start the API server:

```bash
uvicorn salmonwatch.main:app --reload
# → http://localhost:8000
```

### 3. Frontend setup

```bash
cd web
npm install
```

Create `web/.env.local` from the example:

```bash
cp .env.example .env.local
```

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox token (optional if using CARTO basemap) | — |

Start the dev server:

```bash
npm run dev
# → http://localhost:3000
```

### 4. Running tests

```bash
# API tests
cd api && python -m pytest tests/ -v

# Frontend build check
cd web && npx next build
```

## License

MIT

---

Built by [ArgonBI Systems Inc.](https://argonbi.com)
