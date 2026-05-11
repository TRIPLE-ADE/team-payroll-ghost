from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import audit, auth, employees, integrity, investigations
from app.routers import payments, payroll, relationships, settings, webhooks


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="GhostBuster API",
    description="AI-Powered Payroll Fraud Detection — Squad Hackathon 3.0",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(integrity.router)
app.include_router(payroll.router)
app.include_router(investigations.router)
app.include_router(employees.router)
app.include_router(payments.router)
app.include_router(relationships.router)
app.include_router(audit.router)
app.include_router(settings.router)
app.include_router(webhooks.router)


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "service": "ghostbuster-backend"}


@app.get("/", tags=["system"])
async def root():
    return {
        "service": "GhostBuster API",
        "version": "1.0.0",
        "docs": "/docs",
    }
