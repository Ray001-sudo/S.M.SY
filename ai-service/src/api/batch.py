"""Batch risk recompute endpoint + weekly scheduler job."""
import os
import psycopg2
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.features.extractor import extract_844_features, extract_cbe_features
from src.models.predictors import RiskModel844, RiskModelCBE

router = APIRouter()
risk_844 = RiskModel844()
risk_cbe  = RiskModelCBE()

class BatchRequest(BaseModel):
    school_id: str

def get_conn():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

@router.post("/risk")
async def batch_risk(req: BatchRequest):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, curriculum_mode FROM students WHERE school_id = %s AND status = 'active'",
                (req.school_id,)
            )
            students = cur.fetchall()
    finally:
        conn.close()

    processed, failed = 0, 0
    for (student_id, curriculum_mode) in students:
        try:
            if curriculum_mode == 'eight_four_four':
                feats = extract_844_features(student_id, req.school_id)
                result = risk_844.predict(feats) if feats else None
            else:
                feats = extract_cbe_features(student_id, req.school_id)
                result = risk_cbe.predict(feats) if feats else None

            if result:
                conn = get_conn()
                try:
                    with conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO student_risk_scores
                              (id, school_id, student_id, curriculum_mode,
                               risk_score, risk_category, top_factors,
                               eight_four_four_data, cbe_data, model_version, computed_at)
                            VALUES (uuid_generate_v4(),%s,%s,%s,%s,%s,'[]'::jsonb,'{}'::jsonb,'{}'::jsonb,'batch_v1',NOW())
                        """, (req.school_id, student_id, curriculum_mode,
                              result['risk_score'], result['risk_category']))
                    conn.commit()
                finally:
                    conn.close()
                processed += 1
        except Exception:
            failed += 1

    return {"processed": processed, "failed": failed, "school_id": req.school_id}
