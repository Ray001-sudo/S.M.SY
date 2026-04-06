const db = require('../config/database');
const { v4: uuid } = require('uuid');
const crypto = require('crypto');
exports.createSession = async (req, res, next) => {
  try {
    const { title, description, session_type, subject, grade_level, scheduled_at, duration_minutes } = req.body;
    const meetingId = crypto.randomBytes(5).toString('hex').toUpperCase();
    const jitsiRoom = `shule360-${req.school_id.slice(0,8)}-${meetingId}`;
    const joinUrl = `https://meet.jit.si/${jitsiRoom}`;
    const [s] = await db('virtual_sessions').insert({ id: uuid(), school_id: req.school_id, host_id: req.user.id, title, description, session_type: session_type||'lesson', subject, grade_level, meeting_id: meetingId, join_url: joinUrl, scheduled_at: scheduled_at||new Date(), duration_minutes: duration_minutes||60, status: 'scheduled' }).returning('*');
    res.status(201).json(s);
  } catch (err) { next(err); }
};
exports.getSessions = async (req, res, next) => {
  try {
    const { status, session_type, page=1, limit=20 } = req.query;
    let q = db('virtual_sessions as vs').leftJoin('staff as s','vs.host_id','s.id').where({'vs.school_id': req.school_id});
    if (status) q = q.where('vs.status', status);
    if (session_type) q = q.where('vs.session_type', session_type);
    const sessions = await q.select('vs.*','s.full_name as host_name').orderBy('vs.scheduled_at','desc').limit(parseInt(limit)).offset((parseInt(page)-1)*parseInt(limit));
    res.json(sessions);
  } catch (err) { next(err); }
};
exports.startSession = async (req, res, next) => {
  try {
    const [s] = await db('virtual_sessions').where({ id: req.params.id, school_id: req.school_id }).update({ status: 'live', updated_at: new Date() }).returning('*');
    if (!s) return res.status(404).json({ error: 'Session not found' });
    res.json(s);
  } catch (err) { next(err); }
};
exports.endSession = async (req, res, next) => {
  try {
    const { recording_url } = req.body;
    const [s] = await db('virtual_sessions').where({ id: req.params.id, school_id: req.school_id }).update({ status: 'ended', recording_url: recording_url||null, recording_available_at: recording_url ? new Date() : null, updated_at: new Date() }).returning('*');
    if (!s) return res.status(404).json({ error: 'Session not found' });
    res.json(s);
  } catch (err) { next(err); }
};
exports.getRecordings = async (req, res, next) => {
  try {
    const r = await db('virtual_sessions').where({ school_id: req.school_id, status: 'ended' }).whereNotNull('recording_url').orderBy('scheduled_at','desc');
    res.json(r);
  } catch (err) { next(err); }
};
