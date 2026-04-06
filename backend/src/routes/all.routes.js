// grade.routes.js
const express = require('express');
const gradeRouter = express.Router();
const gc = require('../controllers/grade.controller');
const { authenticate, authorise, schoolScope } = require('../middleware/auth');

gradeRouter.use(authenticate, schoolScope);
gradeRouter.post('/',                           gc.recordGrade);
gradeRouter.post('/bulk',                       gc.bulkRecord);
gradeRouter.get('/student/:student_id',         gc.getStudentGrades);
gradeRouter.get('/class-performance',           gc.getClassPerformance);
gradeRouter.get('/subject-summary',             gc.getSubjectSummary);

module.exports.gradeRouter = gradeRouter;

// ─────────────────────────────────────────────────────────

// fee.routes.js
const feeRouter = express.Router();
const fc = require('../controllers/fee.controller');
feeRouter.use(authenticate, schoolScope);
feeRouter.get('/structures',                    fc.getFeeStructures);
feeRouter.post('/structures',                   authorise('admin','principal','bursar'), fc.createFeeStructure);
feeRouter.post('/generate-invoices',            authorise('admin','principal','bursar'), fc.generateInvoices);
feeRouter.get('/invoice/:student_id',           fc.getStudentInvoice);
feeRouter.post('/payment',                      authorise('admin','bursar'), fc.recordManualPayment);
feeRouter.get('/dashboard',                     authorise('admin','principal','bursar'), fc.getBursarDashboard);

module.exports.feeRouter = feeRouter;

// ─────────────────────────────────────────────────────────

// mpesa.routes.js
const mpesaRouter = express.Router();
const mpesaService = require('../services/mpesa.service');
const mpesaCtrl = require('../controllers/mpesa.controller');
const { authenticate: auth2, schoolScope: scope2 } = require('../middleware/auth');

mpesaRouter.post('/stk-push',   auth2, scope2, mpesaCtrl.initiateStkPush);
mpesaRouter.post('/callback',   mpesaService.handleStkCallback);
mpesaRouter.post('/c2b',        mpesaService.handleC2BCallback);

module.exports.mpesaRouter = mpesaRouter;

// ─────────────────────────────────────────────────────────

// attendance.routes.js
const attendanceRouter = express.Router();
const ac = require('../controllers/attendance.controller');
attendanceRouter.use(authenticate, schoolScope);
attendanceRouter.post('/',                      ac.markAttendance);
attendanceRouter.get('/student/:student_id',    ac.getStudentAttendance);
attendanceRouter.get('/class-summary',          ac.getClassAttendanceSummary);

module.exports.attendanceRouter = attendanceRouter;

// ─────────────────────────────────────────────────────────

// portfolio.routes.js
const portfolioRouter = express.Router();
const pc = require('../controllers/portfolio.controller');
portfolioRouter.use(authenticate, schoolScope);
portfolioRouter.get('/student/:student_id',     pc.getStudentPortfolio);
portfolioRouter.post('/',                       pc.addPortfolioItem);
portfolioRouter.put('/:id/review',              authorise('teacher','class_teacher','deputy_principal','principal'), pc.reviewPortfolioItem);
portfolioRouter.get('/pending-reviews',         authorise('teacher','class_teacher'), pc.getPendingReviews);
portfolioRouter.get('/student/:student_id/competency-profile', pc.getCompetencyProfile);

module.exports.portfolioRouter = portfolioRouter;

// ─────────────────────────────────────────────────────────

// communication.routes.js
const commRouter = express.Router();
const cc = require('../controllers/communication.controller');
commRouter.use(authenticate, schoolScope);
commRouter.get('/notices',                      cc.getNotices);
commRouter.post('/notices',                     authorise('admin','principal','deputy_principal','teacher'), cc.createNotice);
commRouter.post('/notices/:id/read',            cc.markNoticeRead);
commRouter.post('/messages',                    cc.sendMessage);
commRouter.get('/messages/student/:student_id', cc.getConversation);
commRouter.get('/consent-forms',                cc.getConsentForms);
commRouter.post('/consent-forms',               authorise('admin','principal'), cc.createConsentForm);
commRouter.post('/consent-forms/:id/sign',      cc.signConsentForm);

module.exports.commRouter = commRouter;

// ─────────────────────────────────────────────────────────

// ai.routes.js
const aiRouter = express.Router();
const aic = require('../controllers/ai.controller');
aiRouter.use(authenticate, schoolScope);
aiRouter.get('/risk/dashboard',                 authorise('admin','principal','deputy_principal','counsellor'), aic.getSchoolRiskDashboard);
aiRouter.get('/risk/student/:student_id',       aic.getStudentRiskScore);
aiRouter.post('/risk/student/:student_id/compute', authorise('admin','principal'), aic.triggerRiskCompute);
aiRouter.get('/pathway-fit/:student_id',        authorise('admin','principal','deputy_principal','counsellor'), aic.getPathwayFitReport);

module.exports.aiRouter = aiRouter;

// ─────────────────────────────────────────────────────────

