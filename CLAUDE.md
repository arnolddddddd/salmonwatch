# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SalmonWatch BC — open-source Pacific salmon intelligence platform for British Columbia. Monorepo with a Python FastAPI backend serving NuSEDS data from PostGIS and a Next.js 16 frontend rendering an interactive Deck.gl map.

**Status:** Early-stage MVP. Design docs and implementation plan exist; code is being built following the 12-task Phase 1 plan.

## Architecture

```
NuSEDS CSV/XLSX → Python ingest → PostGIS → FastAPI JSON → Next.js → Deck.gl/uPlot
```

- **`api/`** — Python 3.14 FastAPI backend. Source code in `api/src/salmonwatch/`. SQLAlchemy 2.0 ORM with PostGIS spatial extensions. Alembic for migrations.
- **`web/`** — Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4. Deck.gl + react-map-gl for mapping, uPlot for time series charts.
- **`data/`** — Raw data downloads (gitignored). NuSEDS Excel files go here.
- **`scripts/`** — Data processing and ingestion scripts.
- **`docs/plans/`** — Design doc and implementation plan.

## Key Commands

### Backend (`api/`)
```bash
cd api
pip install -e ".[dev]"           # Install with dev dependencies
pytest tests/ -v                  # Run all tests
pytest tests/test_foo.py -v       # Run single test file
pytest tests/test_foo.py::test_bar -v  # Run single test
uvicorn salmonwatch.main:app --reload --host 0.0.0.0 --port 8000  # Dev server
alembic upgrade head              # Run migrations
alembic revision --autogenerate -m "description"  # Create migration
```

### Frontend (`web/`)
```bash
cd web
npm install                       # Install dependencies
npm run dev                       # Dev server (localhost:3000)
npm run build                     # Production build
npm run lint                      # ESLint
```

## Key References

- **Design doc:** `docs/plans/2026-02-28-salmonwatch-design.md` — full product spec, UX flows, database schema, API endpoints, phased roadmap
- **Implementation plan:** `docs/plans/2026-02-28-phase1-implementation.md` — 12-task Phase 1 MVP plan with code snippets and file paths
- **NuSEDS data dictionary fields:** AREA, WATERBODY, GAZETTED_NAME, SPECIES, ANALYSIS_YR, NATURAL_ADULT_SPAWNERS, NATURAL_JACK_SPAWNERS, NATURAL_SPAWNERS_TOTAL, ADULT_BROODSTOCK_REMOVALS, TOTAL_RETURN_TO_RIVER, ACCURACY, POPULATION, RUN_TYPE, WATERSHED_CDE

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Mapping | Deck.gl + react-map-gl (Mapbox GL JS) |
| Charts | uPlot |
| Backend | Python 3.14, FastAPI, Uvicorn |
| ORM | SQLAlchemy 2.0 (async), GeoAlchemy2 |
| Database | PostgreSQL 16 + PostGIS |
| Migrations | Alembic |
| Data processing | pandas, geopandas, openpyxl |
| Deployment | Vercel (frontend) + Railway (API + PostgreSQL) |

## Database Schema (Core)

- **spawning_sites** — 9,800+ salmon populations with PostGIS Point geometry (WGS84/SRID 4326). Columns: species, region, stream_name, conservation_unit, cu_status, lat/lon, geom. GiST index on geom.
- **escapement_observations** — One row per site per year. Columns: natural_adult_spawners, natural_jack_spawners, total_spawners, accuracy, run_type. Composite indexes on (site_id, year) and (species, year).

## API Endpoints (Phase 1)

```
GET /v1/populations          — GeoJSON FeatureCollection, filterable by species/region/year/cu_status
GET /v1/populations/{id}     — Single population detail
GET /v1/populations/{id}/timeseries — Annual escapement array
GET /v1/stats                — Aggregate statistics
GET /v1/status               — Health check
```

## Implementation Notes

- Implementation plan directs: use `superpowers:executing-plans` skill to implement task-by-task
- Species enum: chinook, sockeye, coho, chum, pink, steelhead
- Spatial data uses GeoJSON FeatureCollections for API responses
- Fraser Valley data is the starting scope; expand to all BC in Phase 2
- NuSEDS Fraser extract filename: `Fraser and BC Interior NuSEDS_20251014.xlsx`
