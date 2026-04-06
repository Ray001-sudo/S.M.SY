/**
 * Curriculum Detector Middleware
 * Resolves the curriculum mode for every academic request.
 * Reads X-Curriculum-Mode header: auto | eight_four_four | cbe
 * Injects req.curriculumMode into the request.
 */
const db = require('../config/database');

const curriculumDetector = async (req, res, next) => {
  const headerMode = req.headers['x-curriculum-mode'];

  if (headerMode && headerMode !== 'auto') {
    req.curriculumMode = headerMode;
    return next();
  }

  // Auto-detect from student_id if present
  const studentId = req.params.studentId || req.body.student_id || req.query.student_id;
  if (studentId) {
    try {
      const student = await db('students')
        .select('curriculum_mode')
        .where('id', studentId)
        .first();
      if (student) {
        req.curriculumMode = student.curriculum_mode;
        return next();
      }
    } catch (_) { /* fall through to default */ }
  }

  // Default: both modes (for school-wide queries)
  req.curriculumMode = 'both';
  next();
};

module.exports = curriculumDetector;
