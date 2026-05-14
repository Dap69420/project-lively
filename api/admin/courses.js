const { query } = require('../lib/db');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const { method } = req;
    const { userId, adminKey } = req.query;

    // Simple admin check (in production, verify against Supabase roles)
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized - Invalid admin key',
      });
    }

    // GET /api/admin/courses - Get all courses (admin view with stats)
    if (method === 'GET') {
      const result = await query(
        `SELECT c.*,
                (SELECT COUNT(*) FROM user_courses WHERE course_id = c.id) as total_enrollments,
                (SELECT COUNT(*) FROM user_courses WHERE course_id = c.id AND completed = true) as total_completions
         FROM courses c
         ORDER BY c.created_at DESC`
      );

      return res.status(200).json({
        success: true,
        data: result.rows,
        count: result.rows.length,
      });
    }

    // POST /api/admin/courses - Create course from form submission
    if (method === 'POST') {
      const {
        title,
        description,
        subject,
        grade,
        topic,
        difficulty,
        ai_prompt,
        ai_aim,
        completion_xp,
        completion_coins,
        thumbnail_url,
      } = req.body;

      // Validation
      const errors = [];
      if (!title) errors.push('Title is required');
      if (!ai_prompt) errors.push('AI Prompt is required');
      if (!subject) errors.push('Subject is required');
      if (!grade) errors.push('Grade is required');
      if (!topic) errors.push('Topic is required');

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          errors,
        });
      }

      const result = await query(
        `INSERT INTO courses (
          title, description, subject, grade, topic, difficulty,
          ai_prompt, ai_aim, completion_xp, completion_coins,
          thumbnail_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          title,
          description,
          subject,
          grade,
          topic,
          difficulty || 'intermediate',
          ai_prompt,
          ai_aim,
          completion_xp || 250,
          completion_coins || 50,
          thumbnail_url,
        ]
      );

      return res.status(201).json({
        success: true,
        message: 'Course created successfully',
        data: result.rows[0],
      });
    }

    // PATCH /api/admin/courses - Update course
    if (method === 'PATCH') {
      const { courseId, ...updateData } = req.body;

      if (!courseId) {
        return res.status(400).json({
          success: false,
          error: 'courseId is required',
        });
      }

      const updates = [];
      const params = [];
      let paramCount = 1;

      // Dynamically build update query
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          updates.push(`${key} = $${paramCount++}`);
          params.push(value);
        }
      });

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update',
        });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(courseId);

      const sql = `UPDATE courses 
                   SET ${updates.join(', ')}
                   WHERE id = $${paramCount}
                   RETURNING *`;

      const result = await query(sql, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Course not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Course updated successfully',
        data: result.rows[0],
      });
    }

    // DELETE /api/admin/courses - Delete course
    if (method === 'DELETE') {
      const { courseId } = req.body;

      if (!courseId) {
        return res.status(400).json({
          success: false,
          error: 'courseId is required',
        });
      }

      const result = await query(
        'UPDATE courses SET is_active = false WHERE id = $1 RETURNING *',
        [courseId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Course not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Course deactivated successfully',
      });
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin courses API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
