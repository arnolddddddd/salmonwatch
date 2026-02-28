import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from salmonwatch.config import settings, check_cors_config
from salmonwatch.api.routes import router
from salmonwatch.api.analytics_routes import router as analytics_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    )
    check_cors_config()
    logger.info("SalmonWatch API started. CORS origins: %s", settings.cors_origins)
    yield


app = FastAPI(
    title="SalmonWatch BC API",
    description="Pacific salmon intelligence API for British Columbia",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(analytics_router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.monotonic()
    response = await call_next(request)
    duration_ms = (time.monotonic() - start) * 1000
    if duration_ms > 500:
        logger.warning(
            "SLOW %s %s — %dms (status %d)",
            request.method, request.url.path, duration_ms, response.status_code,
        )
    elif request.url.path != "/v1/status":
        logger.info(
            "%s %s — %dms (status %d)",
            request.method, request.url.path, duration_ms, response.status_code,
        )
    return response


@app.get("/v1/status")
def status():
    from datetime import datetime, timezone
    from sqlalchemy import text
    from salmonwatch.db.engine import get_db

    db_ok = False
    try:
        db = next(get_db())
        try:
            db.execute(text("SELECT 1"))
            db_ok = True
        except Exception as e:
            logger.warning("DB health check failed: %s", e)
        finally:
            db.close()
    except Exception as e:
        logger.warning("DB connection failed: %s", e)

    status_code = 200 if db_ok else 503
    return JSONResponse(
        content={
            "status": "ok" if db_ok else "degraded",
            "version": "0.2.0",
            "db_connected": db_ok,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        status_code=status_code,
    )


@app.get("/v1/search")
def search_populations(
    q: str,
    limit: int = 20,
):
    """Search populations by stream name."""
    from salmonwatch.db.engine import SessionLocal
    from salmonwatch.db.tables import SpawningSite

    if len(q) < 2:
        return []

    db = SessionLocal()
    try:
        results = (
            db.query(SpawningSite.id, SpawningSite.stream_name, SpawningSite.species, SpawningSite.region)
            .filter(SpawningSite.stream_name.ilike(f"%{q}%"))
            .order_by(SpawningSite.stream_name)
            .limit(min(limit, 50))
            .all()
        )
        return [
            {"id": r.id, "stream_name": r.stream_name, "species": r.species, "region": r.region}
            for r in results
        ]
    finally:
        db.close()
