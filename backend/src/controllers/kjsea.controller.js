const db = require('../config/database');
const { v4: uuid } = require('uuid');
const smsService = require('../services/sms.service');

// KNEC KJSEA weighting: SBA=40%, Projects=20%, Summative=40%
const WEIGHTS = { sba: 0.40, projects: 0.20, summative: 0.40 };

function computeKJSEAComposite(scores) {
  const { sba_g7_score, sba_g8_score, sba_g9_score,
    project_1_score, project_2_score, project_3_score, summative_score } = scores;

  const sbaAvg = ((sba_g7_score || 0) + (sba_g8_score || 0) + (sba_g9_score || 0)) / 3;
  const projectAvg = ((project_1_score || 0) + (project_2_score || 0) + (project_3_score || 0)) / 3;
  const composite = (
    (sbaAvg * WEIGHTS.sba) +
    (projectAvg * WEIGHTS.projects) +
    ((summative_score || 0) * WEIGHTS.summative)
  );
  return parseFloat(composite.toFixed(2));
}

exports.getScore = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const score = await db('kjsea_scores')
      .where({ student_id, school_id: req.school_id })
      .orderBy('academic_year', 'desc').first();
    if (!score) return res.status(404).json({ error: 'No KJSEA record found' });
    res.json(score);
  } catch (err) { next(err); }
};

exports.upsertScore = async (req, res, next) => {
  try {
    const { student_id, academic_year, ...scores } = req.body;

    // Verify CBE student at Grade 9
    const student = await db('students')
      .where({ id: student_id, school_id: req.school_id })
      .first();
    if (!student || student.curriculum_mode !== 'cbe') {
      return res.status(400).json({ error: 'KJSEA only applies to CBE students' });
    }

    const composite_score = computeKJSEAComposite(scores);

    const existing = await db('kjsea_scores')
      .where({ student_id, school_id: req.school_id, academic_year })
      .first();

    let record;
    if (existing) {
      [record] = await db('kjsea_scores')
        .where({ id: existing.id })
        .update({ ...scores, composite_score, updated_at: new Date() })
        .returning('*');
    } else {
      [record] = await db('kjsea_scores').insert({
        id: uuid(),
        school_id: req.school_id,
        student_id, academic_year,
        ...scores,
        composite_score
      }).returning('*');
    }

    res.json(record);
  } catch (err) { next(err); }
};

exports.choosePathway = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { chosen_pathway, override_reason } = req.body;

    const record = await db('kjsea_scores')
      .where({ student_id, school_id: req.school_id })
      .orderBy('academic_year', 'desc').first();
    if (!record) return res.status(404).json({ error: 'No KJSEA record found' });

    const [updated] = await db('kjsea_scores')
      .where({ id: record.id })
      .update({
        chosen_pathway,
        override_reason: chosen_pathway !== record.projected_pathway ? override_reason : null,
        counsellor_id: req.user.id,
        updated_at: new Date()
      })
      .returning('*');

    // Update student's pathway
    await db('students').where({ id: student_id }).update({ updated_at: new Date() });

    // Notify parent
    const guardian = await db('guardians').where({ student_id, is_primary: true }).first();
    const student = await db('students').where({ id: student_id }).first();
    if (guardian?.phone) {
      const pathwayNames = {
        stem: 'Science, Technology, Engineering & Mathematics (STEM)',
        social_sciences: 'Social Sciences',
        arts_sports: 'Arts and Sports Science'
      };
      await smsService.send(guardian.phone,
        `Shule360: ${student.full_name}'s senior school pathway has been confirmed as ${pathwayNames[chosen_pathway]}. Log in to view subject details.`
      );
    }

    res.json(updated);
  } catch (err) { next(err); }
};

exports.getSchoolKJSEASummary = async (req, res, next) => {
  try {
    const { academic_year } = req.query;
    const scores = await db('kjsea_scores as kj')
      .join('students as s', 'kj.student_id', 's.id')
      .where({ 'kj.school_id': req.school_id, 'kj.academic_year': parseInt(academic_year) })
      .select('kj.*', 's.full_name', 's.admission_number')
      .orderBy('kj.composite_score', 'desc');

    const stats = {
      total: scores.length,
      average_composite: scores.length
        ? (scores.reduce((s, r) => s + parseFloat(r.composite_score), 0) / scores.length).toFixed(2)
        : 0,
      pathway_breakdown: scores.reduce((acc, r) => {
        if (r.chosen_pathway) acc[r.chosen_pathway] = (acc[r.chosen_pathway] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({ scores, stats });
  } catch (err) { next(err); }
};
