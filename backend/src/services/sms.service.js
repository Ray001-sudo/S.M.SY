const axios = require('axios');
const logger = require('../utils/logger');

const AT_BASE = 'https://api.africastalking.com/version1/messaging';

exports.send = async (to, message) => {
  if (process.env.NODE_ENV === 'development') {
    logger.info(`[SMS DEV] To: ${to} | Message: ${message}`);
    return { status: 'dev_mock', to, message };
  }
  try {
    const res = await axios.post(AT_BASE, new URLSearchParams({
      username: process.env.AT_USERNAME || 'sandbox',
      to,
      message,
      from: process.env.AT_SENDER_ID || 'SHULE360'
    }), {
      headers: {
        apiKey: process.env.AT_API_KEY,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    logger.info(`SMS sent to ${to}: ${res.data.SMSMessageData?.Message}`);
    return res.data;
  } catch (err) {
    logger.error(`SMS failed to ${to}:`, err.message);
    return null;
  }
};

exports.sendBulk = async (recipients, message) => {
  const numbers = recipients.join(',');
  return exports.send(numbers, message);
};

// Template messages
exports.templates = {
  feePayment: (name, amount, balance, ref) =>
    `Shule360: KES ${amount} received for ${name}. Ref: ${ref}. Balance: KES ${balance}.`,
  feeReminder: (name, balance, dueDate) =>
    `Shule360: Reminder — KES ${balance} outstanding for ${name} due ${dueDate}. Pay via M-Pesa Paybill.`,
  gradeAlert: (name, subject, current, previous) =>
    `Shule360: ${name}'s ${subject} grade has dropped from ${previous}% to ${current}%. Please contact the school.`,
  riskAlert: (name) =>
    `Shule360: ${name} may need academic support. Please log in to the parent portal or contact the class teacher.`,
  reportReady: (name, term) =>
    `Shule360: ${name}'s Term ${term} report card is ready. Log in to the parent portal to view it.`,
  kjseaResult: (name, score) =>
    `Shule360: ${name}'s KJSEA composite score is ${score}. Log in to view the full result and pathway options.`,
};
