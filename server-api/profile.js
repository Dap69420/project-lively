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

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { userId, email = '' } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId query parameter' });
    }

    if (req.method === 'GET') {
      const profile = await ensureProfile(userId, email);
      return res.status(200).json({ success: true, data: profile });
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
