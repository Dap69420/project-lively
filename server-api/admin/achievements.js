const { query } = require('../lib/db');
const { requireAdminUser } = require('../lib/adminAuth');

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const authResult = await requireAdminUser(req);
    if (!authResult.ok) {
      return res.status(authResult.status).json({ success: false, error: authResult.error });
    }

    if (req.method === 'GET') {
      const result = await query(
        `SELECT a.*,
                COUNT(ua.user_id)::int AS owner_count
         FROM achievements a
         LEFT JOIN user_achievements ua ON ua.achievement_id = a.id
         GROUP BY a.id
         ORDER BY a.sort_index ASC, a.created_at ASC`
      );
      return res.status(200).json({ success: true, data: result.rows });
    }

    if (req.method === 'POST') {
      const {
        id,
        name,
        description,
        icon,
        color,
        condition_type,
        condition_value,
        sort_index,
        is_active
      } = req.body || {};

      if (!name) {
        return res.status(400).json({ success: false, error: 'name is required' });
      }

      const achievementId = slugify(id || name);
      if (!achievementId) {
        return res.status(400).json({ success: false, error: 'A valid id or name is required' });
      }

      const result = await query(
        `INSERT INTO achievements (
          id, name, description, icon, color, condition_type, condition_value, sort_index, is_active
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *`,
        [
          achievementId,
          name,
          description || '',
          icon || 'icon-award',
          color || 'from-purple-500 to-neonViolet',
          condition_type || 'total_xp',
          Math.max(1, Math.round(Number(condition_value || 1))),
          Math.round(Number(sort_index || 0)),
          is_active !== false
        ]
      );

      return res.status(201).json({ success: true, data: Object.assign({}, result.rows[0], { owner_count: 0 }) });
    }

    if (req.method === 'PATCH') {
      const { id, ...updates } = req.body || {};
      if (!id) {
        return res.status(400).json({ success: false, error: 'id is required' });
      }

      const allowed = new Set(['name', 'description', 'icon', 'color', 'condition_type', 'condition_value', 'sort_index', 'is_active']);
      const sets = [];
      const params = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (!allowed.has(key) || value === undefined || value === null) return;
        sets.push(`${key} = $${paramCount++}`);
        params.push(['condition_value', 'sort_index'].includes(key) ? Math.round(Number(value || 0)) : value);
      });

      if (!sets.length) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }

      sets.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);
      const result = await query(`UPDATE achievements SET ${sets.join(', ')} WHERE id = $${paramCount} RETURNING *`, params);

      if (!result.rows.length) {
        return res.status(404).json({ success: false, error: 'Achievement not found' });
      }

      return res.status(200).json({ success: true, data: result.rows[0] });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) {
        return res.status(400).json({ success: false, error: 'id is required' });
      }

      const result = await query('DELETE FROM achievements WHERE id = $1 RETURNING *', [id]);
      return res.status(200).json({ success: true, data: result.rows[0] || null });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin achievements API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