// pathway.routes.js
const pathwayRouter = express.Router();
const kjseaCtrl = require('../controllers/kjsea.controller');
pathwayRouter.use(authenticate, schoolScope);
pathwayRouter.get('/kjsea/:student_id',         kjseaCtrl.getScore);
pathwayRouter.post('/kjsea',                    authorise('admin','principal','deputy_principal','teacher'), kjseaCtrl.upsertScore);
pathwayRouter.post('/kjsea/:student_id/choose', authorise('admin','principal','counsellor'), kjseaCtrl.choosePathway);
pathwayRouter.get('/kjsea/summary',             authorise('admin','principal'), kjseaCtrl.getSchoolKJSEASummary);

module.exports.pathwayRouter = pathwayRouter;

// ─────────────────────────────────────────────────────────

// staff.routes.js
const staffRouter = express.Router();
const staffCtrl = require('../controllers/staff.controller');
staffRouter.use(authenticate, schoolScope);
staffRouter.get('/',                            authorise('admin','principal'), staffCtrl.getAll);
staffRouter.post('/',                           authorise('admin','principal'), staffCtrl.create);
staffRouter.put('/:id',                         authorise('admin','principal'), staffCtrl.update);

module.exports.staffRouter = staffRouter;

// ─────────────────────────────────────────────────────────

// report.routes.js
const reportRouter = express.Router();
const reportCtrl = require('../controllers/report.controller');
reportRouter.use(authenticate, schoolScope);
reportRouter.get('/report-card/:student_id',    reportCtrl.generateReportCard);
reportRouter.get('/school-performance',         authorise('admin','principal','deputy_principal'), reportCtrl.schoolPerformance);
reportRouter.get('/fee-statement/:student_id',  authorise('admin','bursar'), reportCtrl.feeStatement);

module.exports.reportRouter = reportRouter;

// ─────────────────────────────────────────────────────────

// admin.routes.js
const adminRouter = express.Router();
const adminCtrl = require('../controllers/admin.controller');
adminRouter.use(authenticate, authorise('admin','principal'));
adminRouter.get('/school',                      adminCtrl.getSchool);
adminRouter.put('/school',                      adminCtrl.updateSchool);
adminRouter.get('/subjects',                    adminCtrl.getSubjects);
adminRouter.post('/subjects',                   adminCtrl.createSubject);
adminRouter.get('/streams',                     adminCtrl.getStreams);
adminRouter.post('/streams',                    adminCtrl.createStream);
adminRouter.get('/pathways',                    adminCtrl.getPathways);
adminRouter.post('/pathways',                   adminCtrl.createPathway);

module.exports.adminRouter = adminRouter;

// ─────────────────────────────────────────────────────────

// competency.routes.js
const compRouter = express.Router();
const compCtrl = require('../controllers/competency.controller');
compRouter.use(authenticate, schoolScope);
compRouter.post('/',                            authorise('teacher','class_teacher','deputy_principal'), compCtrl.rateCompetency);
compRouter.get('/student/:student_id',          compCtrl.getStudentCompetencies);
compRouter.get('/class-summary',                authorise('admin','principal','deputy_principal'), compCtrl.getClassCompetencySummary);

module.exports.compRouter = compRouter;

// ── exam question + paper routes ──────────────────────────
const examExtRouter = express.Router();
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
examExtRouter.use(authenticate, schoolScope);

examExtRouter.post('/questions', async (req, res, next) => {
  try {
    const [q] = await db('question_bank').insert({
      id: uuidv4(), school_id: req.school_id, created_by: req.user.id, ...req.body
    }).returning('*');
    res.status(201).json(q);
  } catch(e) { next(e); }
});

examExtRouter.get('/questions', async (req, res, next) => {
  try {
    const { subject_id, curriculum_mode, difficulty, page=1, limit=30 } = req.query;
    let q = db('question_bank as qb').join('subjects as s','qb.subject_id','s.id').where({'qb.school_id': req.school_id});
    if (subject_id) q = q.where('qb.subject_id', subject_id);
    if (curriculum_mode) q = q.where('qb.curriculum_mode', curriculum_mode);
    if (difficulty) q = q.where('qb.difficulty', difficulty);
    const data = await q.select('qb.*','s.name as subject_name').orderBy('qb.created_at','desc').limit(parseInt(limit)).offset((parseInt(page)-1)*parseInt(limit));
    const [{total}] = await db('question_bank').where({school_id: req.school_id}).count('id as total');
    res.json({ data, total: parseInt(total), page: parseInt(page) });
  } catch(e) { next(e); }
});

examExtRouter.post('/papers', async (req, res, next) => {
  try {
    const [p] = await db('exam_papers').insert({
      id: uuidv4(), school_id: req.school_id, created_by: req.user.id,
      question_ids: JSON.stringify([]), is_published: false, ...req.body
    }).returning('*');
    res.status(201).json(p);
  } catch(e) { next(e); }
});

examExtRouter.get('/papers', async (req, res, next) => {
  try {
    const papers = await db('exam_papers as ep').join('subjects as s','ep.subject_id','s.id').where({'ep.school_id': req.school_id}).select('ep.*','s.name as subject_name').orderBy('ep.created_at','desc');
    res.json(papers);
  } catch(e) { next(e); }
});

// CBC strands lookup
examExtRouter.get('/strands', async (req, res, next) => {
  try {
    const { subject_id } = req.query;
    let q = db('cbe_strands');
    if (subject_id) q = q.where('subject_id', subject_id);
    res.json(await q.orderBy('strand_name'));
  } catch(e) { next(e); }
});

module.exports.examExtRouter = examExtRouter;
