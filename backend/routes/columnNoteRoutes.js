const express = require('express');
const router  = express.Router();
const pool    = require('../utils/database');
const { authenticateToken } = require('../middleware/authMiddleware');

/* ─── GET todas as notas ───────────────────────────────── */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT column_name, note FROM column_notes');
    // Retorna mapa { BACKLOG: '...', TODO: '...', ... }
    const map = {};
    rows.forEach(r => { map[r.column_name] = r.note; });
    res.json(map);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar notas.' });
  }
});

/* ─── PATCH – salva/atualiza uma nota ─────────────────── */
router.patch('/:column', authenticateToken, async (req, res) => {
  const { column } = req.params;
  const { note }   = req.body;

  const VALID = ['BACKLOG','TODO','DOING','REVIEW','DONE'];
  if (!VALID.includes(column)) return res.status(400).json({ error: 'Coluna inválida.' });

  try {
    await pool.query(`
      INSERT INTO column_notes (column_name, note, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (column_name)
      DO UPDATE SET note = $2, updated_at = NOW()
    `, [column, note ?? '']);

    res.json({ column_name: column, note: note ?? '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar nota.' });
  }
});

module.exports = router;
