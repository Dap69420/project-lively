const { query } = require('./lib/db');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const { method } = req;
    const { id, subject, grade, userId } = req.query;

    // GET /api/courses - List all courses (with optional filters)
    if (method === 'GET' && !id) {
      let sql = 'SELECT * FROM courses WHERE is_active = true';
      const params = [];

      if (userId) {
        sql += ` AND (
          created_by IS NULL
          OR EXISTS (
            SELECT 1
            FROM classroom_courses cc
            JOIN classroom_students cs ON cs.classroom_id = cc.classroom_id
            WHERE cc.course_id = courses.id
              AND cs.student_id = $${params.length + 1}
              AND cs.status = 'active'
          )
        )`;
        params.push(userId);
      } else {
        sql += ' AND created_by IS NULL';
      }

      if (subject) {
        sql += ' AND subject = $' + (params.length + 1);
        params.push(subject);
      }

      if (grade) {
        sql += ' AND grade = $' + (params.length + 1);
        params.push(grade);
      }

      sql += ' ORDER BY created_at DESC';

      const result = await query(sql, params);
      return res.status(200).json({
        success: true,
        data: result.rows,
        count: result.rows.length,
      });
    }

    // GET /api/courses?id=xyz - Get single course
    if (method === 'GET' && id) {
      const result = await query(
        'SELECT * FROM courses WHERE id = $1 AND is_active = true',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }

      return res.status(200).json({
        success: true,
        data: result.rows[0],
      });
    }

    // POST /api/courses - Create new course
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
        prerequisites,
        lessons,
        objectives,
        card_style,
        ai_settings,
      } = req.body;

      if (!title || !ai_prompt) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: title, ai_prompt',
        });
      }

      const result = await query(
        `INSERT INTO courses (
          title, description, subject, grade, topic, difficulty,
          ai_prompt, ai_aim, completion_xp, completion_coins,
          thumbnail_url, prerequisites, lessons, objectives, card_style, ai_settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          title,
          description || null,
          subject || null,
          grade || null,
          topic || null,
          difficulty || 'intermediate',
          ai_prompt,
          ai_aim || null,
          completion_xp || 250,
          completion_coins || 50,
          thumbnail_url || null,
          JSON.stringify(prerequisites || []),
          JSON.stringify(lessons || []),
          JSON.stringify(objectives || []),
          JSON.stringify(card_style || {}),
          JSON.stringify(ai_settings || {}),
        ]
      );

      return res.status(201).json({
        success: true,
        data: result.rows[0],
      });
    }

    // PATCH /api/courses?id=xyz - Update course
    if (method === 'PATCH' && id) {
      const {
        title,
        description,
        topic,
        difficulty,
        ai_prompt,
        ai_aim,
        completion_xp,
        completion_coins,
        lessons,
        objectives,
        card_style,
        ai_settings,
      } = req.body;

      const updates = [];
      const params = [];
      let paramCount = 1;

      if (title) {
        updates.push(`title = $${paramCount++}`);
        params.push(title);
      }
      if (description) {
        updates.push(`description = $${paramCount++}`);
        params.push(description);
      }
      if (topic) {
        updates.push(`topic = $${paramCount++}`);
        params.push(topic);
      }
      if (difficulty) {
        updates.push(`difficulty = $${paramCount++}`);
        params.push(difficulty);
      }
      if (ai_prompt) {
        updates.push(`ai_prompt = $${paramCount++}`);
        params.push(ai_prompt);
      }
      if (ai_aim) {
        updates.push(`ai_aim = $${paramCount++}`);
        params.push(ai_aim);
      }
      if (completion_xp !== undefined) {
        updates.push(`completion_xp = $${paramCount++}`);
        params.push(completion_xp);
      }
      if (completion_coins !== undefined) {
        updates.push(`completion_coins = $${paramCount++}`);
        params.push(completion_coins);
      }
      if (lessons) {
        updates.push(`lessons = $${paramCount++}`);
        params.push(JSON.stringify(lessons));
      }
      if (objectives) {
        updates.push(`objectives = $${paramCount++}`);
        params.push(JSON.stringify(objectives));
      }
      if (card_style) {
        updates.push(`card_style = $${paramCount++}`);
        params.push(JSON.stringify(card_style));
      }
      if (ai_settings) {
        updates.push(`ai_settings = $${paramCount++}`);
        params.push(JSON.stringify(ai_settings));
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update',
        });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);

      const sql = `UPDATE courses SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await query(sql, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }

      return res.status(200).json({
        success: true,
        data: result.rows[0],
      });
    }

    // DELETE /api/courses?id=xyz - Soft delete course
    if (method === 'DELETE' && id) {
      const result = await query(
        'UPDATE courses SET is_active = false WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Course deleted',
      });
    }

    res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Courses API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
