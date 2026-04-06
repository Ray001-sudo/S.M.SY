const { body, param, query, validationResult } = require('express-validator');

const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array({ onlyFirstError: true })[0];
    return res.status(422).json({ error: first.msg, field: first.path });
  }
  next();
};

const validate = (validators) => [...validators, runValidation];

const sanitizeAll = (req, _res, next) => {
  sanitizeObject(req.body); sanitizeObject(req.query); sanitizeObject(req.params); next();
};
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') obj[key] = sanitizeString(val);
    else if (Array.isArray(val)) obj[key] = val.map(v => typeof v === 'string' ? sanitizeString(v) : v);
    else if (val && typeof val === 'object') sanitizeObject(val);
  }
}
function sanitizeString(s) {
  return s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,'')
    .replace(/<[^>]+>/g,'').replace(/javascript:/gi,'').replace(/on\w+\s*=/gi,'')
    .replace(/data:/gi,'').replace(/vbscript:/gi,'').trim();
}

const sanitizeMongoose = (req, _res, next) => {
  const clean = (obj) => { if (!obj || typeof obj !== 'object') return; for (const k of Object.keys(obj)) { if (k.startsWith('$') || k.includes('.')) delete obj[k]; else if (typeof obj[k] === 'object') clean(obj[k]); } };
  clean(req.body); clean(req.query); next();
};

