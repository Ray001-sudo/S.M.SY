"""
Shule360 Prediction Models
- RiskModel: GradientBoostingClassifier for at-risk detection (both curricula)
- PathwayModel: RandomForestClassifier for CBE pathway fit
- KJSEAProjector: Linear regression for KJSEA trajectory
"""
import os
import numpy as np
import joblib
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import shap

MODEL_DIR = os.path.join(os.path.dirname(__file__), '../../models')
os.makedirs(MODEL_DIR, exist_ok=True)

RISK_THRESHOLDS = {'low': 30, 'medium': 60, 'high': 80}  # critical = 80+

def risk_category(score: float) -> str:
    if score >= 80: return 'critical'
    if score >= 60: return 'high'
    if score >= 30: return 'medium'
    return 'low'


class RiskModel844:
    """8-4-4 at-risk classifier."""
    FEATURES = [
        'avg_grade_pct', 'grade_std', 'grade_trend',
        'subjects_below_50', 'lowest_subject_avg', 'assignment_completion',
        'attendance_rate', 'total_absences', 'max_absence_streak',
        'avg_fee_delay_days', 'has_outstanding_balance', 'overdue_terms',
        'risk_compound'
    ]
    MODEL_PATH = os.path.join(MODEL_DIR, 'risk_844.joblib')

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.explainer = None

    def load_or_init(self):
        if os.path.exists(self.MODEL_PATH):
            saved = joblib.load(self.MODEL_PATH)
            self.model = saved['model']
            self.scaler = saved['scaler']
        else:
            self.model = GradientBoostingClassifier(
                n_estimators=200, max_depth=4, learning_rate=0.05,
                min_samples_leaf=5, random_state=42
            )

    def predict(self, features: dict) -> dict:
        if self.model is None:
            self.load_or_init()
        if self.model is None or not hasattr(self.model, 'classes_'):
            return self._rule_based_fallback(features)

        X = np.array([[features.get(f, 0) for f in self.FEATURES]])
        X_scaled = self.scaler.transform(X)
        prob = self.model.predict_proba(X_scaled)[0]
        risk_score = float(prob[1] * 100)

        # SHAP top factors
        top_factors = self._get_top_factors(X_scaled, features)

        return {
            'risk_score': round(risk_score, 2),
            'risk_category': risk_category(risk_score),
            'top_factors': top_factors
        }

    def _rule_based_fallback(self, features: dict) -> dict:
        """Rule-based risk scoring when model is not yet trained."""
        score = 0
        factors = []

        if features.get('avg_grade_pct', 50) < 40:
            score += 30
            factors.append({'factor': 'Grade average below 40%', 'weight': 0.30, 'direction': 'high_risk'})
        elif features.get('avg_grade_pct', 50) < 50:
            score += 15
            factors.append({'factor': 'Grade average below 50%', 'weight': 0.15, 'direction': 'high_risk'})

        if features.get('attendance_rate', 1.0) < 0.70:
            score += 30
            factors.append({'factor': 'Attendance below 70%', 'weight': 0.30, 'direction': 'high_risk'})
        elif features.get('attendance_rate', 1.0) < 0.80:
            score += 15
            factors.append({'factor': 'Attendance below 80%', 'weight': 0.15, 'direction': 'high_risk'})

        if features.get('grade_trend', 0) < -5:
            score += 20
            factors.append({'factor': 'Declining grade trend', 'weight': 0.20, 'direction': 'high_risk'})

        if features.get('overdue_terms', 0) >= 2:
            score += 15
            factors.append({'factor': 'Multiple overdue fee terms', 'weight': 0.15, 'direction': 'high_risk'})

        if features.get('max_absence_streak', 0) >= 5:
            score += 10
            factors.append({'factor': 'Extended absence streak', 'weight': 0.10, 'direction': 'high_risk'})

        return {
            'risk_score': min(round(score, 2), 100),
            'risk_category': risk_category(min(score, 100)),
            'top_factors': factors[:3],
            'model_type': 'rule_based'
        }

    def _get_top_factors(self, X_scaled, features: dict) -> list:
        try:
            if self.explainer is None:
                self.explainer = shap.TreeExplainer(self.model)
            shap_vals = self.explainer.shap_values(X_scaled)[1][0]
            top_indices = np.argsort(np.abs(shap_vals))[-3:][::-1]
            return [
                {
                    'factor': self.FEATURES[i].replace('_', ' ').title(),
                    'weight': round(float(abs(shap_vals[i])), 3),
                    'direction': 'high_risk' if shap_vals[i] > 0 else 'low_risk',
                    'value': round(float(features.get(self.FEATURES[i], 0)), 2)
                }
                for i in top_indices
            ]
        except Exception:
            return []

    def train(self, X_train, y_train):
        X_scaled = self.scaler.fit_transform(X_train)
        self.model.fit(X_scaled, y_train)
        joblib.dump({'model': self.model, 'scaler': self.scaler}, self.MODEL_PATH)


