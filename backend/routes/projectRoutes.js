const express = require('express');
const pool = require('../utils/database');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authenticateToken); // Qualquer utenticado pode ver

// === PROJETOS ===

// Lista todos os projetos (Visível para admin e colaboradores)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar projetos.' });
  }
});

// Cria um projeto (Apenas Admin)
router.post('/', async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado: Apenas administradores podem gerenciar Projetos.' });
  }

  const { name, client, description, start_date, end_date, status } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Nome do projeto obrigatório.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO projects (name, client, description, start_date, end_date, status) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, client, description, start_date || null, end_date || null, status || 'ATIVO']
    );
    res.status(201).json({ message: 'Projeto criado com sucesso', project: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar projeto.' });
  }
});

// Deletar um projeto (Apenas Admin)
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  try {
    const { id } = req.params;
    const check = await pool.query('SELECT id FROM projects WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Projeto não encontrado.' });

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ message: 'Projeto excluído com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao excluir o projeto.' });
  }
});

module.exports = router;
