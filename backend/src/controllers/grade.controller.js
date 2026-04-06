const db = require('../config/database');
const { v4: uuid } = require('uuid');

// Compute 8-4-4 letter grade from percentage
function computeLetterGrade(score, maxScore) {
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return 'A';
  if (pct >= 75) return 'A-';
  if (pct >= 70) return 'B+';
  if (pct >= 65) return 'B';
  if (pct >= 60) return 'B-';
  if (pct >= 55) return 'C+';
  if (pct >= 50) return 'C';
  if (pct >= 45) return 'C-';
  if (pct >= 40) return 'D+';
  if (pct >= 35) return 'D';
  if (pct >= 30) return 'D-';
  return 'E';
}

// Compute CBE competency rating from percentage
function computeCompetencyRating(score, maxScore) {
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return 'EE';
  if (pct >= 50) return 'ME';
  if (pct >= 30) return 'AE';
  return 'BE';
}

exports.recordGrade = async (req, res, next) => {
  try {
    const {
      student_id, subject_id, strand_id,
      assessment_type, raw_score, max_score,
      competency_rating, term, academic_year, assessment_date, comments
    } = req.body;

    const student = await db('students').where({ id: student_id, school_id: req.school_id }).first();
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Auto-compute derived fields
    const derivedRating = student.curriculum_mode === 'cbe'
      ? (competency_rating || computeCompetencyRating(raw_score, max_score))
      : null;

    const [assessment] = await db('assessments').insert({
      id: uuid(),
      school_id: req.school_id,
      student_id, subject_id,
      strand_id: student.curriculum_mode === 'cbe' ? strand_id : null,
      teacher_id: req.user.id,
      curriculum_mode: student.curriculum_mode,
      assessment_type, raw_score, max_score,
      competency_rating: derivedRating,
      term, academic_year, assessment_date: assessment_date || new Date(),
      comments
    }).returning('*');

    // Attach computed fields for response
    assessment.percentage = ((raw_score / max_score) * 100).toFixed(1);
    if (student.curriculum_mode === 'eight_four_four') {
      assessment.letter_grade = computeLetterGrade(raw_score, max_score);
    }

    res.status(201).json(assessment);
  } catch (err) { next(err); }
};

exports.bulkRecord = async (req, res, next) => {
  try {
    const { assessments } = req.body;
    const trx = await db.transaction();
    try {
      const records = assessments.map(a => {
        const student = req.body._students?.find(s => s.id === a.student_id);
        return { id: uuid(), school_id: req.school_id, teacher_id: req.user.id, ...a };
      });
      await trx('assessments').insert(records);
      await trx.commit();
      res.status(201).json({ inserted: records.length });
    } catch (e) { await trx.rollback(); throw e; }
  } catch (err) { next(err); }
};

exports.getStudentGrades = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { term, academic_year, subject_id, assessment_type } = req.query;

    let query = db('assessments as a')
      .join('subjects as s', 'a.subject_id', 's.id')
      .leftJoin('cbe_strands as cs', 'a.strand_id', 'cs.id')
      .where({ 'a.student_id': student_id, 'a.school_id': req.school_id });

    if (term) query = query.where('a.term', parseInt(term));
    if (academic_year) query = query.where('a.academic_year', parseInt(academic_year));
    if (subject_id) query = query.where('a.subject_id', subject_id);
    if (assessment_type) query = query.where('a.assessment_type', assessment_type);

    const grades = await query
      .select('a.*', 's.name as subject_name', 's.code as subject_code',
               'cs.strand_name', 'cs.sub_strand_name')
      .orderBy('a.assessment_date', 'desc');

    // Compute derived fields
    const enriched = grades.map(g => ({
      ...g,
      percentage: g.max_score ? ((g.raw_score / g.max_score) * 100).toFixed(1) : null,
      letter_grade: g.curriculum_mode === 'eight_four_four' ? computeLetterGrade(g.raw_score, g.max_score) : null
    }));

    res.json(enriched);
  } catch (err) { next(err); }
};

exports.getClassPerformance = async (req, res, next) => {
  try {
    const { stream_id, grade, subject_id, term, academic_year } = req.query;

    let studentQuery = db('students').where({ school_id: req.school_id, status: 'active' });
    if (stream_id) studentQuery = studentQuery.where('stream_id', stream_id);
    if (grade) studentQuery = studentQuery.where('current_grade', parseInt(grade));

    const students = await studentQuery.select('id', 'full_name', 'curriculum_mode');

    const grades = await db('assessments')
      .whereIn('student_id', students.map(s => s.id))
      .where({ school_id: req.school_id, subject_id, term: parseInt(term), academic_year: parseInt(academic_year) })
      .select('student_id', 'assessment_type', 'raw_score', 'max_score', 'competency_rating');

    // Aggregate per student
    const performance = students.map(s => {
      const sGrades = grades.filter(g => g.student_id === s.id);
      const avg = sGrades.length
        ? (sGrades.reduce((sum, g) => sum + (g.raw_score / g.max_score * 100), 0) / sGrades.length).toFixed(1)
        : null;
      return { ...s, average_percentage: avg, assessment_count: sGrades.length };
    }).sort((a, b) => (b.average_percentage || 0) - (a.average_percentage || 0));

    res.json(performance);
  } catch (err) { next(err); }
};

exports.getSubjectSummary = async (req, res, next) => {
  try {
    const { term, academic_year } = req.query;
    const summary = await db('assessments as a')
      .join('subjects as s', 'a.subject_id', 's.id')
      .join('students as st', 'a.student_id', 'st.id')
      .where({ 'a.school_id': req.school_id, 'st.status': 'active' })
      .where('a.term', parseInt(term))
      .where('a.academic_year', parseInt(academic_year))
      .groupBy('a.subject_id', 's.name', 'a.curriculum_mode')
      .select('a.subject_id', 's.name as subject_name', 'a.curriculum_mode')
      .avg('a.raw_score / a.max_score * 100 as avg_percentage')
      .count('a.id as total_assessments');

    res.json(summary);
  } catch (err) { next(err); }
};
