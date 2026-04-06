// ── staff.controller.js ───────────────────────────────────
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

exports.staffController = {
  getAll: async (req, res, next) => {
    try {
      const staff = await db('staff')
        .where({ school_id: req.school_id })
        .select('id','full_name','email','phone','role','tsc_number','is_active','last_login')
        .orderBy('full_name');
      res.json(staff);
    } catch (err) { next(err); }
  },
  create: async (req, res, next) => {
    try {
      const { full_name, email, phone, role, tsc_number, national_id, password } = req.body;
      const hash = await bcrypt.hash(password || 'Shule360!Change', 12);
      const [staff] = await db('staff').insert({
        id: uuid(), school_id: req.school_id,
        full_name, email, phone, role, tsc_number, national_id,
        password_hash: hash, is_active: true
      }).returning('id','full_name','email','role');
      res.status(201).json(staff);
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
      next(err);
    }
  },
  update: async (req, res, next) => {
    try {
      const { password, ...updates } = req.body;
      if (password) updates.password_hash = await bcrypt.hash(password, 12);
      const [updated] = await db('staff')
        .where({ id: req.params.id, school_id: req.school_id })
        .update({ ...updates, updated_at: new Date() })
        .returning('id','full_name','email','role');
      if (!updated) return res.status(404).json({ error: 'Staff not found' });
      res.json(updated);
    } catch (err) { next(err); }
  }
};

module.exports.staffController = exports.staffController;

// ── mpesa.controller.js ───────────────────────────────────
const mpesaService = require('../services/mpesa.service');

exports.mpesaController = {
  initiateStkPush: async (req, res, next) => {
    try {
      const { phone, amount, invoice_id } = req.body;
      const invoice = await db('fee_invoices').where({ id: invoice_id, school_id: req.school_id }).first();
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
      const student = await db('students').where({ id: invoice.student_id }).first();
      const result = await mpesaService.stkPush({
        phone, amount,
        accountRef: student.admission_number,
        description: `Fee payment — ${student.full_name}`
      });
      res.json(result);
    } catch (err) { next(err); }
  }
};

// ── competency.controller.js ──────────────────────────────
exports.competencyController = {
  rateCompetency: async (req, res, next) => {
    try {
      const { student_id, competency, rating, teacher_notes, term, academic_year } = req.body;
      const student = await db('students').where({ id: student_id, school_id: req.school_id }).first();
      if (!student || student.curriculum_mode !== 'cbe') {
        return res.status(400).json({ error: 'Competency ratings only for CBE students' });
      }
      const existing = await db('core_competency_ratings')
        .where({ student_id, competency, term, academic_year, school_id: req.school_id }).first();
      let record;
      if (existing) {
        [record] = await db('core_competency_ratings').where({ id: existing.id })
          .update({ rating, teacher_notes, teacher_id: req.user.id, updated_at: new Date() })
          .returning('*');
      } else {
        [record] = await db('core_competency_ratings').insert({
          id: uuid(), school_id: req.school_id,
          student_id, teacher_id: req.user.id,
          competency, rating, teacher_notes, term, academic_year
        }).returning('*');
      }
      res.status(201).json(record);
    } catch (err) { next(err); }
  },
  getStudentCompetencies: async (req, res, next) => {
    try {
      const { student_id } = req.params;
      const { academic_year } = req.query;
      let q = db('core_competency_ratings').where({ student_id, school_id: req.school_id });
      if (academic_year) q = q.where('academic_year', parseInt(academic_year));
      const ratings = await q.orderBy('term').orderBy('competency');
      res.json(ratings);
    } catch (err) { next(err); }
  },
  getClassCompetencySummary: async (req, res, next) => {
    try {
      const { stream_id, grade, term, academic_year } = req.query;
      let sQ = db('students').where({ school_id: req.school_id, status: 'active', curriculum_mode: 'cbe' });
      if (stream_id) sQ = sQ.where('stream_id', stream_id);
      if (grade) sQ = sQ.where('current_grade', parseInt(grade));
      const students = await sQ.pluck('id');
      const ratings = await db('core_competency_ratings')
        .whereIn('student_id', students)
        .where({ school_id: req.school_id, term: parseInt(term), academic_year: parseInt(academic_year) })
        .groupBy('competency','rating').select('competency','rating').count('id as count');
      res.json(ratings);
    } catch (err) { next(err); }
  }
};

