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

  const schemaSql = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS courses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      subject VARCHAR(100),
      grade VARCHAR(10),
      topic VARCHAR(255),
      difficulty VARCHAR(50) DEFAULT 'intermediate',
      ai_prompt TEXT NOT NULL,
      ai_aim TEXT,
      completion_xp INTEGER DEFAULT 250,
      completion_coins INTEGER DEFAULT 50,
      thumbnail_url VARCHAR(500),
      prerequisites JSONB DEFAULT '[]'::jsonb,
      lessons JSONB DEFAULT '[]'::jsonb,
      objectives JSONB DEFAULT '[]'::jsonb,
      card_style JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by UUID,
      is_active BOOLEAN DEFAULT true
    );

    ALTER TABLE courses ADD COLUMN IF NOT EXISTS objectives JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS card_style JSONB DEFAULT '{}'::jsonb;

    CREATE TABLE IF NOT EXISTS user_courses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      progress_percentage INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      xp_in_course INTEGER DEFAULT 0,
      coins_earned INTEGER DEFAULT 0,
      completed BOOLEAN DEFAULT false,
      completed_at TIMESTAMP,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      stats JSONB DEFAULT '{
        "lessonsCompleted": 0,
        "questionsAnswered": 0,
        "correctAnswers": 0,
        "sketchesAnalyzed": 0,
        "totalTimeSpent": 0
      }'::jsonb,
      UNIQUE(user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      user_course_id UUID REFERENCES user_courses(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL,
      text TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_progression (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE,
      total_xp INTEGER DEFAULT 0,
      total_coins INTEGER DEFAULT 0,
      global_level INTEGER DEFAULT 1,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_activity TIMESTAMP,
      total_courses_started INTEGER DEFAULT 0,
      total_courses_completed INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON user_courses(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_courses_course_id ON user_courses(course_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_course_id ON chat_messages(course_id);
    CREATE INDEX IF NOT EXISTS idx_courses_subject_grade ON courses(subject, grade);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
  `;

  let schemaReadyPromise = null;

  async function ensureSchema() {
    if (!schemaReadyPromise) {
      schemaReadyPromise = pool.query(schemaSql).catch((error) => {
        schemaReadyPromise = null;
        throw error;
      });
    }

    return schemaReadyPromise;
  }

  async function query(text, params) {
    const start = Date.now();
    try {
      await ensureSchema();
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
    await ensureSchema();
    const client = await pool.connect();
    return client;
  }

  module.exports = {
    query,
    getClient,
    pool,
  };
}
