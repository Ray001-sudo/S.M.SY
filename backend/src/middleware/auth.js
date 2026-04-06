const jwt = require('jsonwebtoken');
const db  = require('../config/database');

const getRedis = () => {
  try { return require('../config/redis').getRedis(); } catch { return null; }
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
    const token = authHeader.split(' ')[1];
    try {
      const redis = getRedis();
      if (redis) { const bl = await redis.get(`bl:${token}`); if (bl) return res.status(401).json({ error: 'Session expired. Please log in again.' }); }
    } catch (_) {}
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const schoolScope = async (req, res, next) => {
  try {
    if (!req.user?.school_id) return res.status(403).json({ error: 'No school context in token' });
    req.school_id = req.user.school_id;
    if (req.body)  delete req.body.school_id;
    if (req.query) delete req.query.school_id;
    if (req.user.role === 'guardian') {
      const links = await db('guardians').where({ id: req.user.id, school_id: req.school_id }).select('student_id');
      req.guardian_student_ids = links.map(l => l.student_id).filter(Boolean);
    }
    next();
  } catch (err) { next(err); }
};

const authorise = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

const guardianOwns = (param = 'student_id') => (req, res, next) => {
  if (req.user.role !== 'guardian') return next();
  const sid = req.params[param] || req.query[param] || req.body?.[param];
  if (!sid) return next();
  if (!req.guardian_student_ids?.includes(sid)) return res.status(403).json({ error: 'Access denied to this student\'s data' });
  next();
};

const staffOnly = (req, res, next) => {
  if (req.user.role === 'guardian') return res.status(403).json({ error: 'Staff-only route' });
  next();
};

const selfOnly = (req, res, next) => {
  const targetId = req.params.id;
  if (targetId && targetId !== req.user.id && !['admin','principal'].includes(req.user.role)) {
    return res.status(403).json({ error: 'You can only modify your own account' });
  }
  next();
};

module.exports = { authenticate, authorise, schoolScope, guardianOwns, staffOnly, selfOnly };
