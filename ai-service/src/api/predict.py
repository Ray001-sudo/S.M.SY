"""FastAPI prediction endpoints."""
import os
import psycopg2
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from src.features.extractor import extract_844_features, extract_cbe_features, extract_pathway_features
from src.models.predictors import RiskModel844, RiskModelCBE, PathwayFitModel

router = APIRouter()

risk_model_844 = RiskModel844()
risk_model_cbe = RiskModelCBE()
pathway_model = PathwayFitModel()

class RiskRequest(BaseModel):
    student_id: str
    school_id: str
    curriculum_mode: str

class PathwayRequest(BaseModel):
    student_id: str
    school_id: str


def get_conn():
    return psycopg2.connect(os.getenv("DATABASE_URL"))


@router.post("/risk")
async def predict_risk(req: RiskRequest):
    try:
        if req.curriculum_mode == 'eight_four_four':
            features = extract_844_features(req.student_id, req.school_id)
            if not features:
                raise HTTPException(status_code=404, detail="Insufficient data for prediction")
            result = risk_model_844.predict(features)
            eight_four_four_data = {
                'avg_grade_pct': features.get('avg_grade_pct'),
                'grade_trend': features.get('grade_trend'),
                'attendance_rate': features.get('attendance_rate'),
                'subjects_below_50': features.get('subjects_below_50')
            }
            cbe_data = {}
        else:
            features = extract_cbe_features(req.student_id, req.school_id)
            if not features:
                raise HTTPException(status_code=404, detail="Insufficient data for prediction")
            result = risk_model_cbe.predict(features)
            eight_four_four_data = {}
            cbe_data = {
                'sba_avg': features.get('sba_avg'),
                'avg_competency_num': features.get('avg_competency_num'),
                'portfolio_items': features.get('portfolio_items'),
                'attendance_rate': features.get('attendance_rate')
            }

        # Persist to DB
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO student_risk_scores
                      (id, school_id, student_id, curriculum_mode, risk_score, risk_category,
                       top_factors, eight_four_four_data, cbe_data, model_version, computed_at)
                    VALUES (uuid_generate_v4(), %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s, NOW())
                """, (
                    req.school_id, req.student_id, req.curriculum_mode,
                    result['risk_score'], result['risk_category'],
                    str(result.get('top_factors', [])).replace("'", '"'),
                    str(eight_four_four_data).replace("'", '"'),
                    str(cbe_data).replace("'", '"'),
                    result.get('model_type', 'ml_v1')
                ))
            conn.commit()
        finally:
            conn.close()

        return {**result, 'student_id': req.student_id, 'curriculum_mode': req.curriculum_mode, 'computed_at': datetime.now().isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pathway")
async def predict_pathway(req: PathwayRequest):
    try:
        features = extract_pathway_features(req.student_id, req.school_id)
        if not features:
            raise HTTPException(status_code=404, detail="Insufficient Grade 7-9 data for pathway prediction")

        result = pathway_model.predict(features)

        # Persist
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO pathway_recommendations
                      (id, school_id, student_id, pathway_scores, recommended_pathway,
                       top_indicators, model_version, generated_at)
                    VALUES (uuid_generate_v4(), %s, %s, %s::jsonb, %s, %s::jsonb, %s, NOW())
                    ON CONFLICT (school_id, student_id)
                    DO UPDATE SET pathway_scores = EXCLUDED.pathway_scores,
                      recommended_pathway = EXCLUDED.recommended_pathway,
                      generated_at = NOW()
                """, (
                    req.school_id, req.student_id,
                    str(result['pathway_scores']).replace("'", '"'),
                    result['recommended_pathway'],
                    str(result.get('top_indicators', [])).replace("'", '"'),
                    result.get('model_type', 'pathway_v1')
                ))
            conn.commit()
        finally:
            conn.close()

        return {**result, 'student_id': req.student_id, 'generated_at': datetime.now().isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
