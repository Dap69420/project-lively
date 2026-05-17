const { query } = require('./lib/db');

function achievementIsMet(achievement, state) {
  const value = Number(achievement.condition_value || 1);
  const type = String(achievement.condition_type || 'total_xp');

  if (type === 'total_xp') return Number(state.totalXp || 0) >= value;
  if (type === 'level') return Number(state.level || 1) >= value;
  if (type === 'streak') return Number(state.streak || 0) >= value;
  if (type === 'coins') return Number(state.coins || 0) >= value;
  if (type === 'correct_answers') return Number(state.correctAnswers || 0) >= value;
  if (type === 'courses_completed') return Number(state.coursesCompleted || 0) >= value;
  return false;
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { userId } = req.query;

    if (req.method === 'GET') {
      const result = await query(
        `SELECT a.*,
                COUNT(ua.user_id)::int AS owner_count,
                BOOL_OR(ua.user_id = $1)::boolean AS owned
         FROM achievements a
         LEFT JOIN user_achievements ua ON ua.achievement_id = a.id
         WHERE a.is_active = true
         GROUP BY a.id
         ORDER BY a.sort_index ASC, a.created_at ASC`,
        [userId || '00000000-0000-0000-0000-000000000000']
      );
      return res.status(200).json({ success: true, data: result.rows });
    }

    if (req.method === 'POST') {
      if (!userId) {
        return res.status(400).json({ success: false, error: 'Missing userId query parameter' });
      }

      const state = req.body || {};
      const achievements = await query('SELECT * FROM achievements WHERE is_active = true ORDER BY sort_index ASC');
      const unlocked = [];

      for (const achievement of achievements.rows) {
        if (!achievementIsMet(achievement, state)) continue;
        await query(
          `INSERT INTO user_achievements (user_id, achievement_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, achievement_id) DO NOTHING`,
          [userId, achievement.id]
        );
        unlocked.push(achievement.id);
      }

      const owned = await query(
        `SELECT achievement_id FROM user_achievements WHERE user_id = $1 ORDER BY unlocked_at ASC`,
        [userId]
      );

      return res.status(200).json({
        success: true,
        unlocked,
        owned: owned.rows.map((row) => row.achievement_id)
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Achievements API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
