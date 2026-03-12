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

// DELETE /api/notifications - Excluir TODAS as notificações do usuário logado
router.delete('/', async (req, res) => {
  const userId = req.user.id;
  try {
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    res.json({ message: 'Todas as notificações foram removidas.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover todas as notificações.' });
  }
});

// DELETE /api/notifications/:id - Excluir uma única notificação
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const result = await pool.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada.' });
    }
    res.json({ message: 'Notificação removida.', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover notificação.' });
  }
});

module.exports = router;
