const db = require('../config/database');
const { v4: uuid } = require('uuid');
const axios = require('axios');
const logger = require('../utils/logger');

exports.createJob = async (req, res, next) => {
  try {
    const { title, subject, grade_level, exam_type, curriculum_mode, num_questions, source_text, source_file_url, source_file_name, term, academic_year } = req.body;
    if (!source_text && !source_file_url) return res.status(400).json({ error: 'source_text or source_file_url required' });
    const [job] = await db('ai_exam_jobs').insert({ id: uuid(), school_id: req.school_id, teacher_id: req.user.id, title, subject, grade_level, exam_type: exam_type||'cat', curriculum_mode: curriculum_mode||'eight_four_four', num_questions: num_questions||20, source_text: source_text||null, source_file_url: source_file_url||null, source_file_name: source_file_name||null, term, academic_year, status: 'pending' }).returning('*');
    processExamJob(job.id, req.school_id).catch(e => logger.error(`AI job ${job.id}:`, e.message));
    res.status(201).json({ job_id: job.id, status: 'processing', message: 'AI is generating your exam. Check back in 30-60 seconds.' });
  } catch (err) { next(err); }
};
exports.getJob = async (req, res, next) => {
  try { const j = await db('ai_exam_jobs').where({ id: req.params.id, school_id: req.school_id }).first(); if (!j) return res.status(404).json({ error: 'Not found' }); res.json(j); } catch (err) { next(err); }
};
exports.listJobs = async (req, res, next) => {
  try { res.json(await db('ai_exam_jobs').where({ school_id: req.school_id }).orderBy('created_at','desc').limit(50)); } catch (err) { next(err); }
};
exports.updateQuestions = async (req, res, next) => {
  try {
    const [u] = await db('ai_exam_jobs').where({ id: req.params.id, school_id: req.school_id }).update({ generated_questions: JSON.stringify(req.body.generated_questions), updated_at: new Date() }).returning('*');
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json(u);
  } catch (err) { next(err); }
};

async function processExamJob(jobId, schoolId) {
  const job = await db('ai_exam_jobs').where({ id: jobId }).first();
  if (!job) return;
  await db('ai_exam_jobs').where({ id: jobId }).update({ status: 'processing' });
  try {
    const school = await db('school_settings').where({ school_id: schoolId }).first();
    const schoolName = school?.school_name || 'School';
    const text = job.source_text || '';
    const isCBE = job.curriculum_mode === 'cbe';
    const prompt = `You are an expert Kenyan secondary school exam setter for ${schoolName}. Generate exactly ${job.num_questions} exam questions for ${job.subject}, ${job.grade_level}, ${job.exam_type?.replace(/_/g,' ').toUpperCase()}, ${isCBE ? 'CBC/CBE competency-based' : '8-4-4 KCSE-aligned'} curriculum.\n\nSource material:\n"""\n${text.slice(0, 8000)}\n"""\n\nReturn ONLY a JSON array:\n[{"number":1,"type":"mcq","question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","marks":2,"topic":"..."},{"number":2,"type":"short_answer","question":"...","model_answer":"...","marks":3,"topic":"..."}]`;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) { await db('ai_exam_jobs').where({ id: jobId }).update({ generated_questions: JSON.stringify(fallbackQuestions(job.num_questions, job.subject)), status: 'completed', updated_at: new Date() }); return; }
    const response = await axios.post('https://api.anthropic.com/v1/messages', { model: 'claude-sonnet-4-20250514', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }, { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, timeout: 60000 });
    const content = response.data.content[0]?.text || '[]';
    let questions;
    try { questions = JSON.parse(content.replace(/```json|```/g,'').trim()); } catch { questions = fallbackQuestions(job.num_questions, job.subject); }
    await db('ai_exam_jobs').where({ id: jobId }).update({ generated_questions: JSON.stringify(Array.isArray(questions) ? questions : []), status: 'completed', updated_at: new Date() });
  } catch (err) {
    logger.error(`AI job ${jobId}:`, err.message);
    await db('ai_exam_jobs').where({ id: jobId }).update({ status: 'failed', error_message: err.message, updated_at: new Date() });
  }
}

function fallbackQuestions(num, subject) {
  return Array.from({ length: num }, (_, i) => i < Math.floor(num*0.6)
    ? { number: i+1, type: 'mcq', question: `[${subject}] Question ${i+1}: Edit this question`, options: { A:'Option A', B:'Option B', C:'Option C', D:'Option D' }, answer: 'A', marks: 2, topic: subject }
    : { number: i+1, type: 'short_answer', question: `[${subject}] Short answer question ${i+1}: Edit this question`, model_answer: 'Model answer here', marks: 3, topic: subject }
  );
}
