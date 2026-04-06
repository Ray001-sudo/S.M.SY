const db = require('../config/database');
const axios = require('axios');
const logger = require('../utils/logger');
const smsService = require('../services/sms.service');

const AI_BASE = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ── Fetch risk scores for a school ───────────────────────
exports.getSchoolRiskDashboard = async (req, res, next) => {
  try {
    const { curriculum_mode, risk_category, limit = 50 } = req.query;
    let query = db('student_risk_scores as r')
      .join('students as s', 'r.student_id', 's.id')
      .leftJoin('streams as st', 's.stream_id', 'st.id')
      .leftJoin('cbe_pathways as p', 's.pathway_id', 'p.id')
      .where({ 'r.school_id': req.school_id, 's.status': 'active' })
      .whereRaw('r.computed_at = (SELECT MAX(r2.computed_at) FROM student_risk_scores r2 WHERE r2.student_id = r.student_id)');

    if (curriculum_mode) query = query.where('r.curriculum_mode', curriculum_mode);
    if (risk_category) query = query.where('r.risk_category', risk_category);

    const scores = await query
      .select(
        's.id as student_id', 's.full_name', 's.admission_number',
        's.curriculum_mode', 's.current_form', 's.current_grade',
        'st.name as stream_name', 'p.pathway_name',
        'r.risk_score', 'r.risk_category', 'r.top_factors',
        'r.eight_four_four_data', 'r.cbe_data', 'r.computed_at'
      )
      .orderBy('r.risk_score', 'desc')
      .limit(parseInt(limit));

    const summary = {
      critical: scores.filter(s => s.risk_category === 'critical').length,
      high: scores.filter(s => s.risk_category === 'high').length,
      medium: scores.filter(s => s.risk_category === 'medium').length,
      low: scores.filter(s => s.risk_category === 'low').length
    };

    res.json({ scores, summary });
  } catch (err) { next(err); }
};

exports.getStudentRiskScore = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const score = await db('student_risk_scores')
      .where({ student_id, school_id: req.school_id })
      .orderBy('computed_at', 'desc')
      .first();
    if (!score) return res.status(404).json({ error: 'No risk score computed yet' });
    res.json(score);
  } catch (err) { next(err); }
};

exports.triggerRiskCompute = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const student = await db('students').where({ id: student_id, school_id: req.school_id }).first();
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const response = await axios.post(`${AI_BASE}/predict/risk`, {
      student_id,
      school_id: req.school_id,
      curriculum_mode: student.curriculum_mode
    }, { headers: { 'X-API-Key': process.env.AI_SERVICE_API_KEY }, timeout: 15000 });

    res.json(response.data);
  } catch (err) {
    logger.error('AI service error:', err.message);
    res.status(502).json({ error: 'AI service unavailable. Risk scores are updated weekly.' });
  }
};

exports.getPathwayFitReport = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const student = await db('students').where({ id: student_id, school_id: req.school_id }).first();
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (student.curriculum_mode !== 'cbe') {
      return res.status(400).json({ error: 'Pathway fit only available for CBE students' });
    }
    if (student.current_grade !== 9) {
      return res.status(400).json({ error: 'Pathway fit recommendation activates in Grade 9' });
    }

    const existing = await db('pathway_recommendations')
      .where({ student_id, school_id: req.school_id })
      .orderBy('generated_at', 'desc').first();

    if (existing) return res.json(existing);

    // Request from AI service
    try {
      const response = await axios.post(`${AI_BASE}/predict/pathway`, {
        student_id, school_id: req.school_id
      }, { headers: { 'X-API-Key': process.env.AI_SERVICE_API_KEY }, timeout: 20000 });
      res.json(response.data);
    } catch (aiErr) {
      logger.error('Pathway AI error:', aiErr.message);
      res.status(502).json({ error: 'AI service unavailable' });
    }
  } catch (err) { next(err); }
};

// ── Weekly risk recompute (called by scheduler) ───────────
exports.weeklyBatchRecompute = async (schoolId) => {
  try {
    const response = await axios.post(`${AI_BASE}/batch/risk`, {
      school_id: schoolId
    }, { headers: { 'X-API-Key': process.env.AI_SERVICE_API_KEY }, timeout: 120000 });

    // After recompute, alert teachers and parents of new high-risk students
    const highRisk = await db('student_risk_scores as r')
      .join('students as s', 'r.student_id', 's.id')
      .where({ 'r.school_id': schoolId, 's.status': 'active' })
      .whereIn('r.risk_category', ['high', 'critical'])
      .whereRaw("r.computed_at > NOW() - INTERVAL '25 hours'")
      .select('s.id as student_id', 's.full_name', 'r.risk_category');

    for (const student of highRisk) {
      const guardian = await db('guardians')
        .where({ student_id: student.student_id, is_primary: true }).first();
      if (guardian?.phone) {
        await smsService.send(guardian.phone,
          smsService.templates.riskAlert(student.full_name)
        );
      }
    }

    logger.info(`Weekly risk recompute complete for school ${schoolId}: ${response.data.processed} students`);
    return response.data;
  } catch (err) {
    logger.error(`Batch risk compute failed for ${schoolId}:`, err.message);
  }
};
