# Quick Start Checklist - Dynamic Course System

## ✅ Pre-Requisites
- [ ] Neon database account set up
- [ ] `.env` file has `NEON_COURSES_DATABASE_URL` ✓ (already in .env)
- [ ] `.env` file has `ADMIN_SECRET_KEY` ✓ (already in .env)
- [ ] Vercel deploy ready

---

## 🚀 Phase 1: Database Setup (5 minutes)

### Task 1.1: Create Database Tables
```bash
# Run this command in your terminal
psql $NEON_COURSES_DATABASE_URL -f db/migrations/001_init_schema.sql
```

**Expected output:**
```
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
...
```

### Task 1.2: Verify Tables Created
```bash
psql $NEON_COURSES_DATABASE_URL -c "\dt"
```

**Expected output:**
```
         List of relations
 Schema |        Name        | Type  | Owner
--------+--------------------+-------+-------
 public | chat_messages      | table | ...
 public | courses            | table | ...
 public | user_courses       | table | ...
 public | user_progression   | table | ...
 (4 rows)
```

✅ If you see 4+ tables, database is ready!

---

## 🎯 Phase 2: Create Admin Page (10 minutes)

### Task 2.1: Create Admin HTML Page
Create file: `public/admin.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vektra - Admin</title>
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
    
    <script src="https://resource.trickle.so/vendor_lib/unpkg/react@18/umd/react.production.min.js"></script>
    <script src="https://resource.trickle.so/vendor_lib/unpkg/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://resource.trickle.so/vendor_lib/unpkg/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://resource.trickle.so/vendor_lib/unpkg/lucide-static@0.516.0/font/lucide.css" rel="stylesheet">
    <script src="/api/config"></script>

    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        neonViolet: '#b026ff',
                        darkBg: '#0a0a0f',
                        glassBg: 'rgba(255, 255, 255, 0.03)',
                        glassBorder: 'rgba(255, 255, 255, 0.08)'
                    }
                }
            }
        }
    </script>

    <style>
        body { @apply bg-darkBg text-white font-sans; }
        @layer components {
            .glass-panel {
                @apply bg-glassBg border border-glassBorder backdrop-blur-xl rounded-2xl;
            }
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel" src="components/admin/CourseForm.js"></script>
    <script type="text/babel" src="admin-app.js"></script>
</body>
</html>
```

### Task 2.2: Create Admin App JS
Create file: `public/admin-app.js`

```javascript
function AdminApp() {
  try {
    return (
      <div className="min-h-screen bg-darkBg p-8">
        {/* Background glow */}
        <div className="fixed top-0 left-0 w-96 h-96 bg-neonViolet rounded-full mix-blend-screen filter blur-3xl opacity-10 pointer-events-none"></div>

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-black tracking-tight mb-2">
              <span className="text-white">ADMIN</span>
              <span className="text-neonViolet"> PANEL</span>
            </h1>
            <p className="text-gray-400 font-mono text-sm">Create and manage courses</p>
          </div>

          {/* Course Form */}
          <CourseForm adminKey="lively_admin_sk_7x9k2m0pq5r8v1w3y6z" />
        </div>
      </div>
    );
  } catch (error) {
    console.error('AdminApp error:', error);
    return <div className="text-white">Error loading admin panel</div>;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AdminApp />);
```

✅ Now you have an admin page!

---

## 🔗 Phase 3: Connect Frontend to Database (15 minutes)

### Task 3.1: Update Workspace Component
**File:** `public/workspace-app.js`

Find this line:
```javascript
const [selectedCourseId, setSelectedCourseId] = React.useState('math-101');
```

**Replace with:**
```javascript
const [selectedCourseId, setSelectedCourseId] = React.useState(null);
const [courses, setCourses] = React.useState([]);
const [coursesLoading, setCoursesLoading] = React.useState(true);

React.useEffect(() => {
  // Load courses from database
  fetch('/api/courses')
    .then(r => r.json())
    .then(result => {
      if (result.success) {
        setCourses(result.data);
        if (result.data.length > 0) {
          setSelectedCourseId(result.data[0].id);
        }
      }
    })
    .catch(err => console.error('Failed to load courses:', err))
    .finally(() => setCoursesLoading(false));
}, []);
```

### Task 3.2: Update Course Selection
In the course selector dropdown, use `courses` instead of hardcoded list:

**Before:**
```javascript
<select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
  <option value="math-101">Algebra Fundamentals</option>
  <option value="math-102">Geometry Basics</option>
</select>
```

**After:**
```javascript
<select value={selectedCourseId || ''} onChange={(e) => setSelectedCourseId(e.target.value)}>
  {courses.map(course => (
    <option key={course.id} value={course.id}>
      {course.title} ({course.subject})
    </option>
  ))}
</select>
```

