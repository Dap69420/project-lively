const { query } = require('./lib/db');

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

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { userId, email = '' } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId query parameter' });
    }

    if (req.method === 'GET') {
      const profile = await ensureProfile(userId, email);
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

    console.error('Profile API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
