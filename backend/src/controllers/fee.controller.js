const db = require('../config/database');
const { v4: uuid } = require('uuid');
const smsService = require('../services/sms.service');

exports.getFeeStructures = async (req, res, next) => {
  try {
    const structures = await db('fee_structures')
      .where({ school_id: req.school_id, is_active: true })
      .orderBy('academic_year', 'desc').orderBy('term');
    res.json(structures);
  } catch (err) { next(err); }
};

exports.createFeeStructure = async (req, res, next) => {
  try {
    const { name, applicable_level, applicable_pathway, term, academic_year, line_items, due_date, curriculum_mode } = req.body;
    const total_amount = line_items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const [structure] = await db('fee_structures').insert({
      id: uuid(), school_id: req.school_id,
      name, curriculum_mode: curriculum_mode || 'both',
      applicable_level, applicable_pathway: applicable_pathway || 'all',
      term, academic_year, line_items: JSON.stringify(line_items),
      total_amount, due_date, is_active: true
    }).returning('*');
    res.status(201).json(structure);
  } catch (err) { next(err); }
};

exports.generateInvoices = async (req, res, next) => {
  try {
    const { term, academic_year, fee_structure_id } = req.body;
    const structure = await db('fee_structures').where({ id: fee_structure_id, school_id: req.school_id }).first();
    if (!structure) return res.status(404).json({ error: 'Fee structure not found' });

    // Get all active students for this level
    let studentsQuery = db('students').where({ school_id: req.school_id, status: 'active' });
    if (structure.applicable_level) {
      if (structure.applicable_level.startsWith('Form')) {
        studentsQuery = studentsQuery.where('current_form', structure.applicable_level);
      } else {
        studentsQuery = studentsQuery.where('current_grade', parseInt(structure.applicable_level.replace('Grade ', '')));
      }
    }
    const students = await studentsQuery;

    let created = 0, skipped = 0;
    const trx = await db.transaction();
    try {
      for (const student of students) {
        const existing = await trx('fee_invoices').where({ student_id: student.id, term, academic_year }).first();
        if (existing) { skipped++; continue; }

        const bursaryDeduction = student.bursary_status ? (student.bursary_amount || 0) : 0;
        const netPayable = Math.max(0, structure.total_amount - bursaryDeduction);

        await trx('fee_invoices').insert({
          id: uuid(), school_id: req.school_id,
          student_id: student.id, fee_structure_id,
          term, academic_year,
          total_amount: structure.total_amount,
          bursary_deduction: bursaryDeduction,
          net_payable: netPayable, amount_paid: 0,
          balance: netPayable,
          due_date: structure.due_date,
          status: 'unpaid'
        });
        created++;
      }
      await trx.commit();
      res.json({ created, skipped, total: students.length });
    } catch (e) { await trx.rollback(); throw e; }
  } catch (err) { next(err); }
};

exports.getStudentInvoice = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { term, academic_year } = req.query;
    let query = db('fee_invoices as fi')
      .join('fee_structures as fs', 'fi.fee_structure_id', 'fs.id')
      .where({ 'fi.student_id': student_id, 'fi.school_id': req.school_id })
      .select('fi.*', 'fs.name as structure_name', 'fs.line_items');
    if (term) query = query.where('fi.term', parseInt(term));
    if (academic_year) query = query.where('fi.academic_year', parseInt(academic_year));
    const invoices = await query.orderBy('fi.academic_year', 'desc').orderBy('fi.term', 'desc');
    res.json(invoices);
  } catch (err) { next(err); }
};

exports.recordManualPayment = async (req, res, next) => {
  try {
    const { invoice_id, amount, payment_method, bank_reference, notes } = req.body;
    const invoice = await db('fee_invoices').where({ id: invoice_id, school_id: req.school_id }).first();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const trx = await db.transaction();
    try {
      const [payment] = await trx('fee_payments').insert({
        id: uuid(), school_id: req.school_id,
        student_id: invoice.student_id, invoice_id,
        amount, payment_method, bank_reference,
        payment_date: new Date(), recorded_by: req.user.id, notes
      }).returning('*');

      const newPaid = parseFloat(invoice.amount_paid) + parseFloat(amount);
      const newBalance = Math.max(0, parseFloat(invoice.net_payable) - newPaid);
      const status = newBalance === 0 ? 'paid' : 'partial';

      await trx('fee_invoices').where({ id: invoice_id }).update({
        amount_paid: newPaid, balance: newBalance, status, updated_at: new Date()
      });

      await trx.commit();

      // Send SMS receipt
      const student = await db('students').where({ id: invoice.student_id }).first();
      const guardian = await db('guardians').where({ student_id: invoice.student_id, is_primary: true }).first();
      if (guardian?.phone) {
        await smsService.send(guardian.phone,
          `Shule360: Payment of KES ${amount} received for ${student.full_name}. Balance: KES ${newBalance.toFixed(2)}. Ref: ${payment.id.slice(0, 8).toUpperCase()}`
        );
      }

      res.status(201).json({ payment, new_balance: newBalance, status });
    } catch (e) { await trx.rollback(); throw e; }
  } catch (err) { next(err); }
};

exports.getBursarDashboard = async (req, res, next) => {
  try {
    const { term, academic_year } = req.query;
    const [totals, defaulters, recentPayments] = await Promise.all([
      db('fee_invoices')
        .where({ school_id: req.school_id, term: parseInt(term), academic_year: parseInt(academic_year) })
        .select(
          db.raw('SUM(net_payable) as total_expected'),
          db.raw('SUM(amount_paid) as total_collected'),
          db.raw('SUM(balance) as total_outstanding'),
          db.raw('COUNT(*) as total_invoices'),
          db.raw('COUNT(CASE WHEN status = \'paid\' THEN 1 END) as fully_paid'),
          db.raw('COUNT(CASE WHEN status = \'overdue\' THEN 1 END) as overdue')
        ).first(),
      db('fee_invoices as fi')
        .join('students as s', 'fi.student_id', 's.id')
        .where({ 'fi.school_id': req.school_id, 'fi.term': parseInt(term), 'fi.academic_year': parseInt(academic_year) })
        .whereIn('fi.status', ['unpaid','partial','overdue'])
        .where('fi.balance', '>', 0)
        .select('s.full_name', 's.admission_number', 'fi.balance', 'fi.status', 'fi.due_date')
        .orderBy('fi.balance', 'desc').limit(50),
      db('fee_payments as fp')
        .join('students as s', 'fp.student_id', 's.id')
        .where({ 'fp.school_id': req.school_id })
        .select('fp.*', 's.full_name', 's.admission_number')
        .orderBy('fp.payment_date', 'desc').limit(20)
    ]);
    res.json({ totals, defaulters, recent_payments: recentPayments });
  } catch (err) { next(err); }
};
