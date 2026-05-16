const { query } = require('./lib/db');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { method } = req;
    const { userId, courseId } = req.query;

    if (!userId || !courseId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId or courseId query parameters',
      });
    }

    if (method === 'GET') {
      const result = await query(
        `SELECT id, user_id, course_id, user_course_id, content, created_at, updated_at
         FROM course_notes
         WHERE user_id = $1 AND course_id = $2
         LIMIT 1`,
        [userId, courseId]
      );

      return res.status(200).json({
        success: true,
        data: result.rows[0] || null,
      });
    }

    if (method === 'PUT' || method === 'PATCH') {
      const { content = '', userCourseId = null } = req.body || {};

      if (typeof content !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'content must be a string',
        });
      }

      const result = await query(
        `INSERT INTO course_notes (user_id, course_id, user_course_id, content)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, course_id)
         DO UPDATE SET
           user_course_id = COALESCE(EXCLUDED.user_course_id, course_notes.user_course_id),
           content = EXCLUDED.content,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, user_id, course_id, user_course_id, content, created_at, updated_at`,
        [userId, courseId, userCourseId || null, content]
      );

      return res.status(200).json({
        success: true,
        data: result.rows[0],
      });
    }

    if (method === 'DELETE') {
      const result = await query(
        `DELETE FROM course_notes
         WHERE user_id = $1 AND course_id = $2`,
        [userId, courseId]
      );

      return res.status(200).json({
        success: true,
        message: `Deleted ${result.rowCount} note`,
      });
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Notes API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
