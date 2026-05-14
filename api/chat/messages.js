const { query } = require('../lib/db');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { method } = req;
    const { userId, courseId, limit = 50, offset = 0 } = req.query;

    if (!userId || !courseId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId or courseId query parameters',
      });
    }

    // GET /api/chat/messages - Load chat history
    if (method === 'GET') {
      const result = await query(
        `SELECT id, role, text, metadata, created_at
         FROM chat_messages
         WHERE user_id = $1 AND course_id = $2
         ORDER BY created_at ASC
         LIMIT $3 OFFSET $4`,
        [userId, courseId, parseInt(limit), parseInt(offset)]
      );

      const countResult = await query(
        `SELECT COUNT(*) as total FROM chat_messages
         WHERE user_id = $1 AND course_id = $2`,
        [userId, courseId]
      );

      return res.status(200).json({
        success: true,
        data: result.rows,
        total: parseInt(countResult.rows[0].total),
        count: result.rows.length,
      });
    }

    // POST /api/chat/messages - Save chat message
    if (method === 'POST') {
      const { role, text, metadata, userCourseId } = req.body;

      if (!role || !text) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: role, text',
        });
      }

      if (!['user', 'assistant'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role. Must be "user" or "assistant"',
        });
      }

      const result = await query(
        `INSERT INTO chat_messages (
          user_id, course_id, user_course_id, role, text, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          userId,
          courseId,
          userCourseId || null,
          role,
          text,
          JSON.stringify(metadata || {}),
        ]
      );

      return res.status(201).json({
        success: true,
        data: result.rows[0],
      });
    }

    // DELETE /api/chat/messages - Clear chat history (with optional date range)
    if (method === 'DELETE') {
      const { beforeDate } = req.query;

      let sql = 'DELETE FROM chat_messages WHERE user_id = $1 AND course_id = $2';
      const params = [userId, courseId];

      if (beforeDate) {
        sql += ` AND created_at < $3`;
        params.push(new Date(beforeDate));
      }

      const result = await query(sql, params);

      return res.status(200).json({
        success: true,
        message: `Deleted ${result.rowCount} messages`,
      });
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Chat messages API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
