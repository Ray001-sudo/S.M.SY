"""
Shule360 AI Service
Dual-curriculum risk prediction + CBC pathway fit prediction
"""
import os
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from src.api.predict import router as predict_router
from src.api.batch import router as batch_router
from src.scheduler.jobs import run_weekly_risk_batch

load_dotenv()

app = FastAPI(
    title="Shule360 AI Service",
    description="At-risk student prediction + CBC pathway fit prediction",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router, prefix="/predict", tags=["prediction"])
app.include_router(batch_router, prefix="/batch", tags=["batch"])

# API key auth
async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != os.getenv("AI_SERVICE_API_KEY", "internal_ai_service_key"):
        raise HTTPException(status_code=401, detail="Invalid API key")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "shule360-ai", "version": "2.0.0"}

# Weekly scheduler
scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup():
    scheduler.add_job(run_weekly_risk_batch, "cron", day_of_week="sun", hour=1)
    scheduler.start()

@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()
