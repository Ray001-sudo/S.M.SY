const db = require('../config/database');
const { v4: uuid } = require('uuid');
const smsService = require('../services/sms.service');

// ── Notices ───────────────────────────────────────────────
exports.createNotice = async (req, res, next) => {
  try {
    const { title, body, category, attachment_url, expires_at, send_sms } = req.body;
    const [notice] = await db('notices').insert({
      id: uuid(), school_id: req.school_id,
      created_by: req.user.id,
      title, body, category: category || 'academic',
      attachment_url, expires_at, send_sms: send_sms || false
    }).returning('*');

    if (send_sms) {
      const guardians = await db('guardians')
        .join('students as s', 'guardians.student_id', 's.id')
        .where({ 's.school_id': req.school_id, 's.status': 'active', 'guardians.is_primary': true })
        .distinct('guardians.phone');

      const phones = guardians.map(g => g.phone).filter(Boolean);
      if (phones.length > 0) {
        const smsText = `Shule360 Notice: ${title}. ${body.slice(0, 120)}${body.length > 120 ? '...' : ''}`;
        await smsService.sendBulk(phones, smsText);
      }
    }

    res.status(201).json(notice);
  } catch (err) { next(err); }
};

exports.getNotices = async (req, res, next) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    let query = db('notices as n')
      .join('staff as st', 'n.created_by', 'st.id')
      .where({ 'n.school_id': req.school_id })
      .where(q => q.whereNull('n.expires_at').orWhere('n.expires_at', '>', new Date()))
      .select('n.*', 'st.full_name as author');
    if (category) query = query.where('n.category', category);
    const notices = await query.orderBy('n.created_at', 'desc')
      .limit(parseInt(limit)).offset((parseInt(page) - 1) * parseInt(limit));
    res.json(notices);
  } catch (err) { next(err); }
};

exports.markNoticeRead = async (req, res, next) => {
  try {
    await db('notices').where({ id: req.params.id, school_id: req.school_id })
      .increment('read_count', 1);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── Private Messages ──────────────────────────────────────
exports.sendMessage = async (req, res, next) => {
  try {
    const { recipient_id, recipient_type, student_id, body } = req.body;
    const [message] = await db('messages').insert({
      id: uuid(), school_id: req.school_id,
      sender_id: req.user.id,
      sender_type: req.user.role === 'guardian' ? 'guardian' : 'staff',
      recipient_id, recipient_type, student_id, body
    }).returning('*');
    res.status(201).json(message);
  } catch (err) { next(err); }
};

exports.getConversation = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const messages = await db('messages')
      .where({ school_id: req.school_id, student_id })
      .where(q => q
        .where({ sender_id: req.user.id })
        .orWhere({ recipient_id: req.user.id })
      )
      .orderBy('created_at', 'asc');

    // Mark received messages as read
    await db('messages')
      .where({ school_id: req.school_id, student_id, recipient_id: req.user.id, is_read: false })
      .update({ is_read: true, read_at: new Date() });

    res.json(messages);
  } catch (err) { next(err); }
};

// ── Consent Forms ─────────────────────────────────────────
exports.createConsentForm = async (req, res, next) => {
  try {
    const { title, description, deadline } = req.body;
    const [form] = await db('consent_forms').insert({
      id: uuid(), school_id: req.school_id,
      created_by: req.user.id,
      title, description, deadline, signed_by: JSON.stringify([])
    }).returning('*');

    // Notify parents via SMS
    const guardians = await db('guardians')
      .join('students as s', 'guardians.student_id', 's.id')
      .where({ 's.school_id': req.school_id, 's.status': 'active', 'guardians.is_primary': true })
      .select('guardians.phone');
    const phones = guardians.map(g => g.phone).filter(Boolean);
    if (phones.length > 0) {
      await smsService.sendBulk(phones,
        `Shule360: Consent required — "${title}". Log in to the parent portal to sign before ${deadline ? new Date(deadline).toDateString() : 'deadline'}.`
      );
    }
    res.status(201).json(form);
  } catch (err) { next(err); }
};

exports.signConsentForm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const form = await db('consent_forms').where({ id, school_id: req.school_id }).first();
    if (!form) return res.status(404).json({ error: 'Consent form not found' });

    const signedBy = typeof form.signed_by === 'string'
      ? JSON.parse(form.signed_by) : form.signed_by;

    const alreadySigned = signedBy.find(s => s.guardian_id === req.user.id);
    if (alreadySigned) return res.status(409).json({ error: 'Already signed' });

    signedBy.push({
      guardian_id: req.user.id,
      signed_at: new Date().toISOString(),
      session_id: req.headers['x-session-id'] || 'unknown'
    });

    await db('consent_forms').where({ id }).update({ signed_by: JSON.stringify(signedBy) });
    res.json({ signed: true, total_signatures: signedBy.length });
  } catch (err) { next(err); }
};

exports.getConsentForms = async (req, res, next) => {
  try {
    const forms = await db('consent_forms')
      .where({ school_id: req.school_id })
      .orderBy('created_at', 'desc');
    res.json(forms);
  } catch (err) { next(err); }
};
