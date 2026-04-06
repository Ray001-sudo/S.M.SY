/**
 * Shule360 — Sample Data Seed
 * Creates a demo school with staff, students (8-4-4 + CBE), subjects, fee structure
 * Run: node src/config/seed.js
 */
require('dotenv').config();
const db = require('./database');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

async function seed() {
  console.log('Seeding Shule360 demo data...');

  // ── School ─────────────────────────────────────────────
  const schoolId = uuid();
  await db('schools').insert({
    id: schoolId,
    name: 'Uhuru Boarding High School',
    school_type: 'boarding',
    county: 'Nairobi',
    sub_county: 'Westlands',
    postal_address: 'P.O Box 1234-00100 Nairobi',
    phone: '+254700000001',
    email: 'admin@uhuruhs.ac.ke',
    mpesa_paybill: '174379',
    active_curricula: JSON.stringify({ eight_four_four: true, cbe: true }),
    cbe_pathways_offered: JSON.stringify(['stem', 'social_sciences', 'arts_sports']),
    subscription_plan: 'premium',
    subscription_expires_at: new Date('2027-12-31'),
    is_active: true
  }).onConflict('id').ignore();

  const hash = await bcrypt.hash('Demo@1234', 12);

  // ── Staff ──────────────────────────────────────────────
  const staffData = [
    { id: uuid(), full_name: 'Dr. Mary Kamau',     email: 'principal@uhuruhs.ac.ke',  phone: '+254700000002', role: 'principal',        tsc_number: 'TSC001' },
    { id: uuid(), full_name: 'Mr. James Otieno',   email: 'deputy@uhuruhs.ac.ke',     phone: '+254700000003', role: 'deputy_principal',  tsc_number: 'TSC002' },
    { id: uuid(), full_name: 'Ms. Grace Wanjiru',  email: 'bursar@uhuruhs.ac.ke',     phone: '+254700000004', role: 'bursar',            tsc_number: null },
    { id: uuid(), full_name: 'Mr. Peter Mwangi',   email: 'maths@uhuruhs.ac.ke',      phone: '+254700000005', role: 'teacher',           tsc_number: 'TSC003' },
    { id: uuid(), full_name: 'Ms. Faith Achieng',  email: 'english@uhuruhs.ac.ke',    phone: '+254700000006', role: 'teacher',           tsc_number: 'TSC004' },
    { id: uuid(), full_name: 'Mr. David Njoroge',  email: 'counsellor@uhuruhs.ac.ke', phone: '+254700000007', role: 'counsellor',        tsc_number: 'TSC005' },
  ];
  for (const s of staffData) {
    await db('staff').insert({ ...s, school_id: schoolId, password_hash: hash, is_active: true }).onConflict('email').ignore();
  }

  // ── Streams (8-4-4) ────────────────────────────────────
  const streams = [
    { id: uuid(), school_id: schoolId, name: 'Form 1 East',  form: 'Form 1' },
    { id: uuid(), school_id: schoolId, name: 'Form 2 East',  form: 'Form 2' },
    { id: uuid(), school_id: schoolId, name: 'Form 3 East',  form: 'Form 3' },
    { id: uuid(), school_id: schoolId, name: 'Form 4 East',  form: 'Form 4' },
  ];
  for (const s of streams) await db('streams').insert(s).onConflict('id').ignore();

  // ── CBE Pathways ───────────────────────────────────────
  const pathways = [
    { id: uuid(), school_id: schoolId, pathway_name: 'stem',            description: 'Science, Technology, Engineering & Mathematics' },
    { id: uuid(), school_id: schoolId, pathway_name: 'social_sciences', description: 'History, Geography, Economics & Languages' },
    { id: uuid(), school_id: schoolId, pathway_name: 'arts_sports',     description: 'Arts, Music, Drama & Sports Science' },
  ];
  for (const p of pathways) await db('cbe_pathways').insert(p).onConflict('id').ignore();

  // ── Subjects ───────────────────────────────────────────
  const subjects844 = [
    { name: 'Mathematics',       code: 'MAT', curriculum_mode: 'eight_four_four' },
    { name: 'English',           code: 'ENG', curriculum_mode: 'eight_four_four' },
    { name: 'Kiswahili',         code: 'KIS', curriculum_mode: 'eight_four_four' },
    { name: 'Biology',           code: 'BIO', curriculum_mode: 'eight_four_four' },
    { name: 'Chemistry',         code: 'CHE', curriculum_mode: 'eight_four_four' },
    { name: 'Physics',           code: 'PHY', curriculum_mode: 'eight_four_four' },
    { name: 'History',           code: 'HIS', curriculum_mode: 'eight_four_four' },
    { name: 'Geography',         code: 'GEO', curriculum_mode: 'eight_four_four' },
    { name: 'Business Studies',  code: 'BST', curriculum_mode: 'eight_four_four' },
    { name: 'Computer Studies',  code: 'CMP', curriculum_mode: 'eight_four_four' },
  ];
  const subjectsCBE = [
    { name: 'Integrated Science',              code: 'ISC', curriculum_mode: 'cbe' },
    { name: 'Social Studies',                  code: 'SST', curriculum_mode: 'cbe' },
    { name: 'Creative Arts and Sports',        code: 'CAS', curriculum_mode: 'cbe' },
    { name: 'Pre-Technical Education',         code: 'PTE', curriculum_mode: 'cbe' },
    { name: 'Agriculture and Nutrition',       code: 'AGN', curriculum_mode: 'cbe' },
  ];
  const allSubjects = [...subjects844, ...subjectsCBE];
  const subjectIds: Record<string, string> = {};
  for (const s of allSubjects) {
    const id = uuid();
    subjectIds[s.code] = id;
    await db('subjects').insert({ id, school_id: schoolId, ...s, is_active: true }).onConflict('id').ignore();
  }

  // ── 8-4-4 Students ────────────────────────────────────
  const stream4 = streams.find(s => s.form === 'Form 4')!;
  const stream3 = streams.find(s => s.form === 'Form 3')!;

  const students844 = [
    { full_name: 'Alice Wambui Kamau',     admission_number: 'UHS/2023/001', current_form: 'Form 4', stream_id: stream4.id, kcpe_score: 380, gender: 'female', intake_year: 2023 },
    { full_name: 'Brian Ochieng Otieno',   admission_number: 'UHS/2023/002', current_form: 'Form 4', stream_id: stream4.id, kcpe_score: 362, gender: 'male',   intake_year: 2023 },
    { full_name: 'Carol Njeri Mwangi',     admission_number: 'UHS/2024/001', current_form: 'Form 3', stream_id: stream3.id, kcpe_score: 371, gender: 'female', intake_year: 2024 },
    { full_name: 'David Kiprop Koech',     admission_number: 'UHS/2024/002', current_form: 'Form 3', stream_id: stream3.id, kcpe_score: 348, gender: 'male',   intake_year: 2024 },
  ];

  // ── CBE Students ───────────────────────────────────────
  const stemPathway = pathways.find(p => p.pathway_name === 'stem')!;

  const studentsCBE = [
    { full_name: 'Emma Akinyi Oloo',       admission_number: 'UHS/2025/001', current_grade: 9, school_level: 'junior',  kpsea_score: 82.5, gender: 'female', intake_year: 2025 },
    { full_name: 'Felix Mutua Musyoka',    admission_number: 'UHS/2025/002', current_grade: 9, school_level: 'junior',  kpsea_score: 76.0, gender: 'male',   intake_year: 2025 },
    { full_name: 'Grace Wanjiku Njoroge',  admission_number: 'UHS/2026/001', current_grade: 10, school_level: 'senior', pathway_id: stemPathway.id, kpsea_score: 88.0, gender: 'female', intake_year: 2026 },
    { full_name: 'Hassan Omar Abdullah',   admission_number: 'UHS/2026/002', current_grade: 10, school_level: 'senior', pathway_id: stemPathway.id, kpsea_score: 79.5, gender: 'male',   intake_year: 2026 },
  ];

  const allStudents = [
    ...students844.map(s => ({
      ...s, id: uuid(), school_id: schoolId,
      curriculum_mode: 'eight_four_four',
      boarding_house: 'Block A', dormitory: 'Dorm 1',
      status: 'active', bursary_status: false
    })),
    ...studentsCBE.map(s => ({
      ...s, id: uuid(), school_id: schoolId,
      curriculum_mode: 'cbe',
      boarding_house: 'Block B', dormitory: 'Dorm 2',
      status: 'active', bursary_status: false
    })),
  ];

  for (const student of allStudents) {
    await db('students').insert(student).onConflict(['school_id','admission_number']).ignore();

    // Guardian
    await db('guardians').insert({
      id: uuid(), school_id: schoolId,
      student_id: student.id,
      full_name: `Parent of ${student.full_name.split(' ')[0]}`,
      relationship: 'father',
      phone: `+2547${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: `parent.${student.admission_number.replace(/\//g,'')}@gmail.com`,
      is_primary: true,
      password_hash: hash,
      portal_access: true
    }).onConflict('id').ignore();
  }

  // ── Fee structure ──────────────────────────────────────
  await db('fee_structures').insert({
    id: uuid(), school_id: schoolId,
    name: 'All Students Term 1 2026',
    curriculum_mode: 'both',
    applicable_level: null,
    applicable_pathway: 'all',
    term: 1, academic_year: 2026,
    line_items: JSON.stringify([
      { name: 'Tuition',      amount: 15000 },
      { name: 'Boarding',     amount: 12000 },
      { name: 'Meals',        amount: 8000  },
      { name: 'Activities',   amount: 2000  },
      { name: 'Exam',         amount: 1500  },
      { name: 'PTA',          amount: 500   },
    ]),
    total_amount: 39000,
    due_date: new Date('2026-02-15'),
    is_active: true
  }).onConflict('id').ignore();

  console.log(`\nSeed complete!`);
  console.log(`School: Uhuru Boarding High School (${schoolId})`);
  console.log(`Staff: ${staffData.length} users created`);
  console.log(`Students: ${allStudents.length} (${students844.length} × 8-4-4, ${studentsCBE.length} × CBE)`);
  console.log(`\nLogin credentials (all accounts):`);
  console.log(`  Principal:  principal@uhuruhs.ac.ke / Demo@1234`);
  console.log(`  Bursar:     bursar@uhuruhs.ac.ke / Demo@1234`);
  console.log(`  Teacher:    maths@uhuruhs.ac.ke / Demo@1234`);

  await db.destroy();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
