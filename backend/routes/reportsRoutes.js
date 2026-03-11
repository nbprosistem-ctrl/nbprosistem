const express = require('express');
const pool = require('../utils/database');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authenticateToken); // Requer autenticação básica

// GET /api/reports/metrics
// Consolida todos os dados de Tarefas do Kanban para plotar no Dashboard administrativo
router.get('/metrics', async (req, res) => {
  // Opcional: Proteger para apenas ADMIN ver as métricas gerais.
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }

  try {
    // 1. Contadores Gerais e Widgets
    const totalQuery = await pool.query('SELECT COUNT(*) FROM tasks');
    const totalTasks = parseInt(totalQuery.rows[0].count);

    const doneQuery = await pool.query("SELECT COUNT(*) FROM tasks WHERE status_column = 'DONE'");
    const completedTasks = parseInt(doneQuery.rows[0].count);

    // Tarefas atrasadas (Não estão DONE e due_date é menor que HOJE)
    const delayedQuery = await pool.query("SELECT COUNT(*) FROM tasks WHERE status_column != 'DONE' AND due_date < CURRENT_DATE");
    const delayedTasks = parseInt(delayedQuery.rows[0].count);

    // 2. Gráfico: Tarefas por Status
    const statusQuery = await pool.query(`
      SELECT status_column as name, COUNT(*) as value 
      FROM tasks 
      GROUP BY status_column
    `);
    const tasksByStatus = statusQuery.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));

    // 3. Gráfico: Tarefas por Prioridade
    const priorityQuery = await pool.query(`
      SELECT priority as name, COUNT(*) as value 
      FROM tasks 
      GROUP BY priority
    `);
    const tasksByPriority = priorityQuery.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));

    // 4. Gráfico: Tarefas por Responsável (Usuário)
    // Usamos LEFT JOIN pois pode ter tarefa sem dono (owner_id nulo)
    const ownerQuery = await pool.query(`
      SELECT COALESCE(u.name, 'Sem Dono') as name, COUNT(t.id) as value
      FROM tasks t
      LEFT JOIN users u ON t.owner_id = u.id
      GROUP BY u.name
      ORDER BY value DESC
    `);
    const tasksByOwner = ownerQuery.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));

    res.json({
      widgets: {
        totalTasks,
        completedTasks,
        delayedTasks,
        pendingTasks: totalTasks - completedTasks
      },
      charts: {
        tasksByStatus,
        tasksByPriority,
        tasksByOwner
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao consolidar métricas do dashboard.' });
  }
});

module.exports = router;