✅ Workspace now loads courses dynamically!

---

## 💬 Phase 4: Connect Chat to Database (10 minutes)

### Task 4.1: Include Hooks in Workspace
**File:** `public/workspace.html`

Add this line before `workspace-app.js`:
```html
<script type="text/babel" src="lib/courseHooks.js"></script>
```

### Task 4.2: Update AIChat Component
**File:** `public/components/workspace/AIChat.js`

Add at the top of component:
```javascript
// Get userId from Supabase session
const [userId, setUserId] = React.useState(null);

React.useEffect(() => {
  if (window.supabaseClient) {
    window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id);
    });
  }
}, []);

// Load chat from database
const [dbMessages, setDbMessages] = React.useState([]);

React.useEffect(() => {
  if (userId && selectedCourseId) {
    fetch(`/api/chat/messages?userId=${userId}&courseId=${selectedCourseId}`)
      .then(r => r.json())
      .then(result => {
        if (result.success) {
          setDbMessages(result.data);
        }
      });
  }
}, [userId, selectedCourseId]);
```

### Task 4.3: Save Messages to Database
In `handleSend()` function, add:

```javascript
const handleSend = async (userText) => {
  // Save user message to database
  if (userId && selectedCourseId) {
    await fetch(`/api/chat/messages?userId=${userId}&courseId=${selectedCourseId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user', text: userText })
    });
  }

  // Get AI response
  const aiResponse = await getAIResponse(userText);

  // Save AI response to database
  if (userId && selectedCourseId) {
    await fetch(`/api/chat/messages?userId=${userId}&courseId=${selectedCourseId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'assistant', text: aiResponse })
    });
  }

  // Award XP for engagement
  if (userId) {
    await fetch(`/api/progress?userId=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xp: 10, coins: 2 })
    });
  }
};
```

✅ Chat now persists to database!

---

## ✨ Phase 5: Test Everything (10 minutes)

### Test 5.1: Create a Course
1. Go to `http://localhost:3000/admin.html`
2. Fill out the course form:
   - **Title**: "Test Course"
   - **Subject**: "Mathematics"
   - **Grade**: "9"
   - **Topic**: "Test Topic"
   - **AI Prompt**: "You are a helpful teacher"
   - **XP**: 250
   - **Coins**: 50
3. Click "Create Course"
4. See ✅ success message

### Test 5.2: Course Appears in Workspace
1. Go to `http://localhost:3000/workspace.html`
2. Refresh page
3. Check course dropdown - "Test Course" should appear ✅

### Test 5.3: Chat Persists
1. Click on "Test Course"
2. Send a message: "Hello"
3. Refresh page
4. Message should still be there ✅

### Test 5.4: Check Database
```bash
psql $NEON_COURSES_DATABASE_URL
SELECT * FROM courses;
SELECT * FROM chat_messages;
SELECT * FROM user_progression;
```

✅ All data should be there!

---

## 🚀 Phase 6: Deploy to Vercel (5 minutes)

```bash
git add -A
git commit -m "Integrate dynamic course system with Neon database"
git push
```

**Vercel auto-deploys!** ✅

---

## 📊 Verification Checklist

After completing all phases, verify:

- [ ] Database tables created (`\dt` shows 4 tables)
- [ ] Admin page loads at `/admin.html`
- [ ] Course creation form works
- [ ] New courses appear in workspace dropdown
- [ ] Chat messages persist on refresh
- [ ] XP awards work (`/api/progress` returns data)
- [ ] Deployed to Vercel without errors

---

## 🎉 Success!

You now have a **fully dynamic course system**:
- ✅ No hardcoding courses
- ✅ Teachers can create courses via form
- ✅ Chat persists to database
- ✅ User stats tracked per-user
- ✅ Scalable to 1000+ courses

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| `psql: command not found` | Install PostgreSQL CLI: `brew install postgresql` (macOS) or `choco install postgresql` (Windows) |
| `FATAL: password authentication failed` | Check `NEON_COURSES_DATABASE_URL` in .env |
| Admin form returns 403 | Verify `adminKey` matches `ADMIN_SECRET_KEY` in .env |
| Courses not loading | Check `/api/courses` response in browser DevTools Network tab |
| Chat not persisting | Verify `userId` is not null (check Supabase auth session) |

---

## 📞 Need Help?

Check these files:
1. `docs/COURSE_SYSTEM.md` - API reference
2. `docs/INTEGRATION_GUIDE.md` - Code examples
3. `docs/IMPLEMENTATION_SUMMARY.md` - Architecture overview

**Estimated time to complete: 1 hour** ⏱️
