"""Weekly scheduled jobs."""
import os
import psycopg2
import httpx
import logging

logger = logging.getLogger(__name__)

def get_conn():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

async def run_weekly_risk_batch():
    """Run risk recompute for every active school every Sunday at 01:00."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM schools WHERE is_active = TRUE")
            schools = [row[0] for row in cur.fetchall()]
    finally:
        conn.close()

    ai_url = os.getenv("AI_SERVICE_URL", "http://localhost:8000")
    api_key = os.getenv("AI_SERVICE_API_KEY", "internal_ai_service_key")

    for school_id in schools:
        try:
            async with httpx.AsyncClient(timeout=300) as client:
                await client.post(
                    f"{ai_url}/batch/risk",
                    json={"school_id": school_id},
                    headers={"X-API-Key": api_key}
                )
            logger.info(f"Batch risk complete for school {school_id}")
        except Exception as e:
            logger.error(f"Batch failed for school {school_id}: {e}")
