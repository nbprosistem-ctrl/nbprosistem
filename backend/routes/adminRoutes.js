const express = require('express');
const pool = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

// Lista todos os usuários
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Aprova um usuário (muda status para APPROVED)
router.patch('/users/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    const checkUser = await pool.query('SELECT id, status FROM users WHERE id = $1', [id]);
    
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (checkUser.rows[0].status === 'APPROVED') {
      return res.status(400).json({ error: 'Usuário já está aprovado' });
    }

    const result = await pool.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role, status',
      ['APPROVED', id]
    );

    res.json({ message: 'Usuário aprovado com sucesso', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

module.exports = router;
