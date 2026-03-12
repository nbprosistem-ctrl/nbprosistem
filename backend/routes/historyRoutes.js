const express = require('express');
const pool = require('../utils/database');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

// GET /api/tasks/:id/history
router.get('/:id/history', async (req, res) => {
  const { id } = req.params;
  try {
    const historyQuery = await pool.query(`
      SELECT 
        th.id, 
        th.action, 
        th.description, 
        th.created_at, 
        COALESCE(u.name, 'Deleted User') as user_name 
      FROM task_history th
      LEFT JOIN users u ON th.user_id = u.id
      WHERE th.task_id = $1
      ORDER BY th.created_at DESC
    `, [id]);
    
    res.json(historyQuery.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar o histórico.' });
  }
});

module.exports = router;
