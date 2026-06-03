import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator
from core import settings
from core.tasks import purge_expired_tokens, prune_ocr_stats, check_warranty_expiry
from api.routes import ordinateur, user, auth, agent, ecran, licence, document, inventaire, model, log, schema_router
from fastapi.middleware.cors import CORSMiddleware
from core.logger import setup_logger, logger
from core.telemetry import setup_telemetry
from db.session import SessionLocal
from db.seed import seed_admin
from db.db import engine

setup_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        seed_admin(db)
    except Exception as e:
        logger.warning(f"seed_admin skipped (migrations not yet applied?): {e}")
        db.rollback()
    finally:
        db.close()

    tasks = [
        asyncio.create_task(purge_expired_tokens()),
        asyncio.create_task(prune_ocr_stats()),
        asyncio.create_task(check_warranty_expiry()),
    ]
    yield
    for t in tasks:
        t.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)
instrumentator = Instrumentator().instrument(app)
setup_telemetry(app, engine, settings.APP_NAME, settings.OTEL_ENDPOINT)
logger.info(f"Démarrage de l'application {settings.APP_NAME} version {settings.VERSION}")

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "message": "API Inventaire"}

app.include_router(user, prefix="/users", tags=["users"])
app.include_router(ordinateur, prefix="/ordinateurs", tags=["ordinateurs"])
app.include_router(licence, prefix="/licenses", tags=["licenses"])
app.include_router(ecran, prefix="/ecrans", tags=["ecrans"])
app.include_router(auth, prefix="/auth", tags=["auth"])
app.include_router(inventaire, prefix="/inventaire", tags=["inventaire"])
app.include_router(agent, prefix="/agents", tags=["agents"])
app.include_router(document, prefix="/documents", tags=["documents"])
app.include_router(model, prefix="/models", tags=["models"])
app.include_router(log, prefix="/logs", tags=["logs"])
app.include_router(schema_router, prefix="/schema", tags=["schema"])

instrumentator.expose(app)

# @app.lifespan("startup")
# async def startup():
#     from db.seed import seed
#     seed()
#     logger.info(f"{settings.APP_NAME} démarré")