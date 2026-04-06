const db = require('../config/database');
const { v4: uuid } = require('uuid');
exports.getSettings = async (req, res, next) => {
  try {
    let s = await db('school_settings').where({ school_id: req.school_id }).first();
    if (!s) {
      const school = await db('schools').where({ id: req.school_id }).first();
      [s] = await db('school_settings').insert({ id: uuid(), school_id: req.school_id, school_name: school?.name, primary_color: '#0B1D35', accent_color: '#00C896' }).returning('*');
    }
    res.json(s);
  } catch (err) { next(err); }
};
exports.updateSettings = async (req, res, next) => {
  try {
    if (req.body.school_name) await db('schools').where({ id: req.school_id }).update({ name: req.body.school_name, updated_at: new Date() });
    const exists = await db('school_settings').where({ school_id: req.school_id }).first();
    let s;
    if (exists) { [s] = await db('school_settings').where({ school_id: req.school_id }).update({ ...req.body, updated_at: new Date() }).returning('*'); }
    else { [s] = await db('school_settings').insert({ id: uuid(), school_id: req.school_id, ...req.body }).returning('*'); }
    res.json(s);
  } catch (err) { next(err); }
};
exports.getPublicBranding = async (req, res, next) => {
  try {
    const s = await db('school_settings').where({ school_id: req.params.school_id }).select('school_name','logo_url','primary_color','accent_color','motto','address').first();
    res.json(s || {});
  } catch (err) { next(err); }
};