// ── admin.controller.js ───────────────────────────────────
exports.adminController = {
  getSchool: async (req, res, next) => {
    try {
      const school = await db('schools').where({ id: req.school_id }).first();
      if (!school) return res.status(404).json({ error: 'School not found' });
      // Don't expose encrypted keys
      delete school.mpesa_passkey_encrypted;
      delete school.at_api_key_encrypted;
      res.json(school);
    } catch (err) { next(err); }
  },
  updateSchool: async (req, res, next) => {
    try {
      const { name, school_type, county, sub_county, postal_address, phone, email,
        mpesa_paybill, active_curricula, cbe_pathways_offered } = req.body;
      const [updated] = await db('schools').where({ id: req.school_id })
        .update({ name, school_type, county, sub_county, postal_address, phone, email,
          mpesa_paybill, active_curricula, cbe_pathways_offered, updated_at: new Date() })
        .returning('id','name','school_type','county','mpesa_paybill','active_curricula','cbe_pathways_offered');
      res.json(updated);
    } catch (err) { next(err); }
  },
  getSubjects: async (req, res, next) => {
    try {
      const subjects = await db('subjects').where({ school_id: req.school_id, is_active: true }).orderBy('name');
      res.json(subjects);
    } catch (err) { next(err); }
  },
  createSubject: async (req, res, next) => {
    try {
      const [s] = await db('subjects').insert({ id: uuid(), school_id: req.school_id, ...req.body }).returning('*');
      res.status(201).json(s);
    } catch (err) { next(err); }
  },
  getStreams: async (req, res, next) => {
    try {
      const streams = await db('streams').where({ school_id: req.school_id }).orderBy('form').orderBy('name');
      res.json(streams);
    } catch (err) { next(err); }
  },
  createStream: async (req, res, next) => {
    try {
      const [s] = await db('streams').insert({ id: uuid(), school_id: req.school_id, ...req.body }).returning('*');
      res.status(201).json(s);
    } catch (err) { next(err); }
  },
  getPathways: async (req, res, next) => {
    try {
      const pathways = await db('cbe_pathways').where({ school_id: req.school_id });
      res.json(pathways);
    } catch (err) { next(err); }
  },
  createPathway: async (req, res, next) => {
    try {
      const [p] = await db('cbe_pathways').insert({ id: uuid(), school_id: req.school_id, ...req.body }).returning('*');
      res.status(201).json(p);
    } catch (err) { next(err); }
  }
};

// ── report.controller.js ──────────────────────────────────
exports.reportController = {
  generateReportCard: async (req, res, next) => {
    try {
      const { student_id } = req.params;
      const { term, academic_year } = req.query;
      const student = await db('students as s')
        .leftJoin('streams as st', 's.stream_id', 'st.id')
        .where({ 's.id': student_id, 's.school_id': req.school_id })
        .select('s.*', 'st.name as stream_name').first();
      if (!student) return res.status(404).json({ error: 'Student not found' });

      const [grades, attendance, feeBalance, competencies] = await Promise.all([
        db('assessments as a').join('subjects as s', 'a.subject_id', 's.id')
          .where({ 'a.student_id': student_id, 'a.term': parseInt(term), 'a.academic_year': parseInt(academic_year) })
          .select('a.*', 's.name as subject_name'),
        db('attendance').where({ student_id, term: parseInt(term), academic_year: parseInt(academic_year) })
          .select('status').count('id as count').groupBy('status'),
        db('fee_invoices').where({ student_id, term: parseInt(term), academic_year: parseInt(academic_year) }).first(),
        student.curriculum_mode === 'cbe'
          ? db('core_competency_ratings').where({ student_id, term: parseInt(term), academic_year: parseInt(academic_year) })
          : Promise.resolve([])
      ]);

      res.json({
        student,
        curriculum_mode: student.curriculum_mode,
        term: parseInt(term),
        academic_year: parseInt(academic_year),
        grades,
        attendance_summary: attendance,
        fee_balance: feeBalance,
        competency_ratings: competencies
      });
    } catch (err) { next(err); }
  },
  schoolPerformance: async (req, res, next) => {
    try {
      const { term, academic_year } = req.query;
      const data = await db('assessments as a')
        .join('subjects as s', 'a.subject_id', 's.id')
        .where({ 'a.school_id': req.school_id, 'a.term': parseInt(term), 'a.academic_year': parseInt(academic_year) })
        .groupBy('a.subject_id', 's.name', 'a.curriculum_mode')
        .select('s.name', 'a.curriculum_mode')
        .avg('a.raw_score / a.max_score * 100 as avg_pct')
        .count('a.id as assessments');
      res.json(data);
    } catch (err) { next(err); }
  },
  feeStatement: async (req, res, next) => {
    try {
      const { student_id } = req.params;
      const invoices = await db('fee_invoices').where({ student_id, school_id: req.school_id }).orderBy('academic_year').orderBy('term');
      const payments = await db('fee_payments').where({ student_id, school_id: req.school_id }).orderBy('payment_date');
      res.json({ invoices, payments });
    } catch (err) { next(err); }
  }
};