const loginValidators = validate([
  body('email').isEmail().withMessage('Valid email required').normalizeEmail().isLength({ max: 255 }),
  body('password').isString().notEmpty().withMessage('Password required').isLength({ max: 128 }),
]);
const signupValidators = validate([
  body('school_name').trim().notEmpty().withMessage('School name required').isLength({ min: 3, max: 255 }),
  body('full_name').trim().notEmpty().withMessage('Full name required').isLength({ min: 2, max: 255 }),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters'),
  body('phone').optional().trim().matches(/^\+?[\d\s\-()\u0020]{7,20}$/).withMessage('Invalid phone number'),
]);
const changePasswordValidators = validate([
  body('current_password').notEmpty().withMessage('Current password required'),
  body('new_password').isLength({ min: 8, max: 128 }).withMessage('New password must be at least 8 characters'),
]);
const createStudentValidators = validate([
  body('full_name').trim().notEmpty().withMessage('Student name required').isLength({ min: 2, max: 255 }),
  body('admission_number').trim().notEmpty().withMessage('Admission number required').isLength({ max: 50 }),
  body('gender').isIn(['male','female','other']).withMessage('Gender must be male, female, or other'),
  body('intake_year').isInt({ min: 2000, max: new Date().getFullYear() + 1 }).withMessage('Invalid intake year'),
  body('date_of_birth').optional().isISO8601().withMessage('Invalid date of birth'),
  body('kcpe_score').optional().isInt({ min: 0, max: 500 }).withMessage('KCPE score must be 0-500'),
  body('kpsea_score').optional().isFloat({ min: 0, max: 100 }).withMessage('KPSEA score must be 0-100'),
]);
const updateStudentValidators = validate([
  param('id').isUUID().withMessage('Invalid student ID'),
  body('full_name').optional().trim().isLength({ min: 2, max: 255 }),
  body('status').optional().isIn(['active','withdrawn','graduated','suspended']),
]);
const gradeValidators = validate([
  body('student_id').isUUID().withMessage('Invalid student ID'),
  body('subject_id').isUUID().withMessage('Invalid subject ID'),
  body('raw_score').isFloat({ min: 0 }).withMessage('Score must be >= 0'),
  body('max_score').isFloat({ min: 1 }).withMessage('Max score must be >= 1'),
  body('raw_score').custom((v, { req }) => { if (parseFloat(v) > parseFloat(req.body.max_score)) throw new Error('Score cannot exceed max'); return true; }),
  body('assessment_type').isIn(['cat1','cat2','cat3','assignment','mock_exam','end_of_term','sba_entry','project_individual','project_group','practical','portfolio_submission','kjsea_summative','arts_performance','sports_assessment']).withMessage('Invalid assessment type'),
  body('term').isInt({ min: 1, max: 3 }).withMessage('Term must be 1-3'),
  body('academic_year').isInt({ min: 2020, max: 2030 }).withMessage('Invalid academic year'),
  body('assessment_date').isISO8601().withMessage('Invalid date'),
  body('comments').optional().trim().isLength({ max: 500 }),
]);
const feeStructureValidators = validate([
  body('name').trim().notEmpty().withMessage('Name required').isLength({ max: 255 }),
  body('total_amount').isFloat({ min: 0 }).withMessage('Amount must be >= 0'),
  body('term').isInt({ min: 1, max: 3 }).withMessage('Term must be 1-3'),
  body('academic_year').isInt({ min: 2020, max: 2030 }).withMessage('Invalid year'),
  body('due_date').optional().isISO8601().withMessage('Invalid date'),
]);
const infirmaryVisitValidators = validate([
  body('student_id').isUUID().withMessage('Invalid student ID'),
  body('presenting_complaint').trim().notEmpty().withMessage('Complaint required').isLength({ max: 500 }),
  body('diagnosis').optional().trim().isLength({ max: 500 }),
  body('medication_given').optional().trim().isLength({ max: 255 }),
  body('dosage').optional().trim().isLength({ max: 255 }),
  body('outcome').isIn(['treated_returned','sent_home','referred_hospital','observation']).withMessage('Invalid outcome'),
]);
const tokenValidators = validate([
  body('role').isIn(['guardian','teacher','staff','student']).withMessage('Invalid role'),
  body('intended_phone').optional().trim().matches(/^\+?[\d\s\-()\u0020]{7,20}$/).withMessage('Invalid phone'),
  body('intended_email').optional().isEmail().normalizeEmail(),
]);
const noticeValidators = validate([
  body('title').trim().notEmpty().withMessage('Title required').isLength({ max: 255 }),
  body('body').trim().notEmpty().withMessage('Body required').isLength({ max: 5000 }),
  body('category').isIn(['academic','welfare','financial','events','emergency','pathway']).withMessage('Invalid category'),
]);
const virtualSessionValidators = validate([
  body('title').trim().notEmpty().withMessage('Title required').isLength({ max: 255 }),
  body('session_type').isIn(['lesson','staff_meeting','parent_meeting','revision']).withMessage('Invalid session type'),
  body('duration_minutes').optional().isInt({ min: 15, max: 480 }).withMessage('Duration must be 15-480 min'),
  body('scheduled_at').optional().isISO8601().withMessage('Invalid datetime'),
]);
const examGenValidators = validate([
  body('title').trim().notEmpty().withMessage('Title required').isLength({ max: 255 }),
  body('num_questions').isInt({ min: 5, max: 100 }).withMessage('Questions must be 5-100'),
  body('exam_type').isIn(['cat','mock','end_of_term','assignment','revision']).withMessage('Invalid exam type'),
  body('curriculum_mode').isIn(['eight_four_four','cbe']).withMessage('Invalid curriculum mode'),
  body('source_text').optional().trim().isLength({ max: 50000 }),
]);
const uuidParam = (p = 'id') => validate([param(p).isUUID().withMessage(`${p} must be a valid UUID`)]);
const paginationGuard = validate([
  query('page').optional().isInt({ min: 1, max: 1000 }).withMessage('Invalid page'),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be 1-200'),
]);

module.exports = {
  sanitizeAll, sanitizeMongoose, validate,
  loginValidators, signupValidators, changePasswordValidators,
  createStudentValidators, updateStudentValidators,
  gradeValidators, feeStructureValidators,
  infirmaryVisitValidators, tokenValidators,
  noticeValidators, virtualSessionValidators, examGenValidators,
  uuidParam, paginationGuard,
};
