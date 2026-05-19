const { query } = require('./lib/db');
const crypto = require('crypto');

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24);
}

function fallbackUsername(email, userId) {
  const base = normalizeUsername(String(email || '').split('@')[0]) || 'recruit';
  const suffix = String(userId || '').replace(/-/g, '').slice(0, 6);
  return `${base}_${suffix}`.slice(0, 24);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function makeJoinCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function ensureProfile(userId, email = '') {
  let result = await query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
  if (result.rows.length) {
    return result.rows[0];
  }

  const baseUsername = fallbackUsername(email, userId);
  let username = baseUsername;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      result = await query(
        `INSERT INTO user_profiles (user_id, username, display_name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, username, username]
      );
      return result.rows[0];
    } catch (error) {
      if (error?.code !== '23505') throw error;
      username = `${baseUsername.slice(0, 17)}_${Math.floor(Math.random() * 99999)}`;
    }
  }

  throw new Error('Unable to create a unique username');
}

async function getChildProgress(childId) {
  const [profileResult, progressionResult, coursesResult, achievementsResult, chatsResult] = await Promise.all([
    query('SELECT user_id, username, display_name, avatar_url FROM user_profiles WHERE user_id = $1', [childId]).catch(() => ({ rows: [] })),
    query('SELECT * FROM user_progression WHERE user_id = $1', [childId]).catch(() => ({ rows: [] })),
    query(
      `SELECT uc.course_id,
              uc.progress_percentage,
              uc.level,
              uc.xp_in_course,
              uc.coins_earned,
              uc.completed,
              uc.completed_at,
              uc.updated_at,
              uc.stats,
              c.title,
              c.subject,
              c.grade,
              c.topic
       FROM user_courses uc
       JOIN courses c ON uc.course_id = c.id
       WHERE uc.user_id = $1
       ORDER BY uc.updated_at DESC
       LIMIT 8`,
      [childId]
    ).catch(() => ({ rows: [] })),
    query(
      `SELECT a.id,
              a.name,
              a.description,
              a.icon,
              a.condition_type,
              a.condition_value,
              ua.unlocked_at
       FROM user_achievements ua
       JOIN achievements a ON a.id = ua.achievement_id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC
       LIMIT 12`,
      [childId]
    ).catch(() => ({ rows: [] })),
    query(
      `SELECT cm.id,
              cm.course_id,
              cm.role,
              cm.text,
              cm.created_at,
              c.title AS course_title
       FROM chat_messages cm
       LEFT JOIN courses c ON c.id = cm.course_id
       WHERE cm.user_id = $1
       ORDER BY cm.created_at DESC
       LIMIT 20`,
      [childId]
    ).catch(() => ({ rows: [] }))
  ]);

  const progression = progressionResult.rows[0] || {};
  return {
    profile: profileResult.rows[0] || null,
    progression,
    courses: coursesResult.rows,
    achievements: achievementsResult.rows,
    chats: chatsResult.rows,
    totals: {
      xp: Number(progression.total_xp || 0),
      coins: Number(progression.total_coins || 0),
      level: Number(progression.global_level || 1),
      streak: Number(progression.current_streak || 0),
      completedCourses: Number(progression.total_courses_completed || 0),
      startedCourses: Number(progression.total_courses_started || 0)
    }
  };
}

async function getFamilyData(userId, email) {
  const normalizedEmail = normalizeEmail(email);
  const [parentResult, childResult] = await Promise.all([
    query(
      `SELECT *
       FROM parent_child_links
       WHERE parent_id = $1
       ORDER BY created_at DESC`,
      [userId]
    ),
    normalizedEmail
      ? query(
          `SELECT *
           FROM parent_child_links
           WHERE child_id = $1 OR lower(child_email) = lower($2)
           ORDER BY created_at DESC`,
          [userId, normalizedEmail]
        )
      : query(
          `SELECT *
           FROM parent_child_links
           WHERE child_id = $1
           ORDER BY created_at DESC`,
          [userId]
        )
  ]);

  const parentLinks = parentResult.rows;
  const children = [];
  for (const link of parentLinks.filter((item) => item.status === 'accepted' && item.child_id)) {
    children.push(Object.assign({}, link, {
      progress: await getChildProgress(link.child_id)
    }));
  }

  return {
    parentLinks,
    childLinks: childResult.rows,
    children,
    limits: {
      maxChildren: 3,
      usedChildren: parentLinks.filter((link) => link.status !== 'rejected').length
    }
  };
}

async function getSpectateData(parentId, childId, courseId = '') {
  if (!childId) {
    const error = new Error('Missing childId for spectate mode.');
    error.statusCode = 400;
    throw error;
  }

  const linkResult = await query(
    `SELECT *
     FROM parent_child_links
     WHERE parent_id = $1
       AND child_id = $2
       AND status = 'accepted'
     LIMIT 1`,
    [parentId, childId]
  );

  if (!linkResult.rows.length) {
    const error = new Error('This child account is not connected to your parent account.');
    error.statusCode = 403;
    throw error;
  }

  const childProgress = await getChildProgress(childId);
  const coursesResult = await query(
    `SELECT uc.course_id,
            uc.progress_percentage,
            uc.level,
            uc.xp_in_course,
            uc.coins_earned,
            uc.completed,
            uc.completed_at,
            uc.updated_at,
            uc.stats,
            c.title,
            c.description,
            c.subject,
            c.grade,
            c.topic,
            c.ai_aim,
            c.objectives,
            c.lessons,
            c.card_style
     FROM user_courses uc
     JOIN courses c ON uc.course_id = c.id
     WHERE uc.user_id = $1
     ORDER BY uc.updated_at DESC`,
    [childId]
  );

  const courses = coursesResult.rows;
  const selectedCourseId = courseId && courses.some((course) => String(course.course_id) === String(courseId))
    ? courseId
    : (courses[0]?.course_id || '');

  const [notesResult, chatResult] = selectedCourseId
    ? await Promise.all([
        query(
          `SELECT id, content, created_at, updated_at
           FROM course_notes
           WHERE user_id = $1 AND course_id = $2
           LIMIT 1`,
          [childId, selectedCourseId]
        ).catch(() => ({ rows: [] })),
        query(
          `SELECT id, role, text, metadata, created_at
           FROM chat_messages
           WHERE user_id = $1 AND course_id = $2
           ORDER BY created_at ASC
           LIMIT 200`,
          [childId, selectedCourseId]
        ).catch(() => ({ rows: [] }))
      ])
    : [{ rows: [] }, { rows: [] }];

  return {
    child: {
      id: childId,
      email: linkResult.rows[0].child_email,
      profile: childProgress.profile,
      totals: childProgress.totals
    },
    courses,
    selectedCourseId,
    notes: notesResult.rows[0] || null,
    messages: chatResult.rows
  };
}

async function getEducatorData(educatorId) {
  const [classroomsResult, coursesResult] = await Promise.all([
    query(
      `SELECT ec.*,
              (SELECT COUNT(*)::int FROM classroom_students WHERE classroom_id = ec.id AND status = 'active') AS student_count,
              (SELECT COUNT(*)::int FROM classroom_courses WHERE classroom_id = ec.id) AS course_count
       FROM educator_classrooms ec
       WHERE ec.educator_id = $1
       ORDER BY ec.created_at DESC`,
      [educatorId]
    ),
    query(
      `SELECT c.*,
              (SELECT COUNT(*)::int FROM classroom_courses WHERE course_id = c.id) AS assigned_count
       FROM courses c
       WHERE c.created_by = $1 AND c.is_active = true
       ORDER BY c.created_at DESC`,
      [educatorId]
    ).catch(() => ({ rows: [] }))
  ]);

  const classrooms = [];
  for (const classroom of classroomsResult.rows) {
    const [studentsResult, assignedCoursesResult] = await Promise.all([
      query(
        `SELECT cs.*, up.username, up.display_name, up.avatar_url, prog.total_xp, prog.global_level, prog.current_streak, prog.total_courses_completed
         FROM classroom_students cs
         LEFT JOIN user_profiles up ON up.user_id = cs.student_id
         LEFT JOIN user_progression prog ON prog.user_id = cs.student_id
         WHERE cs.classroom_id = $1 AND cs.status = 'active'
         ORDER BY cs.created_at DESC`,
        [classroom.id]
      ).catch(() => ({ rows: [] })),
      query(
        `SELECT cc.*, c.title, c.subject, c.grade, c.topic
         FROM classroom_courses cc
         JOIN courses c ON c.id = cc.course_id
         WHERE cc.classroom_id = $1
         ORDER BY cc.created_at DESC`,
        [classroom.id]
      ).catch(() => ({ rows: [] }))
    ]);

    classrooms.push(Object.assign({}, classroom, {
      students: studentsResult.rows,
      courses: assignedCoursesResult.rows
    }));
  }

  return {
    classrooms,
    courses: coursesResult.rows
  };
}

async function getStudentClassroomData(userId) {
  const result = await query(
    `SELECT cs.*, ec.name, ec.description, ec.join_code,
            up.username AS educator_username,
            up.display_name AS educator_display_name
     FROM classroom_students cs
     JOIN educator_classrooms ec ON ec.id = cs.classroom_id
     LEFT JOIN user_profiles up ON up.user_id = ec.educator_id
     WHERE cs.student_id = $1 AND cs.status = 'active'
     ORDER BY cs.created_at DESC`,
    [userId]
  ).catch(() => ({ rows: [] }));

  const classrooms = [];
  for (const room of result.rows) {
    const coursesResult = await query(
      `SELECT c.*, cc.created_at AS assigned_at, uc.progress_percentage, uc.completed, uc.xp_in_course, uc.stats
       FROM classroom_courses cc
       JOIN courses c ON c.id = cc.course_id
       LEFT JOIN user_courses uc ON uc.course_id = c.id AND uc.user_id = $2
       WHERE cc.classroom_id = $1 AND c.is_active = true
       ORDER BY cc.created_at DESC`,
      [room.classroom_id, userId]
    ).catch(() => ({ rows: [] }));
    classrooms.push(Object.assign({}, room, { courses: coursesResult.rows }));
  }

  return { classrooms };
}

async function createEducatorCourse(educatorId, body = {}) {
  const objectives = Array.isArray(body.objectives) ? body.objectives : String(body.objectivesText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const tests = Array.isArray(body.tests) ? body.tests : [];
  const objectiveQuizzes = Array.isArray(body.objective_quizzes) ? body.objective_quizzes : [];
  const aiSettings = Object.assign({}, body.ai_settings || {}, {
    educator_tests: tests,
    educator_objective_quizzes: objectiveQuizzes,
    educator_pass_score: Number(body.pass_score || body.passScore || Math.ceil(Math.max(1, tests.length) * 0.4)),
    no_rewards: true,
    hints_allowed: body.hints_allowed !== false,
    quiz_enabled: body.quiz_enabled !== false,
    quiz_frequency: body.quiz_frequency || 'after_objective',
    quiz_difficulty: body.quiz_difficulty || 'mixed',
    quiz_style: 'mcq'
  });

  if (!body.title || !body.subject || !body.grade || !body.topic || !body.ai_prompt) {
    const error = new Error('Title, subject, grade, topic, and AI prompt are required.');
    error.statusCode = 400;
    throw error;
  }

  const result = await query(
    `INSERT INTO courses (
      title, description, subject, grade, topic, difficulty,
      ai_prompt, ai_aim, completion_xp, completion_coins,
      thumbnail_url, objectives, card_style, ai_settings, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      body.title,
      body.description || '',
      body.subject,
      String(body.grade),
      body.topic,
      body.difficulty || 'intermediate',
      body.ai_prompt,
      body.ai_aim || '',
      Number(body.completion_xp || 250),
      Number(body.completion_coins || 50),
      body.thumbnail_url || '',
      JSON.stringify(objectives),
      JSON.stringify(body.card_style || {}),
      JSON.stringify(aiSettings),
      educatorId
    ]
  );

  return result.rows[0];
}

async function joinClassroomByCode(userId, email, code, addedBy = null) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  const classroomResult = await query('SELECT * FROM educator_classrooms WHERE join_code = $1', [normalizedCode]);
  if (!classroomResult.rows.length) {
    const error = new Error('Classroom code not found.');
    error.statusCode = 404;
    throw error;
  }

  const classroom = classroomResult.rows[0];
  const linkResult = await query(
    `INSERT INTO classroom_students (classroom_id, student_id, student_email, added_by, status)
     VALUES ($1, $2, $3, $4, 'active')
     ON CONFLICT (classroom_id, student_id)
     DO UPDATE SET status = 'active',
                   student_email = EXCLUDED.student_email,
                   updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [classroom.id, userId, normalizeEmail(email), addedBy]
  );

  const courseRows = await query(
    `SELECT course_id FROM classroom_courses WHERE classroom_id = $1`,
    [classroom.id]
  ).catch(() => ({ rows: [] }));

  for (const row of courseRows.rows) {
    await query(
      `INSERT INTO user_courses (user_id, course_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, course_id) DO NOTHING`,
      [userId, row.course_id]
    ).catch(() => null);
  }

  return { classroom, membership: linkResult.rows[0] };
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { userId, email = '' } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId query parameter' });
    }

    if (req.method === 'GET') {
      const profile = await ensureProfile(userId, email);
      if (req.query.mode === 'spectate') {
        const spectate = await getSpectateData(userId, req.query.childId, req.query.courseId || '');
        return res.status(200).json({ success: true, data: { profile, spectate } });
      }
      if (req.query.mode === 'educator') {
        const educator = await getEducatorData(userId);
        return res.status(200).json({ success: true, data: { profile, educator } });
      }
      if (req.query.mode === 'student_classrooms') {
        const studentClassrooms = await getStudentClassroomData(userId);
        return res.status(200).json({ success: true, data: { profile, studentClassrooms } });
      }
      if (req.query.mode === 'family') {
        const family = await getFamilyData(userId, email);
        return res.status(200).json({ success: true, data: { profile, family } });
      }
      return res.status(200).json({ success: true, data: profile });
    }

    if (req.method === 'POST' && req.query.mode === 'family') {
      const action = String(req.body?.action || '').trim();
      const normalizedEmail = normalizeEmail(email);

      if (action === 'add_child') {
        const childEmail = normalizeEmail(req.body?.childEmail);
        if (!childEmail || !childEmail.includes('@')) {
          return res.status(400).json({ success: false, error: 'Enter the child account email.' });
        }

        if (childEmail === normalizedEmail) {
          return res.status(400).json({ success: false, error: 'A parent account cannot add itself as a child.' });
        }

        const countResult = await query(
          `SELECT COUNT(*)::int AS count
           FROM parent_child_links
           WHERE parent_id = $1 AND status <> 'rejected'`,
          [userId]
        );

        if (Number(countResult.rows[0]?.count || 0) >= 3) {
          return res.status(400).json({ success: false, error: 'Parent accounts can connect up to 3 child accounts.' });
        }

        const result = await query(
          `INSERT INTO parent_child_links (parent_id, parent_email, child_email, status)
           VALUES ($1, $2, $3, 'pending')
           ON CONFLICT (parent_id, child_email)
           DO UPDATE SET status = 'pending',
                         parent_email = EXCLUDED.parent_email,
                         updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [userId, normalizedEmail, childEmail]
        );

        return res.status(200).json({ success: true, data: result.rows[0] });
      }

      if (action === 'accept_parent') {
        if (!normalizedEmail) {
          return res.status(400).json({ success: false, error: 'Missing child email for approval.' });
        }

        const result = await query(
          `UPDATE parent_child_links
           SET child_id = $1,
               status = 'accepted',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2
             AND lower(child_email) = lower($3)
             AND status = 'pending'
           RETURNING *`,
          [userId, req.body?.linkId, normalizedEmail]
        );

        if (!result.rows.length) {
          return res.status(404).json({ success: false, error: 'Parent request not found.' });
        }

        return res.status(200).json({ success: true, data: result.rows[0] });
      }

      if (action === 'reject_parent') {
        const result = await query(
          `UPDATE parent_child_links
           SET status = 'rejected',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
             AND lower(child_email) = lower($2)
             AND status = 'pending'
           RETURNING *`,
          [req.body?.linkId, normalizedEmail]
        );

        if (!result.rows.length) {
          return res.status(404).json({ success: false, error: 'Parent request not found.' });
        }

        return res.status(200).json({ success: true, data: result.rows[0] });
      }

      if (action === 'remove_child') {
        const result = await query(
          `DELETE FROM parent_child_links
           WHERE id = $1 AND parent_id = $2
           RETURNING *`,
          [req.body?.linkId, userId]
        );

        if (!result.rows.length) {
          return res.status(404).json({ success: false, error: 'Child link not found.' });
        }

        return res.status(200).json({ success: true, data: result.rows[0] });
      }

      return res.status(400).json({ success: false, error: 'Unknown family action.' });
    }

    if (req.method === 'POST' && req.query.mode === 'educator') {
      const action = String(req.body?.action || '').trim();

      if (action === 'create_classroom') {
        const name = String(req.body?.name || '').trim();
        if (!name) {
          return res.status(400).json({ success: false, error: 'Classroom name is required.' });
        }

        let result = null;
        for (let attempt = 0; attempt < 5; attempt += 1) {
          try {
            result = await query(
              `INSERT INTO educator_classrooms (educator_id, name, description, join_code)
               VALUES ($1, $2, $3, $4)
               RETURNING *`,
              [userId, name.slice(0, 160), String(req.body?.description || '').slice(0, 500), makeJoinCode()]
            );
            break;
          } catch (error) {
            if (error?.code !== '23505') throw error;
          }
        }

        if (!result) {
          throw new Error('Unable to create a unique classroom code.');
        }

        return res.status(201).json({ success: true, data: result.rows[0] });
      }

      if (action === 'create_course') {
        const course = await createEducatorCourse(userId, req.body || {});
        return res.status(201).json({ success: true, data: course });
      }

      if (action === 'assign_course') {
        const classroomId = req.body?.classroomId;
        const courseId = req.body?.courseId;
        const ownsClassroom = await query('SELECT id FROM educator_classrooms WHERE id = $1 AND educator_id = $2', [classroomId, userId]);
        if (!ownsClassroom.rows.length) {
          return res.status(404).json({ success: false, error: 'Classroom not found.' });
        }

        const ownsCourse = await query('SELECT id FROM courses WHERE id = $1 AND created_by = $2 AND is_active = true', [courseId, userId]);
        if (!ownsCourse.rows.length) {
          return res.status(404).json({ success: false, error: 'Educator course not found.' });
        }

        const result = await query(
          `INSERT INTO classroom_courses (classroom_id, course_id, assigned_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (classroom_id, course_id) DO NOTHING
           RETURNING *`,
          [classroomId, courseId, userId]
        );

        const students = await query('SELECT student_id FROM classroom_students WHERE classroom_id = $1 AND status = $2', [classroomId, 'active']).catch(() => ({ rows: [] }));
        for (const student of students.rows) {
          await query(
            `INSERT INTO user_courses (user_id, course_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, course_id) DO NOTHING`,
            [student.student_id, courseId]
          ).catch(() => null);
        }

        return res.status(200).json({ success: true, data: result.rows[0] || null });
      }

      return res.status(400).json({ success: false, error: 'Unknown educator action.' });
    }

    if (req.method === 'POST' && req.query.mode === 'classroom') {
      const action = String(req.body?.action || '').trim();

      if (action === 'join_by_code') {
        const joined = await joinClassroomByCode(userId, email, req.body?.joinCode, userId);
        return res.status(200).json({ success: true, data: joined });
      }

      if (action === 'parent_add_child') {
        const childId = req.body?.childId;
        const linkResult = await query(
          `SELECT child_email
           FROM parent_child_links
           WHERE parent_id = $1 AND child_id = $2 AND status = 'accepted'
           LIMIT 1`,
          [userId, childId]
        );

        if (!linkResult.rows.length) {
          return res.status(403).json({ success: false, error: 'That child is not connected to your parent account.' });
        }

        const joined = await joinClassroomByCode(childId, linkResult.rows[0].child_email, req.body?.joinCode, userId);
        return res.status(200).json({ success: true, data: joined });
      }

      return res.status(400).json({ success: false, error: 'Unknown classroom action.' });
    }

    if (req.method === 'PATCH') {
      const { username, displayName, avatarUrl } = req.body || {};
      const nextUsername = normalizeUsername(username);
      if (!nextUsername || nextUsername.length < 3) {
        return res.status(400).json({ success: false, error: 'Username must be at least 3 letters/numbers.' });
      }

      if (String(avatarUrl || '').length > 1500000) {
        return res.status(400).json({ success: false, error: 'Profile picture is too large. Try an image under 1 MB.' });
      }

      await ensureProfile(userId, email);
      const result = await query(
        `UPDATE user_profiles
         SET username = $2,
             display_name = $3,
             avatar_url = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
         RETURNING *`,
        [userId, nextUsername, String(displayName || nextUsername).trim().slice(0, 80), String(avatarUrl || '')]
      );

      return res.status(200).json({ success: true, data: result.rows[0] });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({ success: false, error: 'That username is already taken.' });
    }

    if (error?.statusCode) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }

    console.error('Profile API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
