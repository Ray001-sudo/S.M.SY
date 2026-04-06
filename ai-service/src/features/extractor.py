"""
Feature extraction for both 8-4-4 and CBE risk models.
Pulls raw data from PostgreSQL and engineers predictive features.
"""
import os
import psycopg2
import pandas as pd
import numpy as np
from typing import Optional

def get_conn():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def extract_844_features(student_id: str, school_id: str) -> Optional[dict]:
    """Extract 8-4-4 risk features: grades + attendance + fee payment patterns."""
    conn = get_conn()
    try:
        # Academic signals
        grades_df = pd.read_sql("""
            SELECT a.raw_score, a.max_score, a.assessment_type, a.assessment_date,
                   s.name as subject_name
            FROM assessments a
            JOIN subjects s ON a.subject_id = s.id
            WHERE a.student_id = %s AND a.school_id = %s
              AND a.curriculum_mode = 'eight_four_four'
            ORDER BY a.assessment_date DESC
        """, conn, params=(student_id, school_id))

        # Attendance signals
        attendance_df = pd.read_sql("""
            SELECT status, lesson_date
            FROM attendance
            WHERE student_id = %s AND school_id = %s
            ORDER BY lesson_date DESC
        """, conn, params=(student_id, school_id))

        # Fee signals
        fee_df = pd.read_sql("""
            SELECT fi.due_date, fi.status, fi.balance, fi.net_payable,
                   fp.payment_date
            FROM fee_invoices fi
            LEFT JOIN fee_payments fp ON fp.invoice_id = fi.id
            WHERE fi.student_id = %s AND fi.school_id = %s
            ORDER BY fi.academic_year DESC, fi.term DESC
        """, conn, params=(student_id, school_id))

        if grades_df.empty and attendance_df.empty:
            return None

        features = {}

        # ── Academic features ──────────────────────────────
        if not grades_df.empty:
            grades_df['pct'] = (grades_df['raw_score'] / grades_df['max_score']) * 100
            features['avg_grade_pct'] = grades_df['pct'].mean()
            features['grade_std'] = grades_df['pct'].std()

            # Trend: slope of last 6 assessments
            recent = grades_df.head(6)['pct'].values
            if len(recent) >= 2:
                features['grade_trend'] = float(np.polyfit(range(len(recent)), recent, 1)[0])
            else:
                features['grade_trend'] = 0.0

            # Subject-level weakness
            subject_avgs = grades_df.groupby('subject_name')['pct'].mean()
            features['subjects_below_50'] = int((subject_avgs < 50).sum())
            features['lowest_subject_avg'] = float(subject_avgs.min())
            features['assignment_completion'] = float(
                len(grades_df[grades_df['assessment_type'] == 'assignment']) /
                max(len(grades_df), 1)
            )
        else:
            features.update({
                'avg_grade_pct': 50.0, 'grade_std': 0.0, 'grade_trend': 0.0,
                'subjects_below_50': 0, 'lowest_subject_avg': 50.0, 'assignment_completion': 0.5
            })

        # ── Attendance features ────────────────────────────
        if not attendance_df.empty:
            total = len(attendance_df)
            present = len(attendance_df[attendance_df['status'] == 'present'])
            absent = len(attendance_df[attendance_df['status'] == 'absent'])
            features['attendance_rate'] = present / total if total > 0 else 1.0
            features['total_absences'] = absent

            # Consecutive absence streak
            streak = 0
            max_streak = 0
            for s in attendance_df['status'].values:
                if s == 'absent':
                    streak += 1
                    max_streak = max(max_streak, streak)
                else:
                    streak = 0
            features['max_absence_streak'] = max_streak
        else:
            features.update({'attendance_rate': 1.0, 'total_absences': 0, 'max_absence_streak': 0})

        # ── Fee features ───────────────────────────────────
        if not fee_df.empty:
            # Days between due date and first payment
            fee_df['due_date'] = pd.to_datetime(fee_df['due_date'])
            fee_df['payment_date'] = pd.to_datetime(fee_df['payment_date'])
            fee_df['days_late'] = (fee_df['payment_date'] - fee_df['due_date']).dt.days
            features['avg_fee_delay_days'] = float(fee_df['days_late'].dropna().mean() or 0)
            features['has_outstanding_balance'] = int(fee_df['balance'].fillna(0).sum() > 0)
            overdue_count = len(fee_df[fee_df['status'] == 'overdue'])
            features['overdue_terms'] = overdue_count
        else:
            features.update({'avg_fee_delay_days': 0.0, 'has_outstanding_balance': 0, 'overdue_terms': 0})

        # ── Composite interaction features ────────────────
        features['risk_compound'] = (1 - features['attendance_rate']) * max(0, 50 - features['avg_grade_pct'])

        return features
    finally:
        conn.close()


