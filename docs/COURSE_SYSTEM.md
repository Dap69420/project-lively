# Dynamic Course Management System - API Documentation

## Overview
The course system uses Neon PostgreSQL database to manage:
- **Courses**: Templates for all available courses
- **User Courses**: Per-user progress tracking
- **Chat Messages**: Persisted chat history
- **User Progression**: Global stats (XP, coins, levels)

## Database Schema

### `courses` table
Stores course templates with AI configuration:
```sql
{
  id: UUID (primary key),
  title: string,
  description: text,
  subject: string,
  grade: string (e.g., "9"),
  topic: string,
  difficulty: string ("beginner", "intermediate", "advanced"),
  ai_prompt: text (custom AI instruction for this course),
  ai_aim: text (learning objective),
  completion_xp: integer (default 250),
  completion_coins: integer (default 50),
  thumbnail_url: string,
  prerequisites: JSON array,
  lessons: JSON array,
  is_active: boolean,
  created_at: timestamp,
  updated_at: timestamp
}
```

### `user_courses` table
Tracks each user's progress per course:
```sql
{
  id: UUID,
  user_id: UUID,
  course_id: UUID,
  progress_percentage: integer (0-100),
  level: integer,
  xp_in_course: integer,
  coins_earned: integer,
  completed: boolean,
  completed_at: timestamp,
  stats: JSON { lessonsCompleted, questionsAnswered, etc },
  started_at: timestamp,
  updated_at: timestamp
}
```

### `chat_messages` table
Persists all chat history per course:
```sql
{
  id: UUID,
  user_id: UUID,
  course_id: UUID,
  user_course_id: UUID (optional reference),
  role: string ("user" or "assistant"),
  text: text,
  metadata: JSON,
  created_at: timestamp
}
```

### `user_progression` table
Global user stats aggregated across all courses:
```sql
{
  id: UUID,
  user_id: UUID (unique),
  total_xp: integer,
  total_coins: integer,
  global_level: integer (calculated from XP),
  current_streak: integer,
  longest_streak: integer,
  last_activity: timestamp,
  total_courses_started: integer,
  total_courses_completed: integer,
  created_at: timestamp,
  updated_at: timestamp
}
```

---

## API Endpoints

### 1. **GET /api/courses** - List all courses
**Query Parameters:**
- `subject` (optional): Filter by subject
- `grade` (optional): Filter by grade

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Algebra Fundamentals",
      "subject": "Mathematics",
      "grade": "9",
      "topic": "Linear Equations",
      "difficulty": "intermediate",
      "ai_prompt": "You are a math tutor...",
      "completion_xp": 250,
      "completion_coins": 50,
      ...
    }
  ],
  "count": 12
}
```

---

### 2. **GET /api/courses?id={courseId}** - Get single course
**Response:**
```json
{
  "success": true,
  "data": { ...course object }
}
```

---

### 3. **POST /api/courses** - Create new course
**Request Body:**
```json
{
  "title": "Algebra Fundamentals",
  "description": "Learn the basics of linear equations",
  "subject": "Mathematics",
  "grade": "9",
  "topic": "Linear Equations",
  "difficulty": "intermediate",
  "ai_prompt": "You are a Mathematics tutor specializing in algebra for grade 9. Focus on linear equations, solving for variables...",
  "ai_aim": "Help students understand and solve linear equations",
  "completion_xp": 250,
  "completion_coins": 50,
  "thumbnail_url": "https://...",
  "lessons": [
    { "id": 1, "title": "What are Variables?" },
    { "id": 2, "title": "Solving Simple Equations" }
  ]
}
```

---

### 4. **PATCH /api/courses?id={courseId}** - Update course
**Request Body:** (any subset of course fields)
```json
{
  "title": "Updated Title",
  "ai_prompt": "Updated AI prompt...",
  "completion_xp": 300
}
```

---

### 5. **DELETE /api/courses?id={courseId}** - Delete course (soft delete)
Sets `is_active = false`

---

### 6. **GET /api/user/courses?userId={userId}** - Get user's courses
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_course_id",
      "user_id": "uuid",
      "course_id": "uuid",
      "title": "Algebra Fundamentals",
      "subject": "Mathematics",
      "progress_percentage": 45,
      "level": 2,
      "xp_in_course": 450,
      "coins_earned": 20,
      "completed": false,
      "stats": {
        "lessonsCompleted": 3,
        "questionsAnswered": 12,
        "correctAnswers": 10
      },
      "updated_at": "2026-05-14T..."
    }
  ],
  "count": 3
}
```

