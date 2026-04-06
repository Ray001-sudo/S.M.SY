const db = require('../config/database');
const { v4: uuid } = require('uuid');
const smsService = require('../services/sms.service');

exports.getHealthRecord = async (req, res, next) => {
  try {
    const r = await db('health_records').where({ student_id: req.params.student_id, school_id: req.school_id }).first();
    if (!r) return res.status(404).json({ error: 'No health record found' });
    res.json(r);
  } catch (err) { next(err); }
};
exports.upsertHealthRecord = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const exists = await db('health_records').where({ student_id, school_id: req.school_id }).first();
    let r;
    if (exists) { [r] = await db('health_records').where({ student_id, school_id: req.school_id }).update({ ...req.body, updated_at: new Date() }).returning('*'); }
    else { [r] = await db('health_records').insert({ id: uuid(), school_id: req.school_id, student_id, ...req.body }).returning('*'); }
    res.json(r);
  } catch (err) { next(err); }
};
exports.logVisit = async (req, res, next) => {
  try {
    const { student_id, presenting_complaint, diagnosis, medication_given, dosage, outcome, nurse_notes } = req.body;
    const [visit] = await db('infirmary_visits').insert({ id: uuid(), school_id: req.school_id, student_id, nurse_id: req.user.id, visit_time: new Date(), presenting_complaint, diagnosis, medication_given, dosage, outcome: outcome||'treated_returned', nurse_notes }).returning('*');
    const student = await db('students').where({ id: student_id, school_id: req.school_id }).first();
    const guardian = await db('guardians').where({ student_id, is_primary: true }).first();
    const school = await db('school_settings').where({ school_id: req.school_id }).first();
    const schoolName = school?.school_name || 'Shule360';
    if (guardian?.phone) {
      const outcomeMsg = { treated_returned:'treated and returned to class', sent_home:'sent home — please arrange pickup', referred_hospital:'referred to hospital — please contact us urgently', observation:'under observation' }[outcome] || 'seen by the nurse';
      await smsService.send(guardian.phone, `${schoolName} CLINIC: ${student?.full_name} visited the infirmary. Complaint: ${presenting_complaint}.${diagnosis ? ` Diagnosis: ${diagnosis}.` : ''}${medication_given ? ` Medication: ${medication_given}${dosage ? ` (${dosage})` : ''}.` : ''} Status: ${outcomeMsg}.`);
      await db('infirmary_visits').where({ id: visit.id }).update({ parent_notified: true, parent_notified_at: new Date() });
    }
    res.status(201).json({ ...visit, parent_notified: !!guardian?.phone });
  } catch (err) { next(err); }
};
exports.getVisits = async (req, res, next) => {
  try {
    const { student_id, page=1, limit=20 } = req.query;
    let q = db('infirmary_visits as iv').join('students as s','iv.student_id','s.id').leftJoin('staff as st','iv.nurse_id','st.id').where({'iv.school_id': req.school_id});
    if (student_id) q = q.where('iv.student_id', student_id);
    const visits = await q.select('iv.*','s.full_name as student_name','s.admission_number','st.full_name as nurse_name').orderBy('iv.visit_time','desc').limit(parseInt(limit)).offset((parseInt(page)-1)*parseInt(limit));
    res.json(visits);
  } catch (err) { next(err); }
};
exports.getStudentVisitHistory = async (req, res, next) => {
  try {
    const visits = await db('infirmary_visits as iv').leftJoin('staff as st','iv.nurse_id','st.id').where({'iv.student_id': req.params.student_id,'iv.school_id': req.school_id}).select('iv.*','st.full_name as nurse_name').orderBy('iv.visit_time','desc');
    res.json(visits);
  } catch (err) { next(err); }
};
exports.getHealthAlerts = async (req, res, next) => {
  try {
    const alerts = await db('health_records as hr').join('students as s','hr.student_id','s.id').where({'hr.school_id': req.school_id,'s.status':'active'}).where(q => q.whereNotNull('hr.allergies').orWhereNotNull('hr.chronic_conditions')).select('hr.*','s.full_name','s.admission_number','s.boarding_house','s.dormitory');
    res.json(alerts);
  } catch (err) { next(err); }
};
