const axios = require('axios');
const db = require('../config/database');
const { v4: uuid } = require('uuid');
const smsService = require('./sms.service');
const logger = require('../utils/logger');

const DARAJA_BASE = process.env.MPESA_ENVIRONMENT === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

async function getAccessToken() {
  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');
  const res = await axios.get(`${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` }
  });
  return res.data.access_token;
}

function generatePassword(timestamp) {
  const raw = `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`;
  return Buffer.from(raw).toString('base64');
}

// STK Push — parent self-service payment
exports.stkPush = async ({ phone, amount, accountRef, description }) => {
  const token = await getAccessToken();
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const res = await axios.post(`${DARAJA_BASE}/mpesa/stkpush/v1/processrequest`, {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: generatePassword(timestamp),
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount),
    PartyA: phone.replace('+', ''),
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone.replace('+', ''),
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: accountRef,
    TransactionDesc: description || 'School Fees'
  }, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

// Handle Daraja STK Push callback
exports.handleStkCallback = async (req, res) => {
  try {
    const { Body: { stkCallback } } = req.body;
    const { ResultCode, CheckoutRequestID, CallbackMetadata } = stkCallback;

    if (ResultCode !== 0) {
      logger.warn(`STK Push failed: ${stkCallback.ResultDesc}`);
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const meta = {};
    CallbackMetadata.Item.forEach(({ Name, Value }) => { meta[Name] = Value; });

    const { Amount, MpesaReceiptNumber, PhoneNumber } = meta;

    // Find invoice by phone -> guardian -> student
    const guardian = await db('guardians')
      .where(db.raw("replace(phone, '+', '') = ?", [String(PhoneNumber)]))
      .first();

    if (guardian) {
      const invoice = await db('fee_invoices')
        .where({ student_id: guardian.student_id })
        .where('status', '!=', 'paid')
        .orderBy('created_at', 'desc').first();

      if (invoice) {
        // Idempotency check
        const exists = await db('fee_payments').where({ mpesa_transaction_code: MpesaReceiptNumber }).first();
        if (!exists) {
          const trx = await db.transaction();
          try {
            await trx('fee_payments').insert({
              id: uuid(),
              school_id: invoice.school_id,
              student_id: invoice.student_id,
              invoice_id: invoice.id,
              amount: Amount,
              payment_method: 'mpesa_stk',
              mpesa_transaction_code: MpesaReceiptNumber,
              mpesa_phone: String(PhoneNumber),
              payment_date: new Date(),
              is_verified: true
            });

            const newPaid = parseFloat(invoice.amount_paid) + Amount;
            const newBalance = Math.max(0, parseFloat(invoice.net_payable) - newPaid);
            const status = newBalance === 0 ? 'paid' : 'partial';

            await trx('fee_invoices').where({ id: invoice.id }).update({
              amount_paid: newPaid, balance: newBalance, status, updated_at: new Date()
            });

            await trx.commit();

            const student = await db('students').where({ id: invoice.student_id }).first();
            await smsService.send(String(PhoneNumber),
              `Shule360: KES ${Amount} received for ${student.full_name}. Ref: ${MpesaReceiptNumber}. Balance: KES ${newBalance.toFixed(2)}.`
            );

            logger.info(`M-Pesa payment recorded: ${MpesaReceiptNumber} KES ${Amount}`);
          } catch (e) { await trx.rollback(); throw e; }
        }
      }
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    logger.error('STK callback error:', err);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' }); // always 200 to Safaricom
  }
};

// C2B Paybill callback (parent pays via M-Pesa menu)
exports.handleC2BCallback = async (req, res) => {
  try {
    const { TransID, Amount, MSISDN, BillRefNumber } = req.body;

    const exists = await db('fee_payments').where({ mpesa_transaction_code: TransID }).first();
    if (exists) return res.json({ ResultCode: 0 });

    // BillRefNumber = student admission number
    const student = await db('students').where({ admission_number: BillRefNumber }).first();
    if (!student) return res.json({ ResultCode: 0 });

    const invoice = await db('fee_invoices')
      .where({ student_id: student.id })
      .where('status', '!=', 'paid')
      .orderBy('created_at', 'desc').first();

    if (invoice) {
      const trx = await db.transaction();
      try {
        await trx('fee_payments').insert({
          id: uuid(),
          school_id: student.school_id,
          student_id: student.id,
          invoice_id: invoice.id,
          amount: Amount,
          payment_method: 'mpesa_paybill',
          mpesa_transaction_code: TransID,
          mpesa_phone: MSISDN,
          payment_date: new Date(),
          is_verified: true
        });

        const newPaid = parseFloat(invoice.amount_paid) + Amount;
        const newBalance = Math.max(0, parseFloat(invoice.net_payable) - newPaid);
        await trx('fee_invoices').where({ id: invoice.id }).update({
          amount_paid: newPaid, balance: newBalance,
          status: newBalance === 0 ? 'paid' : 'partial',
          updated_at: new Date()
        });
        await trx.commit();
        logger.info(`C2B payment: ${TransID} KES ${Amount} for student ${student.admission_number}`);
      } catch (e) { await trx.rollback(); }
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    logger.error('C2B callback error:', err);
    res.json({ ResultCode: 0 });
  }
};
