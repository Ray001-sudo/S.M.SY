/**
 * Shule360 — Complete Database Migration
 * Creates all tables for dual-curriculum (8-4-4 + CBC/CBE) support
 * Run: node src/config/migrate.js
 */
require('dotenv').config();
const db = require('./database');

async function migrate() {
  console.log('Running Shule360 migrations...');

  // ── Enable UUID extension ──────────────────────────────
  await db.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // ── schools ────────────────────────────────────────────
  await db.schema.createTableIfNotExists('schools', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.string('name', 255).notNullable();
    t.enum('school_type', ['day', 'boarding', 'mixed']).defaultTo('boarding');
    t.string('county', 100);
    t.string('sub_county', 100);
    t.string('postal_address', 255);
    t.string('phone', 20);
    t.string('email', 255);
    t.jsonb('active_curricula').defaultTo('{"eight_four_four": true, "cbe": true}');
    t.jsonb('cbe_pathways_offered').defaultTo('["stem","social_sciences","arts_sports"]');
    t.string('mpesa_paybill', 20);
    t.text('mpesa_passkey_encrypted');
    t.string('at_api_key_encrypted', 255);
    t.enum('subscription_plan', ['starter','standard','premium','enterprise']).defaultTo('standard');
    t.timestamp('subscription_expires_at');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // ── staff ──────────────────────────────────────────────
  await db.schema.createTableIfNotExists('staff', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.string('full_name', 255).notNullable();
    t.string('national_id', 20).unique();
    t.string('tsc_number', 30);
    t.string('email', 255).unique();
    t.string('phone', 20).notNullable();
    t.enum('role', ['principal','deputy_principal','teacher','class_teacher','bursar','counsellor','admin','nurse']).notNullable();
    t.string('password_hash', 255).notNullable();
    t.boolean('is_active').defaultTo(true);
    t.boolean('two_fa_enabled').defaultTo(false);
    t.string('two_fa_secret', 100);
    t.integer('failed_login_attempts').defaultTo(0);
    t.timestamp('locked_until');
    t.timestamp('last_login');
    t.timestamps(true, true);
  });

  // ── streams (8-4-4) ────────────────────────────────────
  await db.schema.createTableIfNotExists('streams', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.string('name', 100).notNullable();         // e.g. "Form 3 East"
    t.enum('form', ['Form 1','Form 2','Form 3','Form 4']);
    t.uuid('class_teacher_id').references('id').inTable('staff');
    t.integer('capacity').defaultTo(45);
    t.timestamps(true, true);
  });

  // ── cbe_pathways ───────────────────────────────────────
  await db.schema.createTableIfNotExists('cbe_pathways', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.enum('pathway_name', ['stem','social_sciences','arts_sports']).notNullable();
    t.jsonb('subject_ids').defaultTo('[]');
    t.text('description');
    t.timestamps(true, true);
  });

  // ── students ───────────────────────────────────────────
  await db.schema.createTableIfNotExists('students', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.string('admission_number', 50).notNullable();
    t.string('full_name', 255).notNullable();
    t.date('date_of_birth');
    t.enum('gender', ['male','female','other']);
    t.enum('curriculum_mode', ['eight_four_four','cbe']).notNullable().defaultTo('cbe');
    // 8-4-4 fields
    t.enum('current_form', ['Form 1','Form 2','Form 3','Form 4']);
    t.uuid('stream_id').references('id').inTable('streams');
    t.string('kcpe_index', 30);
    t.integer('kcpe_score');
    // CBE fields
    t.integer('current_grade');    // 7-12
    t.enum('school_level', ['junior','senior']);  // junior=7-9, senior=10-12
    t.uuid('pathway_id').references('id').inTable('cbe_pathways');
    t.decimal('kpsea_score', 6, 2);
    // Common fields
    t.string('boarding_house', 100);
    t.string('dormitory', 100);
    t.string('bed_number', 20);
    t.boolean('bursary_status').defaultTo(false);
    t.decimal('bursary_amount', 10, 2).defaultTo(0);
    t.string('bursary_source', 255);
    t.string('profile_photo_url', 500);
    t.enum('status', ['active','withdrawn','graduated','suspended','deceased']).defaultTo('active');
    t.integer('intake_year');
    t.timestamps(true, true);
    t.unique(['school_id','admission_number']);
  });

  // ── guardians ─────────────────────────────────────────
  await db.schema.createTableIfNotExists('guardians', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.string('full_name', 255).notNullable();
    t.string('national_id', 20);
    t.enum('relationship', ['father','mother','guardian','sibling','uncle','aunt','grandparent','other']);
    t.string('phone', 20).notNullable();
    t.string('email', 255);
    t.boolean('is_primary').defaultTo(false);
    t.string('password_hash', 255);   // for parent portal login
    t.boolean('portal_access').defaultTo(true);
    t.timestamps(true, true);
  });

  // ── student_health ─────────────────────────────────────
  await db.schema.createTableIfNotExists('student_health', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE').unique();
    t.string('blood_group', 5);
    t.text('known_conditions');
    t.text('allergies');
    t.text('current_medications');
    t.string('emergency_contact_name', 255);
    t.string('emergency_contact_phone', 20);
    t.timestamps(true, true);
  });

  // ── subjects ───────────────────────────────────────────
  await db.schema.createTableIfNotExists('subjects', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.string('name', 255).notNullable();
    t.string('code', 20);
    t.enum('curriculum_mode', ['eight_four_four','cbe','both']).defaultTo('both');
    t.jsonb('applicable_pathways').defaultTo('["stem","social_sciences","arts_sports"]');
    t.jsonb('applicable_grades').defaultTo('[7,8,9,10,11,12]');
    t.boolean('is_examinable').defaultTo(true);
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // ── teacher_subject_assignments ────────────────────────
  await db.schema.createTableIfNotExists('teacher_subject_assignments', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('teacher_id').references('id').inTable('staff').onDelete('CASCADE');
    t.uuid('subject_id').references('id').inTable('subjects').onDelete('CASCADE');
    t.uuid('stream_id').references('id').inTable('streams');       // 8-4-4
    t.uuid('pathway_id').references('id').inTable('cbe_pathways'); // CBE
    t.integer('grade_level');
    t.integer('academic_year').notNullable();
    t.timestamps(true, true);
  });

  // ── cbe_strands ────────────────────────────────────────
  await db.schema.createTableIfNotExists('cbe_strands', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('subject_id').references('id').inTable('subjects').onDelete('CASCADE');
    t.string('strand_name', 255).notNullable();
    t.string('sub_strand_name', 255);
    t.enum('pathway', ['all','stem','social_sciences','arts_sports']).defaultTo('all');
    t.integer('grade_level');
    t.timestamps(true, true);
  });

  // ── assessments (unified — dual curriculum) ────────────
  await db.schema.createTableIfNotExists('assessments', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.uuid('teacher_id').references('id').inTable('staff');
    t.uuid('subject_id').references('id').inTable('subjects');
    t.uuid('strand_id').references('id').inTable('cbe_strands');   // CBE only
    t.enum('curriculum_mode', ['eight_four_four','cbe']).notNullable();
    t.enum('assessment_type', [
      // 8-4-4
      'cat1','cat2','cat3','end_of_term','assignment','mock_exam',
      // CBE
      'project_individual','project_group','practical','sba_entry',
      'portfolio_submission','kjsea_summative','arts_performance','sports_assessment'
    ]).notNullable();
    t.decimal('raw_score', 6, 2);
    t.decimal('max_score', 6, 2);
    t.enum('competency_rating', ['EE','ME','AE','BE']);  // CBE
    t.integer('term').notNullable();
    t.integer('academic_year').notNullable();
    t.date('assessment_date').notNullable();
    t.text('comments');
    t.timestamps(true, true);
  });

  // ── attendance ─────────────────────────────────────────
  await db.schema.createTableIfNotExists('attendance', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.uuid('subject_id').references('id').inTable('subjects');
    t.uuid('teacher_id').references('id').inTable('staff');
    t.date('lesson_date').notNullable();
    t.integer('period');
    t.enum('status', ['present','absent','late','excused']).notNullable();
    t.text('notes');
    t.integer('academic_year');
    t.integer('term');
    t.timestamps(true, true);
  });

  // ── core_competency_ratings (CBE) ──────────────────────
  await db.schema.createTableIfNotExists('core_competency_ratings', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.uuid('teacher_id').references('id').inTable('staff');
    t.enum('competency', [
      'communication','critical_thinking','creativity',
      'citizenship','digital_literacy','learning_to_learn','self_efficacy'
    ]).notNullable();
    t.enum('rating', ['EE','ME','AE','BE']).notNullable();
    t.text('teacher_notes');
    t.integer('term').notNullable();
    t.integer('academic_year').notNullable();
    t.timestamps(true, true);
  });

  // ── student_portfolios (CBE) ───────────────────────────
  await db.schema.createTableIfNotExists('student_portfolios', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.uuid('subject_id').references('id').inTable('subjects');
    t.uuid('strand_id').references('id').inTable('cbe_strands');
    t.string('title', 255).notNullable();
    t.text('description');
    t.text('student_reflection');
    t.enum('evidence_type', ['photo','pdf','video','audio','link','document']).notNullable();
    t.string('file_url', 1000);
    t.integer('file_size_kb');
    t.string('external_link', 1000);
    t.enum('review_status', ['pending','reviewed','rejected']).defaultTo('pending');
    t.text('teacher_feedback');
    t.uuid('reviewed_by').references('id').inTable('staff');
    t.timestamp('reviewed_at');
    t.jsonb('competency_ratings').defaultTo('{}');
    t.integer('term');
    t.integer('academic_year');
    t.timestamps(true, true);
  });

  // ── kjsea_scores (CBE) ─────────────────────────────────
  await db.schema.createTableIfNotExists('kjsea_scores', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.integer('academic_year').notNullable();  // Grade 9 completion year
    t.decimal('sba_g7_score', 6, 2);
    t.decimal('sba_g8_score', 6, 2);
    t.decimal('sba_g9_score', 6, 2);
    t.decimal('project_1_score', 6, 2);
    t.decimal('project_2_score', 6, 2);
    t.decimal('project_3_score', 6, 2);
    t.decimal('summative_score', 6, 2);
    t.decimal('composite_score', 6, 2);    // computed
    t.enum('projected_pathway', ['stem','social_sciences','arts_sports']); // AI suggestion
    t.enum('chosen_pathway', ['stem','social_sciences','arts_sports']);     // final choice
    t.uuid('counsellor_id').references('id').inTable('staff');
    t.text('override_reason');             // if chosen != projected
    t.timestamps(true, true);
    t.unique(['school_id','student_id','academic_year']);
  });

  // ── question_bank ──────────────────────────────────────
  await db.schema.createTableIfNotExists('question_bank', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('subject_id').references('id').inTable('subjects').onDelete('CASCADE');
    t.uuid('strand_id').references('id').inTable('cbe_strands');
    t.uuid('created_by').references('id').inTable('staff');
    t.enum('curriculum_mode', ['eight_four_four','cbe','both']).defaultTo('eight_four_four');
    t.text('question_text').notNullable();
    t.enum('question_type', ['mcq','short_answer','structured','essay','practical','rubric']).notNullable();
    t.jsonb('options');          // MCQ options {A,B,C,D}
    t.text('answer_key');
    t.text('model_answer');
    t.decimal('marks', 5, 2).notNullable();
    t.enum('difficulty', ['easy','medium','hard','kcse_level','kjsea_level']).defaultTo('medium');
    t.string('topic', 255);
    t.string('subtopic', 255);
    t.integer('times_used').defaultTo(0);
    t.decimal('avg_student_score', 5, 2);
    t.timestamps(true, true);
  });

  // ── exam_papers ────────────────────────────────────────
  await db.schema.createTableIfNotExists('exam_papers', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('subject_id').references('id').inTable('subjects');
    t.uuid('created_by').references('id').inTable('staff');
    t.string('title', 255).notNullable();
    t.enum('paper_type', ['cat','mock','end_of_term','kjsea_summative','sba']).notNullable();
    t.enum('curriculum_mode', ['eight_four_four','cbe']).notNullable();
    t.decimal('total_marks', 6, 2);
    t.integer('duration_minutes');
    t.integer('term');
    t.integer('academic_year');
    t.jsonb('question_ids').defaultTo('[]');
    t.boolean('is_published').defaultTo(false);
    t.timestamps(true, true);
  });

  // ── fee_structures ─────────────────────────────────────
  await db.schema.createTableIfNotExists('fee_structures', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.string('name', 255).notNullable();   // e.g. "Form 4 2026 Term 2"
    t.enum('curriculum_mode', ['eight_four_four','cbe','both']).defaultTo('both');
    t.string('applicable_level', 50);     // "Form 1"/"Grade 7" etc
    t.enum('applicable_pathway', ['stem','social_sciences','arts_sports','all']).defaultTo('all');
    t.integer('term').notNullable();
    t.integer('academic_year').notNullable();
    t.jsonb('line_items').notNullable();   // [{name, amount}, ...]
    t.decimal('total_amount', 10, 2).notNullable();
    t.date('due_date').notNullable();
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // ── fee_invoices ───────────────────────────────────────
  await db.schema.createTableIfNotExists('fee_invoices', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.uuid('fee_structure_id').references('id').inTable('fee_structures');
    t.integer('term').notNullable();
    t.integer('academic_year').notNullable();
    t.decimal('total_amount', 10, 2).notNullable();
    t.decimal('bursary_deduction', 10, 2).defaultTo(0);
    t.decimal('net_payable', 10, 2).notNullable();
    t.decimal('amount_paid', 10, 2).defaultTo(0);
    t.decimal('balance', 10, 2);
    t.date('due_date').notNullable();
    t.enum('status', ['unpaid','partial','paid','overdue','waived']).defaultTo('unpaid');
    t.timestamps(true, true);
    t.unique(['school_id','student_id','term','academic_year']);
  });

  // ── fee_payments ───────────────────────────────────────
  await db.schema.createTableIfNotExists('fee_payments', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.uuid('invoice_id').references('id').inTable('fee_invoices').onDelete('CASCADE');
    t.decimal('amount', 10, 2).notNullable();
    t.enum('payment_method', ['mpesa_stk','mpesa_paybill','bank','cash','bursary']).notNullable();
    t.string('mpesa_transaction_code', 50).unique();
    t.string('mpesa_phone', 20);
    t.string('bank_reference', 100);
    t.timestamp('payment_date').notNullable();
    t.uuid('recorded_by').references('id').inTable('staff');   // null = automated
    t.boolean('is_verified').defaultTo(true);
    t.text('notes');
    t.timestamps(true, true);
  });

  // ── notices ────────────────────────────────────────────
  await db.schema.createTableIfNotExists('notices', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('created_by').references('id').inTable('staff');
    t.string('title', 255).notNullable();
    t.text('body').notNullable();
    t.enum('category', ['academic','welfare','financial','events','emergency','pathway']).defaultTo('academic');
    t.string('attachment_url', 1000);
    t.timestamp('expires_at');
    t.boolean('send_sms').defaultTo(false);
    t.integer('read_count').defaultTo(0);
    t.timestamps(true, true);
  });

  // ── messages ───────────────────────────────────────────
  await db.schema.createTableIfNotExists('messages', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('sender_id');           // staff or guardian
    t.string('sender_type', 20);   // 'staff' | 'guardian'
    t.uuid('recipient_id');
    t.string('recipient_type', 20);
    t.uuid('student_id').references('id').inTable('students');
    t.text('body').notNullable();
    t.boolean('is_read').defaultTo(false);
    t.timestamp('read_at');
    t.timestamps(true, true);
  });

  // ── consent_forms ──────────────────────────────────────
  await db.schema.createTableIfNotExists('consent_forms', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('created_by').references('id').inTable('staff');
    t.string('title', 255).notNullable();
    t.text('description').notNullable();
    t.timestamp('deadline');
    t.jsonb('signed_by').defaultTo('[]');   // [{guardian_id, signed_at, session_id}]
    t.timestamps(true, true);
  });

  // ── student_risk_scores (AI output) ───────────────────
  await db.schema.createTableIfNotExists('student_risk_scores', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.enum('curriculum_mode', ['eight_four_four','cbe']).notNullable();
    t.decimal('risk_score', 5, 2);
    t.enum('risk_category', ['low','medium','high','critical']).defaultTo('low');
    t.jsonb('top_factors').defaultTo('[]');
    t.jsonb('eight_four_four_data').defaultTo('{}');   // kcse projections
    t.jsonb('cbe_data').defaultTo('{}');               // kjsea projections, pathway fit
    t.string('model_version', 50);
    t.timestamp('computed_at');
    t.timestamps(true, true);
  });

  // ── pathway_recommendations (AI) ──────────────────────
  await db.schema.createTableIfNotExists('pathway_recommendations', t => {
    t.uuid('id').primary().defaultTo(db.raw('uuid_generate_v4()'));
    t.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE');
    t.uuid('student_id').references('id').inTable('students').onDelete('CASCADE');
    t.jsonb('pathway_scores').notNullable();  // {stem: 78, social_sciences: 65, arts_sports: 42}
    t.enum('recommended_pathway', ['stem','social_sciences','arts_sports']).notNullable();
    t.jsonb('top_indicators').defaultTo('[]');
    t.string('model_version', 50);
    t.timestamp('generated_at');
    t.timestamps(true, true);
  });

  // ── Indexes ────────────────────────────────────────────
  await db.raw('CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id)');
  await db.raw('CREATE INDEX IF NOT EXISTS idx_students_curriculum ON students(curriculum_mode)');
  await db.raw('CREATE INDEX IF NOT EXISTS idx_assessments_student ON assessments(student_id)');
  await db.raw('CREATE INDEX IF NOT EXISTS idx_assessments_school_year ON assessments(school_id, academic_year, term)');
  await db.raw('CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, lesson_date)');
  await db.raw('CREATE INDEX IF NOT EXISTS idx_fee_invoices_student ON fee_invoices(student_id, academic_year)');
  await db.raw('CREATE INDEX IF NOT EXISTS idx_risk_scores_student ON student_risk_scores(student_id, computed_at DESC)');
  await db.raw('CREATE INDEX IF NOT EXISTS idx_portfolios_student ON student_portfolios(student_id)');

  console.log('All migrations completed successfully.');
  await db.destroy();
}

migrate().catch(err => { console.error('Migration failed:', err); process.exit(1); });
