const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db     = require('../config/database');
const logger = require('../utils/logger');

const getRedis = () => { try { return require('../config/redis').getRedis(); } catch { return null; } };

async function generateTokens(user, isGuardian = false) {
  const payload = { id: user.id, school_id: user.school_id, role: user.role || 'guardian', full_name: user.full_name };
  if (isGuardian) {
    const links = await db('guardians').where({ id: user.id, school_id: user.school_id }).select('student_id');
    payload.guardian_student_ids = links.map(l => l.student_id).filter(Boolean);
  }
  const access  = jwt.sign(payload, process.env.JWT_ACCESS_SECRET,  { expiresIn: process.env.JWT_ACCESS_EXPIRY  || '15m' });
  const refresh = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' });
  return { access, refresh };
}

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    let user = await db('staff').where({ email, is_active: true }).first();
    let isGuardian = false;
    if (!user) { user = await db('guardians').where({ email, portal_access: true }).first(); isGuardian = true; }
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    await db(isGuardian ? 'guardians' : 'staff').where({ id: user.id }).update({ last_login: new Date() }).catch(() => {});
    const tokens = await generateTokens(user, isGuardian);
    try { const r = getRedis(); if (r) await r.setEx(`rt:${user.id}`, 7*24*3600, tokens.refresh); } catch (_) {}
    res.cookie('refreshToken', tokens.refresh, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7*24*3600*1000 });
    res.json({ access_token: tokens.access, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role || 'guardian', school_id: user.school_id } });
  } catch (err) { next(err); }
};

exports.refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token' });
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    try { const r = getRedis(); if (r) { const stored = await r.get(`rt:${decoded.id}`); if (stored !== token) return res.status(401).json({ error: 'Refresh token invalid' }); } } catch (_) {}
    const user = await db('staff').where({ id: decoded.id, is_active: true }).first() || await db('guardians').where({ id: decoded.id, portal_access: true }).first();
    if (!user) return res.status(401).json({ error: 'User not found' });
    const isGuardian = !user.role || user.role === 'guardian';
    const tokens = await generateTokens(user, isGuardian);
    try { const r = getRedis(); if (r) await r.setEx(`rt:${user.id}`, 7*24*3600, tokens.refresh); } catch (_) {}
    res.cookie('refreshToken', tokens.refresh, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7*24*3600*1000 });
    res.json({ access_token: tokens.access });
  } catch (err) {
    if (['TokenExpiredError','JsonWebTokenError'].includes(err.name)) return res.status(401).json({ error: 'Refresh token expired. Please log in again.' });
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try { const r = getRedis(); if (r) { const d = jwt.decode(token); const ttl = d?.exp ? d.exp - Math.floor(Date.now()/1000) : 900; if (ttl > 0) await r.setEx(`bl:${token}`, ttl, '1'); await r.del(`rt:${req.user.id}`); } } catch (_) {}
    }
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await db('staff').where({ id: req.user.id, school_id: req.school_id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });
    const hash = await bcrypt.hash(new_password, 12);
    await db('staff').where({ id: req.user.id }).update({ password_hash: hash, updated_at: new Date() });
    res.json({ message: 'Password updated' });
  } catch (err) { next(err); }
};

exports.signup = async (req, res, next) => {
  try {
    const { school_name, school_type, county, email, full_name, phone, password } = req.body;
    const existing = await db('staff').where({ email }).first() || await db('guardians').where({ email }).first();
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const trx = await db.transaction();
    try {
      const schoolId = uuid(); const staffId = uuid();
      await trx('schools').insert({ id: schoolId, name: school_name, school_type: school_type || 'boarding', county: county || 'Nairobi', active_curricula: JSON.stringify({ eight_four_four: true, cbe: true }), cbe_pathways_offered: JSON.stringify(['stem','social_sciences','arts_sports']), subscription_plan: 'standard', is_active: true });
      const hash = await bcrypt.hash(password, 12);
      await trx('staff').insert({ id: staffId, school_id: schoolId, full_name, email, phone: phone || '', role: 'principal', password_hash: hash, is_active: true });
      await trx.commit();
      logger.info(`New school: ${school_name} (${schoolId})`);
      res.status(201).json({ message: 'School registered. Please log in.' });
    } catch (e) { await trx.rollback(); throw e; }
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    next(err);
  }
};
