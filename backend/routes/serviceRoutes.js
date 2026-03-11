const express = require('express');
const pool = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

// Lista todos os serviços (GET /api/admin/services)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Cria um novo serviço (POST /api/admin/services)
// Corpo: { name, description, estimated_time, priority_level }
router.post('/', async (req, res) => {
  try {
    const { name, description, estimated_time, priority_level } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'O nome do serviço é obrigatório' });
    }
    
    // Default values se não passados
    const time = estimated_time || 0;
    const priority = priority_level || 'MEDIA';

    const result = await pool.query(
      'INSERT INTO services (name, description, estimated_time, priority_level) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, time, priority]
    );

    res.status(201).json({ message: 'Serviço cadastrado com sucesso', service: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Deletar um serviço (DELETE /api/admin/services/:id)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const checkService = await pool.query('SELECT id FROM services WHERE id = $1', [id]);
    if (checkService.rows.length === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    await pool.query('DELETE FROM services WHERE id = $1', [id]);
    res.json({ message: 'Serviço excluído com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

module.exports = router;
