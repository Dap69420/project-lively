# Dynamic Course System - Integration Guide

## Quick Start

### 1. **Set up Database**

Run migrations to create tables:
```bash
psql $NEON_COURSES_DATABASE_URL -f db/migrations/001_init_schema.sql
```

### 2. **Use Custom Hooks in React Components**

Import the hooks from `public/lib/courseHooks.js`:

```javascript
// In your component
const { courses, loading, error } = useCourses();
const { userCourses, loading: loadingUserCourses } = useUserCourses(userId);
const { progression, loading: loadingProgression } = useUserProgression(userId);
const { saveChatMessage } = useChatMessage();
const { enrollCourse, loading: enrollLoading } = useEnrollCourse(userId);
const { awardXpCoins } = useAwardProgress(userId);
const { updateProgress } = useUpdateCourseProgress(userId);
```

### 3. **Create Courses via Admin Panel**

Include the CourseForm component in an admin page:

```javascript
// In admin-app.js or similar
<CourseForm 
  adminKey={process.env.ADMIN_SECRET_KEY}
  onSuccess={(newCourse) => console.log('Course created:', newCourse)}
/>
```

---

## Migration from Hardcoded Courses

### Before (Old Way)
```javascript
const DEFAULT_COURSES = [
  {
    id: 'math-101',
    title: 'Algebra Fundamentals',
    aiPrompt: 'You are a math tutor...',
    rewards: { xp: 250, coins: 50 }
  }
];
```

### After (New Way)
```javascript
// Just fetch from database
const { courses } = useCourses();
// courses now loaded from /api/courses endpoint
```

---

## Complete Workflow Example

### Scenario: User takes a course, answers a question, receives XP

```javascript
function CourseWorkspace({ userId, courseId }) {
  const { courses } = useCourses();
  const { saveChatMessage } = useChatMessage();
  const { awardXpCoins } = useAwardProgress(userId);
  const { updateProgress } = useUpdateCourseProgress(userId);
  const { userCourses } = useUserCourses(userId);

  const currentCourse = courses.find(c => c.id === courseId);
  const userCourseData = userCourses.find(uc => uc.course_id === courseId);

  const handleUserMessage = async (text) => {
    // Save user message
    await saveChatMessage(userId, courseId, 'user', text);

    // Get AI response (call your /api/ai/chat endpoint)
    const aiResponse = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        courseId,
        systemPrompt: currentCourse.ai_prompt
      })
    }).then(r => r.json());

    // Save AI response
    await saveChatMessage(userId, courseId, 'assistant', aiResponse.text);

    // Award XP for engagement (adjust based on your logic)
    await awardXpCoins(10, 2);

    // Update course progress
    const updatedStats = {
      ...userCourseData.stats,
      questionsAnswered: (userCourseData.stats.questionsAnswered || 0) + 1
    };

    await updateProgress(userCourseData.id, {
      progress_percentage: Math.min(100, userCourseData.progress_percentage + 5),
      stats: updatedStats
    });
  };

  return (
    <div>
      <h2>{currentCourse?.title}</h2>
      <p>Progress: {userCourseData?.progress_percentage}%</p>
      {/* Chat interface */}
    </div>
  );
}
```

---

## Adding a New Course (No Code Changes!)

1. Go to admin panel: `admin.html`
2. Click "Create New Course"
3. Fill out the form:
   - **Title**: "Calculus Basics"
   - **Subject**: "Mathematics"
   - **Grade**: "11"
   - **Topic**: "Derivatives"
   - **AI Prompt**: "You are a calculus tutor for grade 11 students..."
   - **XP Reward**: 300
   - **Coins Reward**: 75
4. Click "Create Course"
5. **Done!** Course is now available to all users

---

## API Reference

All endpoints require `userId` in query params (obtained from Supabase auth).

### Load All Courses
```javascript
const courses = await fetch('/api/courses')
  .then(r => r.json());
```

### Get User's Course Progress
```javascript
const userCourses = await fetch(`/api/user/courses?userId=${userId}`)
  .then(r => r.json());
```

### Save Chat Message
```javascript
await fetch(`/api/chat/messages?userId=${userId}&courseId=${courseId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    role: 'user',
    text: 'My question here'
  })
});
```

### Award XP/Coins
```javascript
await fetch(`/api/progress?userId=${userId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ xp: 100, coins: 20 })
});
```

### Load Chat History
```javascript
const messages = await fetch(`/api/chat/messages?userId=${userId}&courseId=${courseId}&limit=50`)
  .then(r => r.json());
```

---

## Database Queries

### See all courses
```sql
SELECT * FROM courses WHERE is_active = true;
```

### See user's progress
```sql
SELECT * FROM user_courses WHERE user_id = 'user-id';
```

### See chat history for a course
```sql
SELECT * FROM chat_messages 
WHERE user_id = 'user-id' AND course_id = 'course-id'
ORDER BY created_at;
```

### See total user stats
```sql
SELECT * FROM user_progression WHERE user_id = 'user-id';
```

---

## Vercel Deployment

### 1. Set environment variables in Vercel:
- `NEON_COURSES_DATABASE_URL` ✅ (already in .env)
- `ADMIN_SECRET_KEY` ✅ (already in .env)

### 2. Commit and push:
```bash
git add -A
git commit -m "Add dynamic course system with Neon database"
git push
```

### 3. Vercel auto-deploys ✅

---

## Troubleshooting

### "Database connection failed"
- Check `NEON_COURSES_DATABASE_URL` in .env
- Verify Neon database is active in https://console.neon.tech

### "Courses not loading"
- Check browser Network tab for `/api/courses` response
- Verify database has courses (run migration first)

### "Chat messages not saving"
- Check that `userId` and `courseId` are valid UUIDs
- Check database logs in Neon console

### "Admin form returns 403"
- Verify `ADMIN_SECRET_KEY` matches between frontend and .env
- Check that key is being passed to CourseForm component

---

## Next Steps

- [ ] Add lesson tracking within courses
- [ ] Create leaderboard system using `user_progression` stats
- [ ] Add course recommendations based on student progress
- [ ] Implement course prerequisites checking
- [ ] Add instructor dashboard to monitor student progress
- [ ] Create certificate system for course completion
