const db = require('../config/database');
const { v4: uuid } = require('uuid');

// Auto-detect curriculum mode from intake year
function detectCurriculumMode(intakeYear, levelOrForm) {
  if (levelOrForm && String(levelOrForm).startsWith('Form')) return 'eight_four_four';
  if (intakeYear && intakeYear <= 2023) return 'eight_four_four';
  return 'cbe';
}

exports.getAll = async (req, res, next) => {
  try {
    const { curriculum_mode, status, form, grade, stream_id, pathway_id, page = 1, limit = 50 } = req.query;
    let query = db('students as s')
      .leftJoin('streams as st', 's.stream_id', 'st.id')
      .leftJoin('cbe_pathways as p', 's.pathway_id', 'p.id')
      .where('s.school_id', req.school_id)
      .select(
        's.*',
        'st.name as stream_name',
        'p.pathway_name'
      );

    if (curriculum_mode) query = query.where('s.curriculum_mode', curriculum_mode);
    if (status) query = query.where('s.status', status);
    if (form) query = query.where('s.current_form', form);
    if (grade) query = query.where('s.current_grade', parseInt(grade));
    if (stream_id) query = query.where('s.stream_id', stream_id);
    if (pathway_id) query = query.where('s.pathway_id', pathway_id);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [data, countResult] = await Promise.all([
      query.clone().orderBy('s.full_name').limit(parseInt(limit)).offset(offset),
      query.clone().count('s.id as total').first()
    ]);

    res.json({
      data,
      pagination: {
        total: parseInt(countResult.total),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const student = await db('students as s')
      .leftJoin('streams as st', 's.stream_id', 'st.id')
      .leftJoin('cbe_pathways as p', 's.pathway_id', 'p.id')
      .where({ 's.id': req.params.id, 's.school_id': req.school_id })
      .select('s.*', 'st.name as stream_name', 'p.pathway_name')
      .first();

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [guardians, health, riskScore] = await Promise.all([
      db('guardians').where({ student_id: student.id }),
      db('student_health').where({ student_id: student.id }).first(),
      db('student_risk_scores')
        .where({ student_id: student.id })
        .orderBy('computed_at', 'desc')
        .first()
    ]);

    res.json({ ...student, guardians, health, risk_score: riskScore });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const {
      admission_number, full_name, date_of_birth, gender,
      current_form, stream_id, kcpe_index, kcpe_score,
      current_grade, school_level, pathway_id, kpsea_score,
      boarding_house, dormitory, bed_number,
      bursary_status, bursary_amount, bursary_source,
      intake_year, guardians: guardiansData = []
    } = req.body;

    const curriculum_mode = detectCurriculumMode(intake_year, current_form || (current_grade ? `Grade ${current_grade}` : null));

    const [student] = await db('students').insert({
      id: uuid(),
      school_id: req.school_id,
      admission_number, full_name, date_of_birth, gender,
      curriculum_mode,
      current_form: curriculum_mode === 'eight_four_four' ? current_form : null,
      stream_id: curriculum_mode === 'eight_four_four' ? stream_id : null,
      kcpe_index, kcpe_score,
      current_grade: curriculum_mode === 'cbe' ? current_grade : null,
      school_level: curriculum_mode === 'cbe' ? school_level : null,
      pathway_id: curriculum_mode === 'cbe' ? pathway_id : null,
      kpsea_score,
      boarding_house, dormitory, bed_number,
      bursary_status: bursary_status || false,
      bursary_amount: bursary_amount || 0,
      bursary_source,
      intake_year,
      status: 'active'
    }).returning('*');

    // Insert guardians
    if (guardiansData.length > 0) {
      await db('guardians').insert(
        guardiansData.map(g => ({ id: uuid(), school_id: req.school_id, student_id: student.id, ...g }))
      );
    }

    res.status(201).json(student);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Admission number already exists' });
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const [updated] = await db('students')
      .where({ id: req.params.id, school_id: req.school_id })
      .update({ ...req.body, updated_at: new Date() })
      .returning('*');
    if (!updated) return res.status(404).json({ error: 'Student not found' });
    res.json(updated);
  } catch (err) { next(err); }
};

exports.bulkImport = async (req, res, next) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'students array required' });
    }
    const results = { created: 0, skipped: 0, errors: [] };
    const trx = await db.transaction();
    try {
      for (const s of students) {
        try {
          const curriculum_mode = detectCurriculumMode(s.intake_year, s.current_form);
          await trx('students').insert({ id: uuid(), school_id: req.school_id, curriculum_mode, ...s });
          results.created++;
        } catch (e) {
          results.skipped++;
          results.errors.push({ admission: s.admission_number, error: e.message });
        }
      }
      await trx.commit();
    } catch (e) { await trx.rollback(); throw e; }
    res.json(results);
  } catch (err) { next(err); }
};

exports.getStats = async (req, res, next) => {
  try {
    const [byMode, byStatus, byForm, byGrade] = await Promise.all([
      db('students').where({ school_id: req.school_id }).groupBy('curriculum_mode').select('curriculum_mode').count('id as count'),
      db('students').where({ school_id: req.school_id }).groupBy('status').select('status').count('id as count'),
      db('students').where({ school_id: req.school_id, curriculum_mode: 'eight_four_four', status: 'active' }).groupBy('current_form').select('current_form').count('id as count'),
      db('students').where({ school_id: req.school_id, curriculum_mode: 'cbe', status: 'active' }).groupBy('current_grade').select('current_grade').count('id as count').orderBy('current_grade'),
    ]);
    res.json({ by_curriculum_mode: byMode, by_status: byStatus, by_form_844: byForm, by_grade_cbe: byGrade });
  } catch (err) { next(err); }
};
