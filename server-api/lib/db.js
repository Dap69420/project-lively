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
      ai_settings JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by UUID,
      is_active BOOLEAN DEFAULT true
    );

    ALTER TABLE courses ADD COLUMN IF NOT EXISTS objectives JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS card_style JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT '{}'::jsonb;

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

    CREATE TABLE IF NOT EXISTS course_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      user_course_id UUID REFERENCES user_courses(id) ON DELETE SET NULL,
      content TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, course_id)
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

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id UUID PRIMARY KEY,
      username VARCHAR(40) UNIQUE NOT NULL,
      display_name VARCHAR(80) DEFAULT '',
      avatar_url TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      icon VARCHAR(100) DEFAULT 'icon-award',
      color VARCHAR(120) DEFAULT 'from-purple-500 to-neonViolet',
      condition_type VARCHAR(80) DEFAULT 'total_xp',
      condition_value INTEGER DEFAULT 1,
      is_active BOOLEAN DEFAULT true,
      sort_index INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      user_id UUID NOT NULL,
      achievement_id VARCHAR(100) NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
      unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, achievement_id)
    );

    INSERT INTO achievements (id, name, description, icon, color, condition_type, condition_value, sort_index)
    VALUES
      ('first-steps', 'First Steps', 'Earn 25 XP', 'icon-sparkles', 'from-purple-500 to-neonViolet', 'total_xp', 25, 10),
      ('level-3', 'Level 3 Unlocked', 'Reach level 3', 'icon-trophy', 'from-blue-400 to-cyan-500', 'level', 3, 20),
      ('streak-3', 'Three Day Streak', 'Keep learning for 3 days', 'icon-flame', 'from-orange-400 to-red-500', 'streak', 3, 30),
      ('coin-runner', 'Coin Runner', 'Collect 100 coins', 'icon-coins', 'from-yellow-400 to-amber-500', 'coins', 100, 40),
      ('quiz-wins', 'Quiz Wins', 'Get 5 strong answers', 'icon-message-square', 'from-green-400 to-emerald-500', 'correct_answers', 5, 50),
      ('course-master', 'Course Master', 'Complete 1 course', 'icon-book-open', 'from-pink-400 to-fuchsia-500', 'courses_completed', 1, 60)
    ON CONFLICT (id) DO NOTHING;

    CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON user_courses(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_courses_course_id ON user_courses(course_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_course_id ON chat_messages(course_id);
    CREATE INDEX IF NOT EXISTS idx_course_notes_user_id ON course_notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_course_notes_course_id ON course_notes(course_id);
    CREATE INDEX IF NOT EXISTS idx_courses_subject_grade ON courses(subject, grade);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
    CREATE INDEX IF NOT EXISTS idx_achievements_sort_index ON achievements(sort_index);
    CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
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
