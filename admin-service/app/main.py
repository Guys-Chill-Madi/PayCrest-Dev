from fastapi import FastAPI
from app.core.config import settings
from app.database.mongo import connect_db, close_db

from app.routers.approvals.router import router as approvals_router
from app.routers.audit.router import router as audit_router
from app.routers.staff.router import router as staff_router
from app.routers.support.router import router as support_router

from app.middleware.idempotency import IdempotencyMiddleware

app = FastAPI(title=(settings.SERVICE_NAME or "Admin Service") + " API")
app.add_middleware(IdempotencyMiddleware)

app.include_router(approvals_router)
app.include_router(audit_router)
app.include_router(staff_router)
app.include_router(support_router)


@app.on_event("startup")
async def startup_db_client():
    await connect_db()


@app.on_event("shutdown")
async def shutdown_db_client():
    await close_db()


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": (settings.SERVICE_NAME or "admin-service"),
        "version": "1.0.0"
    }