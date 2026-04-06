const db = require('../config/database');
const { v4: uuid } = require('uuid');
const smsService = require('../services/sms.service');

exports.markAttendance = async (req, res, next) => {
  try {
    const { records, subject_id, lesson_date, period, term, academic_year } = req.body;
    // records: [{student_id, status, notes}]

    const trx = await db.transaction();
    try {
      const rows = records.map(r => ({
        id: uuid(),
        school_id: req.school_id,
        student_id: r.student_id,
        subject_id, teacher_id: req.user.id,
        lesson_date, period, term, academic_year,
        status: r.status,
        notes: r.notes || null
      }));

      // Upsert — replace if same student/subject/date/period
      await trx.raw(`
        INSERT INTO attendance (id, school_id, student_id, subject_id, teacher_id, lesson_date, period, term, academic_year, status, notes)
        VALUES ${rows.map(() => '(?,?,?,?,?,?,?,?,?,?,?)').join(',')}
        ON CONFLICT (student_id, subject_id, lesson_date, period) DO UPDATE
          SET status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = NOW()
      `, rows.flatMap(r => [r.id, r.school_id, r.student_id, r.subject_id, r.teacher_id, r.lesson_date, r.period, r.term, r.academic_year, r.status, r.notes]));

      await trx.commit();

      // Alert parents of absent students
      const absentStudentIds = records.filter(r => r.status === 'absent').map(r => r.student_id);
      if (absentStudentIds.length > 0) {
        await alertAbsentParents(absentStudentIds, req.school_id, lesson_date);
      }

      res.status(201).json({ marked: rows.length });
    } catch (e) { await trx.rollback(); throw e; }
  } catch (err) { next(err); }
};

async function alertAbsentParents(studentIds, schoolId, date) {
  for (const studentId of studentIds) {
    // Check consecutive absences
    const recentAbsences = await db('attendance')
      .where({ student_id: studentId, school_id: schoolId, status: 'absent' })
      .where('lesson_date', '>=', db.raw("NOW() - INTERVAL '7 days'"))
      .count('id as count')
      .first();

    if (parseInt(recentAbsences.count) >= 3) {
      const student = await db('students').where({ id: studentId }).first();
      const guardian = await db('guardians').where({ student_id: studentId, is_primary: true }).first();
      if (guardian?.phone) {
        await smsService.send(guardian.phone,
          `Shule360: ${student.full_name} has been absent 3 or more times this week. Please contact the school.`
        );
      }
    }
  }
}

exports.getStudentAttendance = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { term, academic_year, subject_id } = req.query;

    let query = db('attendance as a')
      .join('subjects as s', 'a.subject_id', 's.id')
      .where({ 'a.student_id': student_id, 'a.school_id': req.school_id });

    if (term) query = query.where('a.term', parseInt(term));
    if (academic_year) query = query.where('a.academic_year', parseInt(academic_year));
    if (subject_id) query = query.where('a.subject_id', subject_id);

    const records = await query
      .select('a.*', 's.name as subject_name')
      .orderBy('a.lesson_date', 'desc');

    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const late = records.filter(r => r.status === 'late').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const excused = records.filter(r => r.status === 'excused').length;

    const attendanceRate = total > 0
      ? (((present + late + excused) / total) * 100).toFixed(1)
      : null;

    res.json({
      records,
      summary: { total, present, late, absent, excused, attendance_rate: attendanceRate }
    });
  } catch (err) { next(err); }
};

exports.getClassAttendanceSummary = async (req, res, next) => {
  try {
    const { stream_id, grade, subject_id, term, academic_year } = req.query;

    let studentQuery = db('students').where({ school_id: req.school_id, status: 'active' });
    if (stream_id) studentQuery = studentQuery.where('stream_id', stream_id);
    if (grade) studentQuery = studentQuery.where('current_grade', parseInt(grade));
    const students = await studentQuery.select('id', 'full_name', 'admission_number');

    const attendanceData = await db('attendance')
      .whereIn('student_id', students.map(s => s.id))
      .where({ school_id: req.school_id, term: parseInt(term), academic_year: parseInt(academic_year) })
      .modify(q => { if (subject_id) q.where('subject_id', subject_id); })
      .select('student_id', 'status')
      .count('id as count')
      .groupBy('student_id', 'status');

    const summary = students.map(s => {
      const sData = attendanceData.filter(d => d.student_id === s.id);
      const total = sData.reduce((sum, d) => sum + parseInt(d.count), 0);
      const present = parseInt(sData.find(d => d.status === 'present')?.count || 0);
      const absent = parseInt(sData.find(d => d.status === 'absent')?.count || 0);
      const rate = total > 0 ? ((present / total) * 100).toFixed(1) : '0';
      return { ...s, total_lessons: total, present, absent, attendance_rate: rate, at_risk: parseFloat(rate) < 80 };
    });

    res.json(summary.sort((a, b) => parseFloat(a.attendance_rate) - parseFloat(b.attendance_rate)));
  } catch (err) { next(err); }
};
