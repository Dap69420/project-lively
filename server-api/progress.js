const { query } = require('./lib/db');

const LEVEL_BASE_XP = 100;
const LEVEL_GROWTH_FACTOR = 1.4;

function requiredXpForLevel(level) {
  const normalizedLevel = Math.max(1, Number(level || 1));
  return Math.floor(LEVEL_BASE_XP * Math.pow(LEVEL_GROWTH_FACTOR, normalizedLevel - 1));
}

function applyXpDelta(level, xp, delta) {
  let nextLevel = Math.max(1, Number(level || 1));
  let nextXp = Math.max(0, Number(xp || 0));
  let xpDelta = Math.round(Number(delta || 0));

  while (xpDelta > 0) {
    const requiredXp = requiredXpForLevel(nextLevel);
    const remainingToLevel = Math.max(1, requiredXp - nextXp);

    if (xpDelta >= remainingToLevel) {
      xpDelta -= remainingToLevel;
      nextLevel += 1;
      nextXp = 0;
    } else {
      nextXp += xpDelta;
      xpDelta = 0;
    }
  }

  while (xpDelta < 0) {
    const loss = Math.abs(xpDelta);

    if (loss <= nextXp) {
      nextXp -= loss;
      xpDelta = 0;
      break;
    }

    xpDelta = loss - nextXp;

    if (nextLevel === 1) {
      nextXp = 0;
      xpDelta = 0;
      break;
    }

    nextLevel -= 1;
    nextXp = requiredXpForLevel(nextLevel);
    xpDelta = -xpDelta;
  }

  return { level: nextLevel, xp: nextXp };
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { method } = req;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId query parameter',
      });
    }

    // GET /api/progress?userId=xyz - Get user's global progression
    if (method === 'GET') {
      let result = await query(
        'SELECT * FROM user_progression WHERE user_id = $1',
        [userId]
      );

      // Create if doesn't exist
      if (result.rows.length === 0) {
        result = await query(
          `INSERT INTO user_progression (user_id)
           VALUES ($1)
           RETURNING *`,
          [userId]
        );
      }

      return res.status(200).json({
        success: true,
        data: result.rows[0],
      });
    }

    // PATCH /api/progress?userId=xyz - Update user progression
    if (method === 'PATCH') {
      const {
        total_xp,
        total_coins,
        global_level,
        current_streak,
        longest_streak,
        total_courses_completed,
      } = req.body;

      // Build dynamic update query
      const updates = [];
      const params = [];
      let paramCount = 1;

      if (total_xp !== undefined) {
        updates.push(`total_xp = $${paramCount++}`);
        params.push(total_xp);
      }
      if (total_coins !== undefined) {
        updates.push(`total_coins = $${paramCount++}`);
        params.push(total_coins);
      }
      if (global_level !== undefined) {
        updates.push(`global_level = $${paramCount++}`);
        params.push(global_level);
      }
      if (current_streak !== undefined) {
        updates.push(`current_streak = $${paramCount++}`);
        params.push(current_streak);
      }
      if (longest_streak !== undefined) {
        updates.push(`longest_streak = $${paramCount++}`);
        params.push(longest_streak);
      }
      if (total_courses_completed !== undefined) {
        updates.push(`total_courses_completed = $${paramCount++}`);
        params.push(total_courses_completed);
      }

      updates.push(`last_activity = CURRENT_TIMESTAMP`);
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(userId);

      let existing = await query(
        'SELECT id FROM user_progression WHERE user_id = $1',
        [userId]
      );

      if (existing.rows.length === 0) {
        await query(
          `INSERT INTO user_progression (user_id)
           VALUES ($1)`,
          [userId]
        );
      }

      const sql = `UPDATE user_progression 
                   SET ${updates.join(', ')}
                   WHERE user_id = $${paramCount}
                   RETURNING *`;

      const result = await query(sql, params);

      return res.status(200).json({
        success: true,
        data: result.rows[0],
      });
    }

    // POST /api/progress - Award XP/coins to user
    if (method === 'POST') {
      const { xp = 0, coins = 0 } = req.body;
      const gainedCoins = Math.round(Number(coins || 0));
      const xpDelta = Math.round(Number(xp || 0));

      // Get current progression
      let result = await query(
        'SELECT * FROM user_progression WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        const baseState = applyXpDelta(1, 0, xpDelta);

        result = await query(
          `INSERT INTO user_progression (user_id, total_xp, total_coins, global_level)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [userId, baseState.xp, gainedCoins, baseState.level]
        );
      } else {
        const current = result.rows[0];
        const currentLevel = Math.max(1, Number(current.global_level || 1));
        const xpBefore = Math.max(0, Number(current.total_xp || 0));
        const newState = applyXpDelta(currentLevel, xpBefore, xpDelta);
        const newCoins = Math.max(0, Number(current.total_coins || 0)) + gainedCoins;

        result = await query(
          `UPDATE user_progression
           SET total_xp = $1,
               total_coins = $2,
               global_level = $3,
               last_activity = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $4
           RETURNING *`,
          [newState.xp, newCoins, newState.level, userId]
        );
      }

      return res.status(200).json({
        success: true,
        message: `Awarded ${xp} XP and ${coins} coins`,
        data: result.rows[0],
      });
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Progress API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
