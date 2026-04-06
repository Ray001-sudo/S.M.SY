const db = require('../config/database');
const { v4: uuid } = require('uuid');
const smsService = require('../services/sms.service');

exports.getStudentPortfolio = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { subject_id, term, academic_year, review_status } = req.query;

    let query = db('student_portfolios as sp')
      .leftJoin('subjects as s', 'sp.subject_id', 's.id')
      .leftJoin('cbe_strands as cs', 'sp.strand_id', 'cs.id')
      .leftJoin('staff as st', 'sp.reviewed_by', 'st.id')
      .where({ 'sp.student_id': student_id, 'sp.school_id': req.school_id });

    if (subject_id) query = query.where('sp.subject_id', subject_id);
    if (term) query = query.where('sp.term', parseInt(term));
    if (academic_year) query = query.where('sp.academic_year', parseInt(academic_year));
    if (review_status) query = query.where('sp.review_status', review_status);

    const items = await query
      .select(
        'sp.*',
        's.name as subject_name',
        'cs.strand_name',
        'cs.sub_strand_name',
        'st.full_name as reviewer_name'
      )
      .orderBy('sp.created_at', 'desc');

    const stats = {
      total: items.length,
      pending: items.filter(i => i.review_status === 'pending').length,
      reviewed: items.filter(i => i.review_status === 'reviewed').length,
      by_subject: items.reduce((acc, i) => {
        acc[i.subject_name] = (acc[i.subject_name] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({ items, stats });
  } catch (err) { next(err); }
};

exports.addPortfolioItem = async (req, res, next) => {
  try {
    const {
      student_id, subject_id, strand_id,
      title, description, student_reflection,
      evidence_type, file_url, external_link,
      file_size_kb, term, academic_year
    } = req.body;

    // Verify student is CBE
    const student = await db('students')
      .where({ id: student_id, school_id: req.school_id })
      .first();
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (student.curriculum_mode !== 'cbe') {
      return res.status(400).json({ error: 'Portfolios are only available for CBE students' });
    }

    const [item] = await db('student_portfolios').insert({
      id: uuid(),
      school_id: req.school_id,
      student_id, subject_id, strand_id,
      title, description, student_reflection,
      evidence_type, file_url, external_link,
      file_size_kb,
      review_status: 'pending',
      term, academic_year
    }).returning('*');

    res.status(201).json(item);
  } catch (err) { next(err); }
};

exports.reviewPortfolioItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { teacher_feedback, competency_ratings, review_status } = req.body;

    const item = await db('student_portfolios')
      .where({ id, school_id: req.school_id })
      .first();
    if (!item) return res.status(404).json({ error: 'Portfolio item not found' });

    const [updated] = await db('student_portfolios')
      .where({ id })
      .update({
        teacher_feedback,
        competency_ratings: JSON.stringify(competency_ratings || {}),
        review_status: review_status || 'reviewed',
        reviewed_by: req.user.id,
        reviewed_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    // Notify parent
    const guardian = await db('guardians')
      .where({ student_id: item.student_id, is_primary: true })
      .first();
    const student = await db('students').where({ id: item.student_id }).first();
    if (guardian?.phone) {
      await smsService.send(
        guardian.phone,
        `Shule360: A teacher has reviewed ${student.full_name}'s portfolio item "${item.title}". Log in to the parent portal to view feedback.`
      );
    }

    res.json(updated);
  } catch (err) { next(err); }
};

exports.getPendingReviews = async (req, res, next) => {
  try {
    const pending = await db('student_portfolios as sp')
      .join('students as s', 'sp.student_id', 's.id')
      .join('subjects as sub', 'sp.subject_id', 'sub.id')
      .where({ 'sp.school_id': req.school_id, 'sp.review_status': 'pending' })
      .select(
        'sp.id', 'sp.title', 'sp.evidence_type', 'sp.created_at',
        's.full_name as student_name', 's.admission_number',
        'sub.name as subject_name'
      )
      .orderBy('sp.created_at', 'asc');
    res.json(pending);
  } catch (err) { next(err); }
};

exports.getCompetencyProfile = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { academic_year } = req.query;

    const ratings = await db('student_portfolios')
      .where({ student_id, school_id: req.school_id })
      .whereNotNull('competency_ratings')
      .select('competency_ratings', 'term', 'academic_year');

    // Aggregate competency ratings across all reviewed portfolio items
    const profile = {};
    ratings.forEach(r => {
      const cr = typeof r.competency_ratings === 'string'
        ? JSON.parse(r.competency_ratings)
        : r.competency_ratings;
      Object.entries(cr || {}).forEach(([comp, rating]) => {
        if (!profile[comp]) profile[comp] = { EE: 0, ME: 0, AE: 0, BE: 0 };
        profile[comp][rating] = (profile[comp][rating] || 0) + 1;
      });
    });

    // Also get formal competency ratings from core_competency_ratings
    const formalRatings = await db('core_competency_ratings')
      .where({ student_id, school_id: req.school_id })
      .modify(q => { if (academic_year) q.where('academic_year', parseInt(academic_year)); })
      .orderBy('term');

    res.json({ portfolio_competency_evidence: profile, formal_ratings: formalRatings });
  } catch (err) { next(err); }
};
