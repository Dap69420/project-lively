-- Courses table (templates for all available courses)
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(100),
  grade VARCHAR(10),
  topic VARCHAR(255),
  difficulty VARCHAR(50) DEFAULT 'intermediate',
  
  -- AI Configuration
  ai_prompt TEXT NOT NULL,
  ai_aim TEXT,
  
  -- Rewards
  completion_xp INTEGER DEFAULT 250,
  completion_coins INTEGER DEFAULT 50,
  
  -- Metadata
  thumbnail_url VARCHAR(500),
  prerequisites JSONB DEFAULT '[]'::jsonb,
  lessons JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  is_active BOOLEAN DEFAULT true
);

-- User Courses (tracks per-user progress)
CREATE TABLE IF NOT EXISTS user_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Progress
  progress_percentage INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  xp_in_course INTEGER DEFAULT 0,
  coins_earned INTEGER DEFAULT 0,
  
  -- Completion
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  
  -- Timestamps
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Stats
  stats JSONB DEFAULT '{
    "lessonsCompleted": 0,
    "questionsAnswered": 0,
    "correctAnswers": 0,
    "sketchesAnalyzed": 0,
    "totalTimeSpent": 0
  }'::jsonb,
  
  UNIQUE(user_id, course_id)
);

-- Chat messages (persisted per course)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_course_id UUID REFERENCES user_courses(id) ON DELETE CASCADE,
  
  role VARCHAR(50) NOT NULL, -- 'user' or 'assistant'
  text TEXT NOT NULL,
  
  -- Optional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course notes (one notes document per user per course)
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

-- User Progression (global stats)
CREATE TABLE IF NOT EXISTS user_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  -- Global stats
  total_xp INTEGER DEFAULT 0,
  total_coins INTEGER DEFAULT 0,
  global_level INTEGER DEFAULT 1,
  
  -- Streaks
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity TIMESTAMP,
  
  -- Aggregate stats
  total_courses_started INTEGER DEFAULT 0,
  total_courses_completed INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON user_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_course_id ON user_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_course_id ON chat_messages(course_id);
CREATE INDEX IF NOT EXISTS idx_course_notes_user_id ON course_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_course_notes_course_id ON course_notes(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_subject_grade ON courses(subject, grade);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