def extract_cbe_features(student_id: str, school_id: str) -> Optional[dict]:
    """Extract CBE risk features: SBA + competencies + portfolio + attendance + fees."""
    conn = get_conn()
    try:
        sba_df = pd.read_sql("""
            SELECT a.raw_score, a.max_score, a.competency_rating,
                   a.assessment_type, a.academic_year, a.term,
                   cs.strand_name
            FROM assessments a
            LEFT JOIN cbe_strands cs ON a.strand_id = cs.id
            WHERE a.student_id = %s AND a.school_id = %s
              AND a.curriculum_mode = 'cbe'
            ORDER BY a.academic_year DESC, a.term DESC
        """, conn, params=(student_id, school_id))

        comp_df = pd.read_sql("""
            SELECT competency, rating, term, academic_year
            FROM core_competency_ratings
            WHERE student_id = %s AND school_id = %s
            ORDER BY academic_year DESC, term DESC
        """, conn, params=(student_id, school_id))

        portfolio_df = pd.read_sql("""
            SELECT review_status, evidence_type, created_at
            FROM student_portfolios
            WHERE student_id = %s AND school_id = %s
        """, conn, params=(student_id, school_id))

        attendance_df = pd.read_sql("""
            SELECT status FROM attendance
            WHERE student_id = %s AND school_id = %s
        """, conn, params=(student_id, school_id))

        fee_df = pd.read_sql("""
            SELECT balance, status, net_payable FROM fee_invoices
            WHERE student_id = %s AND school_id = %s
        """, conn, params=(student_id, school_id))

        features = {}

        # ── SBA / Academic ─────────────────────────────────
        if not sba_df.empty:
            sba_df['pct'] = (sba_df['raw_score'] / sba_df['max_score']) * 100
            features['sba_avg'] = sba_df['pct'].mean()
            rating_map = {'EE': 4, 'ME': 3, 'AE': 2, 'BE': 1}
            rated = sba_df.dropna(subset=['competency_rating'])
            features['avg_competency_num'] = rated['competency_rating'].map(rating_map).mean() if len(rated) > 0 else 2.5
            features['be_pct'] = len(rated[rated['competency_rating'] == 'BE']) / max(len(rated), 1)
        else:
            features.update({'sba_avg': 50.0, 'avg_competency_num': 2.5, 'be_pct': 0.0})

        # ── Core competencies ──────────────────────────────
        if not comp_df.empty:
            rating_map = {'EE': 4, 'ME': 3, 'AE': 2, 'BE': 1}
            comp_df['rating_num'] = comp_df['rating'].map(rating_map)
            features['learning_to_learn_score'] = comp_df[comp_df['competency'] == 'learning_to_learn']['rating_num'].mean() or 2.5
            features['self_efficacy_score'] = comp_df[comp_df['competency'] == 'self_efficacy']['rating_num'].mean() or 2.5
        else:
            features.update({'learning_to_learn_score': 2.5, 'self_efficacy_score': 2.5})

        # ── Portfolio ──────────────────────────────────────
        features['portfolio_items'] = len(portfolio_df)
        features['portfolio_reviewed_pct'] = len(portfolio_df[portfolio_df['review_status'] == 'reviewed']) / max(len(portfolio_df), 1)

        # ── Attendance ─────────────────────────────────────
        if not attendance_df.empty:
            total = len(attendance_df)
            present = len(attendance_df[attendance_df['status'] == 'present'])
            features['attendance_rate'] = present / total
        else:
            features['attendance_rate'] = 1.0

        # ── Fees ───────────────────────────────────────────
        if not fee_df.empty:
            features['has_outstanding_balance'] = int(fee_df['balance'].fillna(0).sum() > 0)
            features['overdue_terms'] = int(len(fee_df[fee_df['status'] == 'overdue']))
        else:
            features.update({'has_outstanding_balance': 0, 'overdue_terms': 0})

        return features
    finally:
        conn.close()


