const express = require('express');
const pool = require('../utils/database');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken);

// GET /api/notifications - Listar notificações DO USUÁRIO LOGADO
router.get('/', async (req, res) => {
  const userId = req.user.id;
  try {
    const query = await pool.query(`
      SELECT * 
      FROM notifications 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId]); // Limitado pragmáticmente aos ultimos 50 para resguardar UX Performance
    
    res.json(query.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar notificações.' });
  }
});

// PATCH /api/notifications/:id/read - Marcar notificação como Lida.
router.patch('/:id/read', async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
      // Garantir que a notificação existia e de fato PERTENCE a este usuário p/ evitar invasão
      const result = await pool.query(`
        UPDATE notifications 
        SET read = true 
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [id, userId]);
      
      if(result.rows.length === 0){
        return res.status(404).json({ error: 'Nenhuma notificação encontrada ou recusa de posse.' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao assinar read boolean.' });
    }
  });

module.exports = router;
