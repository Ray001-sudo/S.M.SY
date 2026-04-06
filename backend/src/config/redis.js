const { createClient } = require('redis');
const logger = require('../utils/logger');

let client;

async function connectRedis() {
  client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  client.on('error', err => logger.error('Redis error:', err));
  await client.connect();
  logger.info('Redis connected');
  return client;
}

function getRedis() {
  if (!client) throw new Error('Redis not initialised. Call connectRedis() first.');
  return client;
}

module.exports = { connectRedis, getRedis };
