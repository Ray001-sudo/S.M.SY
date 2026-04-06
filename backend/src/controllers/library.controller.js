const db = require('../config/database');
const { v4: uuid } = require('uuid');
exports.getResources = async (req, res, next) => {
  try {
    const { curriculum_mode, subject, resource_type, page=1, limit=30 } = req.query;
    let q = db('library_resources').where({ school_id: req.school_id });
    if (curriculum_mode) q = q.where(b => b.where('curriculum_mode', curriculum_mode).orWhere('curriculum_mode', 'both'));
    if (subject) q = q.where('subject', 'ilike', `%${subject}%`);
    if (resource_type) q = q.where('resource_type', resource_type);
    const [data, countRes] = await Promise.all([q.clone().orderBy('created_at','desc').limit(parseInt(limit)).offset((parseInt(page)-1)*parseInt(limit)), q.clone().count('id as total').first()]);
    res.json({ data, total: parseInt(countRes.total), page: parseInt(page) });
  } catch (err) { next(err); }
};
exports.addResource = async (req, res, next) => {
  try {
    const [r] = await db('library_resources').insert({ id: uuid(), school_id: req.school_id, uploaded_by: req.user.id, ...req.body, curriculum_mode: req.body.curriculum_mode || 'both', is_public: req.body.is_public !== false }).returning('*');
    res.status(201).json(r);
  } catch (err) { next(err); }
};
exports.incrementDownload = async (req, res, next) => {
  try { await db('library_resources').where({ id: req.params.id, school_id: req.school_id }).increment('download_count', 1); res.json({ ok: true }); } catch (err) { next(err); }
};
exports.deleteResource = async (req, res, next) => {
  try { await db('library_resources').where({ id: req.params.id, school_id: req.school_id }).delete(); res.json({ deleted: true }); } catch (err) { next(err); }
};