---

### 7. **POST /api/user/courses** - Enroll user in course
**Request Body:**
```json
{
  "courseId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": { ...new user_course entry }
}
```

---

### 8. **PATCH /api/user/courses** - Update course progress
**Request Body:**
```json
{
  "userCourseId": "uuid",
  "progress_percentage": 50,
  "xp_in_course": 500,
  "coins_earned": 30,
  "completed": false,
  "stats": {
    "lessonsCompleted": 4,
    "questionsAnswered": 15,
    "correctAnswers": 13
  }
}
```

---

### 9. **GET /api/chat/messages?userId={userId}&courseId={courseId}** - Load chat history
**Query Parameters:**
- `limit` (default 50): Number of messages
- `offset` (default 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "role": "user",
      "text": "How do I solve 2x + 5 = 13?",
      "created_at": "2026-05-14T...",
      "metadata": {}
    },
    {
      "id": "uuid",
      "role": "assistant",
      "text": "To solve 2x + 5 = 13...",
      "created_at": "2026-05-14T..."
    }
  ],
  "total": 120,
  "count": 50
}
```

---

### 10. **POST /api/chat/messages** - Save chat message
**Request Body:**
```json
{
  "userId": "uuid",
  "courseId": "uuid",
  "userCourseId": "uuid (optional)",
  "role": "user",
  "text": "How do I solve this equation?",
  "metadata": { "sentiment": "positive" }
}
```

---

### 11. **GET /api/progress?userId={userId}** - Get user's global progression
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "total_xp": 1250,
    "total_coins": 180,
    "global_level": 2,
    "current_streak": 5,
    "longest_streak": 12,
    "total_courses_started": 3,
    "total_courses_completed": 1,
    "last_activity": "2026-05-14T..."
  }
}
```

---

### 12. **POST /api/progress?userId={userId}** - Award XP/coins
**Request Body:**
```json
{
  "xp": 100,
  "coins": 20
}
```

**Response:**
```json
{
  "success": true,
  "message": "Awarded 100 XP and 20 coins",
  "data": { ...updated user_progression }
}
```

---

### 13. **PATCH /api/progress?userId={userId}** - Update progression
**Request Body:**
```json
{
  "total_xp": 1300,
  "global_level": 2,
  "current_streak": 6,
  "total_courses_completed": 1
}
```

---

### 14. **GET /api/admin/courses?adminKey={key}** - List all courses (admin)
Returns course data with enrollment/completion stats.

---

### 15. **POST /api/admin/courses?adminKey={key}** - Create course (admin form)
Same as `/api/courses` POST but with admin verification.

---

### 16. **PATCH /api/admin/courses?adminKey={key}** - Update course (admin)
**Request Body:**
```json
{
  "courseId": "uuid",
  "title": "New Title",
  "ai_prompt": "...",
  "completion_xp": 300
}
```

---

## Frontend Integration Examples

### Get All Courses
```javascript
const courses = await fetch('/api/courses?subject=Mathematics&grade=9')
  .then(r => r.json());
console.log(courses.data); // Array of course objects
```

### Enroll User in Course
```javascript
const enrollment = await fetch('/api/user/courses?userId=user-123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ courseId: 'course-xyz' })
}).then(r => r.json());
```

### Save Chat Message
```javascript
await fetch('/api/chat/messages?userId=user-123&courseId=course-xyz', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    role: 'user',
    text: 'How do I solve this?'
  })
});
```

### Award XP to User
```javascript
const updated = await fetch('/api/progress?userId=user-123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    xp: 100,
    coins: 20
  })
}).then(r => r.json());
```

---

## Course Creation Form Example

See `public/components/admin/CourseForm.js` for a complete React form for creating courses.

---

## Database Setup

**Run migrations:**
```bash
psql $NEON_COURSES_DATABASE_URL -f db/migrations/001_init_schema.sql
```

**Verify setup:**
```bash
psql $NEON_COURSES_DATABASE_URL -c "\\dt"  # List all tables
```

---

## Total API Paths Used: 5/12 ✅
- `/api/courses`
- `/api/user/courses`
- `/api/chat/messages`
- `/api/progress`
- `/api/admin/courses`

**Existing paths (3):**
- `/api/ai/chat`
- `/api/ai/vision`
- `/api/config`

**Total: 8/12 remaining capacity for future endpoints**
