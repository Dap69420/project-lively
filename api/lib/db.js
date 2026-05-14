const connectionString = process.env.NEON_COURSES_DATABASE_URL || '';

if (!connectionString) {
  console.warn('NEON_COURSES_DATABASE_URL not configured. DB functions will throw until configured.');

  async function _missing() {
    throw new Error('NEON_COURSES_DATABASE_URL not configured');
  }

  module.exports = {
    query: async () => { return _missing(); },
    getClient: async () => { return _missing(); },
    pool: null,
  };
} else {
  // Require pg only when a connection string is configured
  const { Pool } = require('pg');

  // Neon database connection with pooling
  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  async function query(text, params) {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async function getClient() {
    const client = await pool.connect();
    return client;
  }

  module.exports = {
    query,
    getClient,
    pool,
  };
}
