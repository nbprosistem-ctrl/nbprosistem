const express = require('express');
const pool = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authenticateToken);

// GET /api/templates - Listar todos os templates com suas subtarefas
router.get('/', async (req, res) => {
  try {
    const templates = await pool.query(`
      SELECT t.*, 
        COALESCE(json_agg(
          json_build_object(
            'id', tt.id,
            'title', tt.title,
            'description', tt.description,
            'priority', tt.priority,
            'sort_order', tt.sort_order
          ) ORDER BY tt.sort_order
        ) FILTER (WHERE tt.id IS NOT NULL), '[]') as tasks
      FROM task_templates t
      LEFT JOIN template_tasks tt ON tt.template_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    res.json(templates.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar templates.' });
  }
});

// POST /api/templates - Criar novo template (Admin)
router.post('/', requireAdmin, async (req, res) => {
  const { name, description, tasks } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome do template é obrigatório.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tmplResult = await client.query(
      `INSERT INTO task_templates (name, description) VALUES ($1, $2) RETURNING *`,
      [name, description || null]
    );
    const template = tmplResult.rows[0];

    // Inserir as subtarefas do template em lote
    if (tasks && tasks.length > 0) {
      for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        await client.query(
          `INSERT INTO template_tasks (template_id, title, description, priority, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [template.id, t.title, t.description || null, t.priority || 'MEDIA', i]
        );
      }
    }

    await client.query('COMMIT');

    // Buscar template completo para retornar
    const full = await pool.query(`
      SELECT t.*, 
        COALESCE(json_agg(
          json_build_object('id', tt.id, 'title', tt.title, 'description', tt.description, 'priority', tt.priority, 'sort_order', tt.sort_order)
          ORDER BY tt.sort_order
        ) FILTER (WHERE tt.id IS NOT NULL), '[]') as tasks
      FROM task_templates t
      LEFT JOIN template_tasks tt ON tt.template_id = t.id
      WHERE t.id = $1
      GROUP BY t.id
    `, [template.id]);

    res.status(201).json(full.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar template.' });
  } finally {
    client.release();
  }
});

// DELETE /api/templates/:id - Remover template (Admin) - subtarefas cascadeiam
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM task_templates WHERE id = $1', [req.params.id]);
    res.json({ message: 'Template removido.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir template.' });
  }
});

// POST /api/templates/:id/apply - Gerar tarefas reais a partir de um template
router.post('/:id/apply', async (req, res) => {
  const { project_id, owner_id, due_date } = req.body;
  const { id } = req.params;

  if (!project_id) return res.status(400).json({ error: 'project_id é obrigatório.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Buscar subtarefas do template
    const ttResult = await client.query(
      `SELECT * FROM template_tasks WHERE template_id = $1 ORDER BY sort_order`,
      [id]
    );

    const createdTasks = [];
    for (const tt of ttResult.rows) {
      const taskResult = await client.query(`
        INSERT INTO tasks (project_id, owner_id, title, description, priority, due_date, status_column, recurrence)
        VALUES ($1, $2, $3, $4, $5, $6, 'TODO', 'NENHUMA')
        RETURNING *
      `, [project_id, owner_id || null, tt.title, tt.description || null, tt.priority, due_date || null]);

      createdTasks.push(taskResult.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ created: createdTasks.length, tasks: createdTasks });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erro ao aplicar template.' });
  } finally {
    client.release();
  }
});

module.exports = router;
