const { query } = require('../lib/db');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { method } = req;
    const { userId } = req.query;
    const { courseId, userCourseId } = req.body || {};

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId query parameter',
      });
    }

    // GET /api/user/courses?userId=xyz - Get user's courses with progress
    if (method === 'GET') {
      const result = await query(
        `SELECT uc.*, c.title, c.subject, c.grade, c.topic, c.completion_xp, c.completion_coins
         FROM user_courses uc
         JOIN courses c ON uc.course_id = c.id
         WHERE uc.user_id = $1
         ORDER BY uc.updated_at DESC`,
        [userId]
      );

      return res.status(200).json({
        success: true,
        data: result.rows,
        count: result.rows.length,
      });
    }

    // POST /api/user/courses - Enroll user in course
    if (method === 'POST') {
      if (!courseId) {
        return res.status(400).json({
          success: false,
          error: 'Missing courseId in request body',
        });
      }

      // Check if already enrolled
      const existingResult = await query(
        'SELECT id FROM user_courses WHERE user_id = $1 AND course_id = $2',
        [userId, courseId]
      );

      if (existingResult.rows.length > 0) {
        return res.status(200).json({
          success: true,
          data: existingResult.rows[0],
          message: 'Already enrolled in this course',
        });
      }

      // Create new user_course entry
      const result = await query(
        `INSERT INTO user_courses (user_id, course_id)
         VALUES ($1, $2)
         RETURNING *`,
        [userId, courseId]
      );

      // Update global progression
      await query(
        `UPDATE user_progression 
         SET total_courses_started = total_courses_started + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId]
      );

      return res.status(201).json({
        success: true,
        data: result.rows[0],
      });
    }

    // PATCH /api/user/courses - Update course progress
    if (method === 'PATCH') {
      if (!userCourseId && !courseId) {
        return res.status(400).json({
          success: false,
          error: 'Missing userCourseId or courseId in request body',
        });
      }

      const {
        progress_percentage,
        level,
        xp_in_course,
        coins_earned,
        completed,
        stats,
      } = req.body;

      const updates = [];
      const params = [];
      let paramCount = 1;

      if (progress_percentage !== undefined) {
        updates.push(`progress_percentage = $${paramCount++}`);
        params.push(progress_percentage);
      }
      if (level !== undefined) {
        updates.push(`level = $${paramCount++}`);
        params.push(level);
      }
      if (xp_in_course !== undefined) {
        updates.push(`xp_in_course = $${paramCount++}`);
        params.push(xp_in_course);
      }
      if (coins_earned !== undefined) {
        updates.push(`coins_earned = $${paramCount++}`);
        params.push(coins_earned);
      }
      if (completed !== undefined) {
        updates.push(`completed = $${paramCount++}`);
        params.push(completed);
        if (completed) {
          updates.push(`completed_at = CURRENT_TIMESTAMP`);
        }
      }
      if (stats) {
        updates.push(`stats = $${paramCount++}`);
        params.push(JSON.stringify(stats));
      }

      const currentResult = userCourseId
        ? await query('SELECT * FROM user_courses WHERE id = $1 AND user_id = $2', [userCourseId, userId])
        : await query('SELECT * FROM user_courses WHERE user_id = $1 AND course_id = $2', [userId, courseId]);

      let targetRow = currentResult.rows[0] || null;

      if (!targetRow && courseId) {
        const inserted = await query(
          `INSERT INTO user_courses (user_id, course_id)
           VALUES ($1, $2)
           RETURNING *`,
          [userId, courseId]
        );
        targetRow = inserted.rows[0];
      }

      if (!targetRow) {
        return res.status(404).json({
          success: false,
          error: 'User course not found',
        });
      }

      if (completed !== undefined && completed && targetRow.completed !== true) {
        await query(
          `INSERT INTO user_progression (user_id, total_courses_completed)
           VALUES ($1, 1)
           ON CONFLICT (user_id)
           DO UPDATE SET total_courses_completed = user_progression.total_courses_completed + 1,
                         updated_at = CURRENT_TIMESTAMP`,
          [userId]
        );
      }

      if (completed === true && progress_percentage === undefined) {
        updates.push(`progress_percentage = $${paramCount++}`);
        params.push(100);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update',
        });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(targetRow.id);

      const sql = `UPDATE user_courses SET ${updates.join(', ')} 
                   WHERE id = $${paramCount} 
                   RETURNING *`;
      const result = await query(sql, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User course not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: result.rows[0],
      });
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('User courses API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
