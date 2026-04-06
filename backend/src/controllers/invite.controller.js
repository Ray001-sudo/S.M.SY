const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const crypto = require('crypto');
const smsService = require('../services/sms.service');

exports.createToken = async (req, res, next) => {
  try {
    const { role, intended_name, intended_phone, intended_email, linked_student_id } = req.body;
    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 7*24*3600*1000);
    const [inv] = await db('invitation_tokens').insert({ id: uuid(), school_id: req.school_id, token, role, intended_name, intended_phone, intended_email, linked_student_id: linked_student_id||null, expires_at: expires, created_by: req.user.id }).returning('*');
    if (intended_phone) {
      const school = await db('school_settings').where({ school_id: req.school_id }).first();
      await smsService.send(intended_phone, `${school?.school_name||'School'}: Your Shule360 registration token: ${token.slice(0,12).toUpperCase()} Valid 7 days.`).catch(() => {});
    }
    res.status(201).json({ ...inv, token: token.slice(0,8) + '...' });
  } catch (err) { next(err); }
};
exports.bulkUpload = async (req, res, next) => {
  try {
    const { upload_type, rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'rows array required' });
    const [job] = await db('bulk_upload_jobs').insert({ id: uuid(), school_id: req.school_id, uploaded_by: req.user.id, upload_type, total_rows: rows.length, status: 'processing' }).returning('*');
    let success=0, errors=[];
    for (const row of rows) {
      try {
        const token = crypto.randomBytes(24).toString('hex');
        let linkedStudentId = null;
        if (row.student_admission_number) { const stu = await db('students').where({ school_id: req.school_id, admission_number: row.student_admission_number }).first(); linkedStudentId = stu?.id||null; }
        await db('invitation_tokens').insert({ id: uuid(), school_id: req.school_id, token, role: row.role||'guardian', intended_name: row.name, intended_phone: row.phone, intended_email: row.email, linked_student_id: linkedStudentId, expires_at: new Date(Date.now()+30*24*3600*1000), created_by: req.user.id });
        if (row.phone) {
          const school = await db('school_settings').where({ school_id: req.school_id }).first();
          await smsService.send(row.phone, `${school?.school_name||'School'}: Welcome to Shule360! Token: ${token.slice(0,12).toUpperCase()}`).catch(() => {});
        }
        success++;
      } catch (e) { errors.push({ row: row.name, error: e.message }); }
    }
    await db('bulk_upload_jobs').where({ id: job.id }).update({ processed: rows.length, success_count: success, error_count: errors.length, errors: JSON.stringify(errors), status: 'completed', sms_sent: true, updated_at: new Date() });
    res.json({ job_id: job.id, success, errors: errors.length, details: errors });
  } catch (err) { next(err); }
};
exports.registerWithToken = async (req, res, next) => {
  try {
    const { token, full_name, email, phone, password, school_id } = req.body;
    if (!token) {
      const hash = await bcrypt.hash(password, 12);
      await db('pending_accounts').insert({ id: uuid(), school_id, full_name, email, phone, requested_role: req.body.role||'guardian', password_hash: hash, status: 'pending' });
      return res.status(202).json({ message: 'Account request submitted. An administrator will review your access.', status: 'pending_review' });
    }
    const inv = await db('invitation_tokens').where({ token: token.toLowerCase(), school_id }).where('is_used', false).where('expires_at', '>', new Date()).first();
    if (!inv) return res.status(400).json({ error: 'Invalid or expired invitation token.' });
    const hash = await bcrypt.hash(password, 12);
    const userId = uuid();
    const trx = await db.transaction();
    try {
      if (inv.role === 'guardian') await trx('guardians').insert({ id: userId, school_id: inv.school_id, student_id: inv.linked_student_id, full_name: full_name||inv.intended_name, phone: phone||inv.intended_phone, email: email||inv.intended_email, relationship: 'guardian', is_primary: true, password_hash: hash, portal_access: true });
      else await trx('staff').insert({ id: userId, school_id: inv.school_id, full_name: full_name||inv.intended_name, email: email||inv.intended_email, phone: phone||inv.intended_phone, role: inv.role, password_hash: hash, is_active: true });
      await trx('invitation_tokens').where({ id: inv.id }).update({ is_used: true, used_at: new Date() });
      await trx.commit();
    } catch (e) { await trx.rollback(); throw e; }
    res.status(201).json({ message: 'Account created. You can now log in.' });
  } catch (err) { if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' }); next(err); }
};
exports.getPendingAccounts = async (req, res, next) => {
  try { res.json(await db('pending_accounts').where({ school_id: req.school_id, status: 'pending' }).orderBy('created_at','asc')); } catch (err) { next(err); }
};
exports.reviewPendingAccount = async (req, res, next) => {
  try {
    const { id } = req.params; const { action, role } = req.body;
    const p = await db('pending_accounts').where({ id, school_id: req.school_id }).first();
    if (!p) return res.status(404).json({ error: 'Not found' });
    if (action === 'approve') {
      await db('staff').insert({ id: uuid(), school_id: req.school_id, full_name: p.full_name, email: p.email, phone: p.phone, role: role||p.requested_role, password_hash: p.password_hash, is_active: true });
      if (p.phone) await smsService.send(p.phone, 'Shule360: Your account has been approved. You can now log in.').catch(() => {});
    }
    await db('pending_accounts').where({ id }).update({ status: action === 'approve' ? 'approved' : 'rejected', reviewed_by: req.user.id, reviewed_at: new Date(), updated_at: new Date() });
    res.json({ status: action === 'approve' ? 'approved' : 'rejected' });
  } catch (err) { if (err.code === '23505') return res.status(409).json({ error: 'Email exists' }); next(err); }
};
exports.listTokens = async (req, res, next) => {
  try { const t = await db('invitation_tokens').where({ school_id: req.school_id }).orderBy('created_at','desc').limit(100); res.json(t.map(x => ({ ...x, token: x.token.slice(0,8)+'...' }))); } catch (err) { next(err); }
};