class RiskModelCBE:
    """CBE at-risk classifier."""
    FEATURES = [
        'sba_avg', 'avg_competency_num', 'be_pct',
        'learning_to_learn_score', 'self_efficacy_score',
        'portfolio_items', 'portfolio_reviewed_pct',
        'attendance_rate', 'has_outstanding_balance', 'overdue_terms'
    ]
    MODEL_PATH = os.path.join(MODEL_DIR, 'risk_cbe.joblib')

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()

    def load_or_init(self):
        if os.path.exists(self.MODEL_PATH):
            saved = joblib.load(self.MODEL_PATH)
            self.model = saved['model']
            self.scaler = saved['scaler']

    def predict(self, features: dict) -> dict:
        if self.model is None:
            self.load_or_init()
        if self.model is None or not hasattr(self.model, 'classes_'):
            return self._rule_based_fallback(features)
        X = np.array([[features.get(f, 0) for f in self.FEATURES]])
        X_scaled = self.scaler.transform(X)
        prob = self.model.predict_proba(X_scaled)[0]
        risk_score = float(prob[1] * 100)
        return {'risk_score': round(risk_score, 2), 'risk_category': risk_category(risk_score), 'top_factors': []}

    def _rule_based_fallback(self, features: dict) -> dict:
        score = 0
        factors = []
        if features.get('sba_avg', 50) < 40:
            score += 30
            factors.append({'factor': 'SBA average below 40%', 'weight': 0.30, 'direction': 'high_risk'})
        if features.get('avg_competency_num', 3) < 2:
            score += 25
            factors.append({'factor': 'Low competency ratings', 'weight': 0.25, 'direction': 'high_risk'})
        if features.get('attendance_rate', 1.0) < 0.75:
            score += 25
            factors.append({'factor': 'Attendance below 75%', 'weight': 0.25, 'direction': 'high_risk'})
        if features.get('portfolio_items', 0) < 2:
            score += 10
            factors.append({'factor': 'Minimal portfolio submissions', 'weight': 0.10, 'direction': 'high_risk'})
        return {'risk_score': min(round(score, 2), 100), 'risk_category': risk_category(min(score, 100)),
                'top_factors': factors[:3], 'model_type': 'rule_based'}


class PathwayFitModel:
    """Predicts best CBC senior school pathway for Grade 9 students."""
    FEATURES = [
        'stem_avg', 'social_avg', 'arts_avg', 'math_score',
        'digital_literacy', 'creativity', 'citizenship',
        'arts_portfolio_pct', 'stem_portfolio_pct'
    ]
    PATHWAYS = ['stem', 'social_sciences', 'arts_sports']
    MODEL_PATH = os.path.join(MODEL_DIR, 'pathway_fit.joblib')

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()

    def load_or_init(self):
        if os.path.exists(self.MODEL_PATH):
            saved = joblib.load(self.MODEL_PATH)
            self.model = saved['model']
            self.scaler = saved['scaler']

    def predict(self, features: dict) -> dict:
        if self.model is None:
            self.load_or_init()
        if self.model is None or not hasattr(self.model, 'classes_'):
            return self._score_based_prediction(features)

        X = np.array([[features.get(f, 0) for f in self.FEATURES]])
        X_scaled = self.scaler.transform(X)
        probs = self.model.predict_proba(X_scaled)[0]
        pathway_scores = {p: round(float(probs[i]) * 100, 1) for i, p in enumerate(self.PATHWAYS)}
        recommended = max(pathway_scores, key=pathway_scores.get)
        return {'pathway_scores': pathway_scores, 'recommended_pathway': recommended, 'top_indicators': []}

    def _score_based_prediction(self, features: dict) -> dict:
        """Heuristic pathway scoring when model not yet trained."""
        stem_score = (
            features.get('stem_avg', 50) * 0.4 +
            features.get('math_score', 50) * 0.3 +
            features.get('digital_literacy', 2.5) / 4 * 100 * 0.3
        )
        social_score = (
            features.get('social_avg', 50) * 0.5 +
            features.get('citizenship', 2.5) / 4 * 100 * 0.3 +
            (100 - features.get('arts_avg', 50)) * 0.2
        )
        arts_score = (
            features.get('arts_avg', 50) * 0.4 +
            features.get('creativity', 2.5) / 4 * 100 * 0.3 +
            features.get('arts_portfolio_pct', 0) * 100 * 0.3
        )

        total = stem_score + social_score + arts_score
        pathway_scores = {
            'stem': round(stem_score / total * 100, 1),
            'social_sciences': round(social_score / total * 100, 1),
            'arts_sports': round(arts_score / total * 100, 1)
        }
        recommended = max(pathway_scores, key=pathway_scores.get)
        indicators = [
            {'indicator': 'STEM subject performance', 'score': round(features.get('stem_avg', 50), 1), 'pathway': 'stem'},
            {'indicator': 'Digital Literacy competency', 'score': round(features.get('digital_literacy', 2.5), 1), 'pathway': 'stem'},
            {'indicator': 'Creativity competency', 'score': round(features.get('creativity', 2.5), 1), 'pathway': 'arts_sports'},
        ]
        return {
            'pathway_scores': pathway_scores,
            'recommended_pathway': recommended,
            'top_indicators': indicators,
            'model_type': 'heuristic'
        }
