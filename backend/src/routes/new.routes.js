const express = require('express');
const { authenticate, authorise, schoolScope, staffOnly, guardianOwns } = require('../middleware/auth');
const { infirmaryVisitValidators, virtualSessionValidators, examGenValidators, tokenValidators, uuidParam, paginationGuard, validate } = require('../middleware/validate');
const { body } = require('express-validator');

const settingsCtrl = require('../controllers/settings.controller');
const inviteCtrl   = require('../controllers/invite.controller');
const healthCtrl   = require('../controllers/health.controller');
const libraryCtrl  = require('../controllers/library.controller');
const virtualCtrl  = require('../controllers/virtual.controller');
const examGenCtrl  = require('../controllers/examGenerator.controller');

const settingsRouter = express.Router();
settingsRouter.use(authenticate, schoolScope, staffOnly);
settingsRouter.get('/', settingsCtrl.getSettings);
settingsRouter.put('/', authorise('admin','principal'), validate([body('school_name').optional().trim().isLength({ max:255 }), body('primary_color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid hex color'), body('accent_color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid hex color'), body('mpesa_paybill').optional().trim().isLength({ max:20 }), body('at_sender_id').optional().trim().isLength({ max:11 }).withMessage('SMS sender ID max 11 chars'), body('email').optional().isEmail().normalizeEmail()]), settingsCtrl.updateSettings);
module.exports.settingsRouter = settingsRouter;

const inviteRouter = express.Router();
inviteRouter.post('/register', validate([body('full_name').trim().notEmpty().isLength({ max:255 }), body('email').optional().isEmail().normalizeEmail(), body('password').isLength({ min:8, max:128 }).withMessage('Password must be 8+ characters'), body('school_id').isUUID().withMessage('school_id required')]), inviteCtrl.registerWithToken);
inviteRouter.use(authenticate, schoolScope, staffOnly);
inviteRouter.post('/tokens', authorise('admin','principal'), tokenValidators, inviteCtrl.createToken);
inviteRouter.get('/tokens', authorise('admin','principal'), inviteCtrl.listTokens);
inviteRouter.post('/bulk-upload', authorise('admin','principal'), validate([body('upload_type').isIn(['students','parents','staff']), body('rows').isArray({ min:1, max:500 }), body('rows.*.name').trim().notEmpty(), body('rows.*.phone').trim()]), inviteCtrl.bulkUpload);
inviteRouter.get('/pending', authorise('admin','principal'), paginationGuard, inviteCtrl.getPendingAccounts);
inviteRouter.post('/pending/:id/review', authorise('admin','principal'), uuidParam('id'), validate([body('action').isIn(['approve','reject'])]), inviteCtrl.reviewPendingAccount);
module.exports.inviteRouter = inviteRouter;

const healthRouter = express.Router();
healthRouter.use(authenticate, schoolScope);
const hrV = validate([body('blood_group').optional().isIn(['A+','A-','B+','B-','AB+','AB-','O+','O-']).withMessage('Invalid blood group'), body('allergies').optional().trim().isLength({ max:1000 }), body('chronic_conditions').optional().trim().isLength({ max:1000 }), body('current_medications').optional().trim().isLength({ max:1000 }), body('emergency_contact_phone').optional().matches(/^\+?[\d\s\-()]{7,20}$/)]);
healthRouter.get('/record/:student_id', staffOnly, uuidParam('student_id'), healthCtrl.getHealthRecord);
healthRouter.put('/record/:student_id', staffOnly, authorise('admin','principal','nurse'), uuidParam('student_id'), hrV, healthCtrl.upsertHealthRecord);
healthRouter.get('/visits', staffOnly, authorise('admin','principal','nurse','class_teacher'), paginationGuard, healthCtrl.getVisits);
healthRouter.post('/visits', staffOnly, authorise('admin','principal','nurse'), infirmaryVisitValidators, healthCtrl.logVisit);
healthRouter.get('/visits/student/:student_id', uuidParam('student_id'), guardianOwns('student_id'), healthCtrl.getStudentVisitHistory);
healthRouter.get('/alerts', staffOnly, authorise('admin','principal','nurse'), healthCtrl.getHealthAlerts);
module.exports.healthRouter = healthRouter;

const libraryRouter = express.Router();
libraryRouter.use(authenticate, schoolScope);
const libV = validate([body('title').trim().notEmpty().isLength({ max:255 }), body('resource_type').isIn(['pdf','video','document','image','link','audio']), body('curriculum_mode').isIn(['eight_four_four','cbe','both']), body('file_url').trim().notEmpty().isLength({ max:2000 }), body('description').optional().trim().isLength({ max:1000 })]);
libraryRouter.get('/', paginationGuard, libraryCtrl.getResources);
libraryRouter.post('/', staffOnly, authorise('admin','principal','teacher','class_teacher'), libV, libraryCtrl.addResource);
libraryRouter.post('/:id/download', uuidParam('id'), libraryCtrl.incrementDownload);
libraryRouter.delete('/:id', staffOnly, authorise('admin','principal','teacher'), uuidParam('id'), libraryCtrl.deleteResource);
module.exports.libraryRouter = libraryRouter;

const virtualRouter = express.Router();
virtualRouter.use(authenticate, schoolScope);
virtualRouter.get('/', paginationGuard, virtualCtrl.getSessions);
virtualRouter.post('/', staffOnly, authorise('admin','principal','deputy_principal','teacher','class_teacher'), virtualSessionValidators, virtualCtrl.createSession);
virtualRouter.post('/:id/start', staffOnly, uuidParam('id'), virtualCtrl.startSession);
virtualRouter.post('/:id/end', staffOnly, uuidParam('id'), validate([body('recording_url').optional().trim().isLength({ max:2000 })]), virtualCtrl.endSession);
virtualRouter.get('/recordings', paginationGuard, virtualCtrl.getRecordings);
module.exports.virtualRouter = virtualRouter;

const examGenRouter = express.Router();
examGenRouter.use(authenticate, schoolScope, staffOnly);
examGenRouter.get('/', paginationGuard, examGenCtrl.listJobs);
examGenRouter.post('/', authorise('admin','principal','deputy_principal','teacher'), examGenValidators, examGenCtrl.createJob);
examGenRouter.get('/:id', uuidParam('id'), examGenCtrl.getJob);
examGenRouter.put('/:id/questions', uuidParam('id'), validate([body('generated_questions').isArray()]), examGenCtrl.updateQuestions);
module.exports.examGenRouter = examGenRouter;