def extract_pathway_features(student_id: str, school_id: str) -> Optional[dict]:
    """Extract features for pathway fit prediction (Grade 9 CBE students)."""
    conn = get_conn()
    try:
        sba_df = pd.read_sql("""
            SELECT a.raw_score, a.max_score, s.name as subject_name
            FROM assessments a
            JOIN subjects s ON a.subject_id = s.id
            WHERE a.student_id = %s AND a.school_id = %s AND a.curriculum_mode = 'cbe'
        """, conn, params=(student_id, school_id))

        comp_df = pd.read_sql("""
            SELECT competency, rating FROM core_competency_ratings
            WHERE student_id = %s AND school_id = %s
        """, conn, params=(student_id, school_id))

        portfolio_df = pd.read_sql("""
            SELECT sp.evidence_type, sub.name as subject_name
            FROM student_portfolios sp
            JOIN subjects sub ON sp.subject_id = sub.id
            WHERE sp.student_id = %s AND sp.school_id = %s
            AND sp.review_status = 'reviewed'
        """, conn, params=(student_id, school_id))

        if sba_df.empty:
            return None

        sba_df['pct'] = (sba_df['raw_score'] / sba_df['max_score']) * 100
        rating_map = {'EE': 4, 'ME': 3, 'AE': 2, 'BE': 1}

        # STEM indicators
        stem_subjects = ['Integrated Science', 'Mathematics', 'Computer Science']
        stem_scores = sba_df[sba_df['subject_name'].isin(stem_subjects)]['pct']

        # Social Sciences indicators
        social_subjects = ['Social Studies', 'Religious Education', 'Kiswahili', 'English']
        social_scores = sba_df[sba_df['subject_name'].isin(social_subjects)]['pct']

        # Arts indicators
        arts_subjects = ['Creative Arts and Sports', 'Physical Education', 'Music']
        arts_scores = sba_df[sba_df['subject_name'].isin(arts_subjects)]['pct']

        features = {
            'stem_avg': stem_scores.mean() if len(stem_scores) > 0 else 50.0,
            'social_avg': social_scores.mean() if len(social_scores) > 0 else 50.0,
            'arts_avg': arts_scores.mean() if len(arts_scores) > 0 else 50.0,
            'math_score': sba_df[sba_df['subject_name'] == 'Mathematics']['pct'].mean() if len(sba_df[sba_df['subject_name'] == 'Mathematics']) > 0 else 50.0,
        }

        if not comp_df.empty:
            comp_df['rating_num'] = comp_df['rating'].map(rating_map)
            features['digital_literacy'] = comp_df[comp_df['competency'] == 'digital_literacy']['rating_num'].mean() or 2.5
            features['creativity'] = comp_df[comp_df['competency'] == 'creativity']['rating_num'].mean() or 2.5
            features['citizenship'] = comp_df[comp_df['competency'] == 'citizenship']['rating_num'].mean() or 2.5
        else:
            features.update({'digital_literacy': 2.5, 'creativity': 2.5, 'citizenship': 2.5})

        # Portfolio evidence weighting
        features['arts_portfolio_pct'] = len(portfolio_df[portfolio_df['subject_name'].isin(arts_subjects)]) / max(len(portfolio_df), 1)
        features['stem_portfolio_pct'] = len(portfolio_df[portfolio_df['subject_name'].isin(stem_subjects)]) / max(len(portfolio_df), 1)

        return features
    finally:
        conn.close()
