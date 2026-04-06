require('dotenv').config();
const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const logger             = require('./utils/logger');
const { connectRedis }   = require('./config/redis');
const errorHandler       = require('./middleware/errorHandler');
const curriculumDetector = require('./middleware/curriculumDetector');
const { sanitizeAll, sanitizeMongoose } = require('./middleware/validate');

const authRoutes          = require('./routes/auth.routes');
const studentRoutes       = require('./routes/student.routes');
const staffRoutes         = require('./routes/staff.routes');
const gradeRoutes         = require('./routes/grade.routes');
const attendanceRoutes    = require('./routes/attendance.routes');
const examRoutes          = require('./routes/exam.routes');
const feeRoutes           = require('./routes/fee.routes');
const mpesaRoutes         = require('./routes/mpesa.routes');
const communicationRoutes = require('./routes/communication.routes');
const portfolioRoutes     = require('./routes/portfolio.routes');
const pathwayRoutes       = require('./routes/pathway.routes');
const aiRoutes            = require('./routes/ai.routes');
const reportRoutes        = require('./routes/report.routes');
const adminRoutes         = require('./routes/admin.routes');
const competencyRoutes    = require('./routes/competency.routes');
const { settingsRouter, inviteRouter, healthRouter, libraryRouter, virtualRouter, examGenRouter } = require('./routes/new.routes');

const app = express();
app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(o => o.trim()).filter(Boolean);
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    logger.warn(`CORS blocked: ${origin}`);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── Security headers ───────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'","'unsafe-inline'",'https://meet.jit.si'], frameSrc: ["'self'",'https://meet.jit.si'], connectSrc: ["'self'",'https://api.anthropic.com','https://sandbox.safaricom.co.ke','https://api.safaricom.co.ke'], imgSrc: ["'self'",'data:','https:'] } }, crossOriginEmbedderPolicy: false }));

// ── Body parsing ───────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Global sanitization ────────────────────────────────────
app.use(sanitizeMongoose);
app.use(sanitizeAll);

// ── Logging ────────────────────────────────────────────────
app.use(morgan('combined', { stream: { write: msg => logger.http(msg.trim()) }, skip: (req) => req.path === '/health' }));

// ── Rate limiting ──────────────────────────────────────────
const rl = (max, windowMs=15*60*1000, message) => rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, message: { error: message||'Too many requests.' }, keyGenerator: req => req.ip, skip: () => process.env.NODE_ENV === 'test' });
app.use('/api/v1/auth/login',     rl(10, 15*60*1000, 'Too many login attempts. Wait 15 minutes.'));
app.use('/api/v1/auth/signup',    rl(5,  60*60*1000, 'Too many signup attempts.'));
app.use('/api/v1/exam-generator', rl(20, 60*60*1000));
app.use('/api/', rl(300));

// ── Curriculum detector ────────────────────────────────────
app.use('/api/v1/grades',      curriculumDetector);
app.use('/api/v1/assessments', curriculumDetector);
app.use('/api/v1/attendance',  curriculumDetector);
app.use('/api/v1/reports',     curriculumDetector);

// ── Health check ───────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'healthy', version: '2.1.0', timestamp: new Date().toISOString() }));

// ── Public branding ────────────────────────────────────────
app.get('/api/v1/public/branding/:school_id', async (req, res) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.school_id)) return res.status(400).json({ error: 'Invalid school ID' });
    const db = require('./config/database');
    const s  = await db('school_settings').where({ school_id: req.params.school_id }).select('school_name','logo_url','primary_color','accent_color','motto','address').first();
    res.json(s || {});
  } catch { res.json({}); }
});

// ── Routes ────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`,           authRoutes);
app.use(`${API}/students`,       studentRoutes);
app.use(`${API}/staff`,          staffRoutes);
app.use(`${API}/grades`,         gradeRoutes);
app.use(`${API}/attendance`,     attendanceRoutes);
app.use(`${API}/exams`,          examRoutes);
app.use(`${API}/fees`,           feeRoutes);
app.use(`${API}/payments/mpesa`, mpesaRoutes);
app.use(`${API}/communication`,  communicationRoutes);
app.use(`${API}/portfolios`,     portfolioRoutes);
app.use(`${API}/pathways`,       pathwayRoutes);
app.use(`${API}/ai`,             aiRoutes);
app.use(`${API}/reports`,        reportRoutes);
app.use(`${API}/admin`,          adminRoutes);
app.use(`${API}/competencies`,   competencyRoutes);
app.use(`${API}/settings`,       settingsRouter);
app.use(`${API}/invite`,         inviteRouter);
app.use(`${API}/health`,         healthRouter);
app.use(`${API}/library`,        libraryRouter);
app.use(`${API}/virtual`,        virtualRouter);
app.use(`${API}/exam-generator`, examGenRouter);

app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '5000', 10);
async function start() {
  try {
    await connectRedis();
    app.listen(PORT, () => logger.info(`Shule360 API v2.1 on port ${PORT} | CORS: ${ALLOWED_ORIGINS.join(', ')}`));
  } catch (err) { logger.error('Startup failed:', err); process.exit(1); }
}
start();
module.exports = app;
