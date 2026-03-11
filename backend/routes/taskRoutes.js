const express = require('express');
const pool = require('../utils/database');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');
const { logTaskHistory } = require('../utils/logger');
const { createNotification } = require('../utils/notifier');

const router = express.Router();
router.use(authenticateToken); // Usuários autenticados

// Listar todas as tarefas (GET /api/tasks) com opção de filtrar
router.get('/', async (req, res) => {
  try {
    const { project_id } = req.query;

    let query = `
      SELECT t.*, 
             p.name as project_name, 
             s.name as service_name, 
             u.name as owner_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN services s ON t.service_id = s.id
      LEFT JOIN users u ON t.owner_id = u.id
    `;
    
    const params = [];

    if (project_id) {
      query += ` WHERE t.project_id = $1`;
      params.push(project_id);
    }
    
    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    require('fs').writeFileSync('./tasks_error.log', JSON.stringify({ message: err.message, stack: err.stack }));
    res.status(500).json({ error: 'Erro ao buscar tarefas.', system: err.message });
  }
});

// Criar nova Tarefa (POST /api/tasks)
router.post('/', async (req, res) => {
  // Qualquer usuário autenticado (Aprovado) pode criar tarefas. 
  // O middleware authenticateToken já garante que ele é um funcionário válido.

  const { 
    title, description, project_id, service_id, owner_id, priority, due_date, recurrence,
    recurrence_days, recurrence_time, recurrence_start_date, recurrence_end_type, recurrence_end_date, recurrence_occurrences
  } = req.body;
  

  if (!title || !project_id) {
    return res.status(400).json({ error: 'Título e Projeto são propriedades obrigatórias da tarefa.' });
  }

  // Se for uma tarefa recorrente que não mandou a Dt de Vencimento, assume a Start Date + Hora
  let final_due_date = due_date || null;
  if (recurrence && recurrence !== 'NENHUMA' && recurrence_start_date) {
    let dateStr = recurrence_start_date;
    if (recurrence_time) {
      dateStr += `T${recurrence_time.length === 5 ? recurrence_time + ':00' : recurrence_time}`;
    } else {
      dateStr += 'T00:00:00';
    }
    // Converter a string YYYY-MM-DDTHH:mm:ss pra OBJ Data e em seguida pra ISO
    final_due_date = new Date(dateStr).toISOString();
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks (
        title, description, project_id, service_id, owner_id, priority, due_date, recurrence,
        recurrence_days, recurrence_time, recurrence_start_date, recurrence_end_type, recurrence_end_date, recurrence_occurrences
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        title, 
        description || null,
        project_id, 
        service_id || null, 
        owner_id || null, 
        priority || 'MEDIA', 
        final_due_date, 
        recurrence || 'NENHUMA',
        recurrence_days || null,
        recurrence_time || null,
        recurrence_start_date || null,
        recurrence_end_type || null,
        recurrence_end_date || null,
        recurrence_occurrences || null
      ]
    );

    const createdTask = result.rows[0];

    // Logar ação silenciosamente
    await logTaskHistory(
      createdTask.id, 
      req.user.id, 
      'CREATE', 
      owner_id 
        ? `Criou a tarefa e atribuiu a um membro.` 
        : `Criou a tarefa sem responsáveis.`
    );

    // Se criou e já delegou pra alguém na mesma hora (Que não for eu)
    if (owner_id && owner_id !== req.user.id) {
       await createNotification(
         owner_id,
         'Nova Tarefa Atribuída',
         `Você foi escalado para: ${title}`,
         'task_assigned',
         createdTask.id,
         req.io
       );
    }

    // Emite o evento global para os outros clientes atualizarem o board
    if (req.io) {
      req.io.emit('card_created', createdTask);
    }

    res.status(201).json(createdTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar tarefa.' });
  }
});

// Atualizar APENAS a Coluna da Tarefa (PATCH /api/tasks/:id/status) - DnD
// Qualquer usuário logado e aprovado pode arrastar um cartão livremente para interagir com a equipe
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status_column } = req.body;

  if (!status_column) return res.status(400).json({ error: 'O novo status é obrigatório.' });

  try {
    // 1. Pega os dados antigos da tarefa original ANTES de atualizar
    const oldTaskQuery = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (oldTaskQuery.rows.length === 0) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    const oldTask = oldTaskQuery.rows[0];

    // Proteção: Somente Admins podem remover uma tarefa da coluna Finalizado (DONE)
    if (oldTask.status_column === 'DONE' && status_column !== 'DONE' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas administradores podem restaurar tarefas finalizadas.' });
    }

    // 2. Atualiza o status do Cartão arrastado
    const result = await pool.query(
      `UPDATE tasks SET status_column = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status_column, id]
    );
    
    // Se o cartão foi movido para DONE e tinha uma due_date no futuro, atualiza a due_date para agora
    if (status_column === 'DONE' && oldTask.due_date && new Date(oldTask.due_date) > new Date()) {
      await pool.query('UPDATE tasks SET due_date = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    }

    // 3. Automação de Cópia: Se o cartão mudou para DONE, checar recorrência!
    if (status_column === 'DONE' && oldTask.status_column !== 'DONE' && oldTask.recurrence !== 'NENHUMA') {
      
      let newDueDate = null;
      let shouldClone = true;
      let newOccurrences = oldTask.recurrence_occurrences;

      if (oldTask.due_date) {
        // Usa a dueDate antiga como base da nova matemática de datas
        const dateObj = new Date(oldTask.due_date);
        
        switch(oldTask.recurrence) {
          case 'DIARIA':
            dateObj.setDate(dateObj.getDate() + 1);
            break;
          case 'SEMANAL':
            if (oldTask.recurrence_days) {
              const daysArr = oldTask.recurrence_days.split(',').map(Number).sort();
              const currentDay = dateObj.getDay();
              const nextDay = daysArr.find(d => d > currentDay);
              
              if (nextDay !== undefined) {
                dateObj.setDate(dateObj.getDate() + (nextDay - currentDay));
              } else {
                dateObj.setDate(dateObj.getDate() + (7 - currentDay + daysArr[0]));
              }
            } else {
              dateObj.setDate(dateObj.getDate() + 7);
            }
            break;
          case 'MENSAL':
            dateObj.setMonth(dateObj.getMonth() + 1);
            break;
        }

        // Verifica as regras de Término
        if (oldTask.recurrence_end_type === 'AFTER_OCCURRENCES') {
          if (newOccurrences && newOccurrences > 1) {
             newOccurrences -= 1;
          } else {
             shouldClone = false;
          }
        } else if (oldTask.recurrence_end_type === 'ON_DATE') {
          if (oldTask.recurrence_end_date && dateObj > new Date(oldTask.recurrence_end_date)) {
             shouldClone = false;
          }
        }
        
        newDueDate = dateObj.toISOString();
      }

      // Clona a tarefa de volta pra esquerda (TODO), respeitando as colunas de recorrência
      if (shouldClone) {
        const clonedTaskRes = await pool.query(
          `INSERT INTO tasks (
            title, description, project_id, service_id, owner_id, priority, due_date, recurrence, status_column,
            recurrence_days, recurrence_time, recurrence_start_date, recurrence_end_type, recurrence_end_date, recurrence_occurrences
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'TODO', $9, $10, $11, $12, $13, $14) RETURNING *`,
          [
            oldTask.title, 
            oldTask.description, 
            oldTask.project_id, 
            oldTask.service_id, 
            oldTask.owner_id, 
            oldTask.priority, 
            newDueDate || oldTask.due_date,
            oldTask.recurrence,
            oldTask.recurrence_days,
            oldTask.recurrence_time,
            oldTask.recurrence_start_date,
            oldTask.recurrence_end_type,
            oldTask.recurrence_end_date,
            newOccurrences
          ]
        );

        // Avisa a todos que uma tarefa recorrente apareceu na Coluna TODO
        if (req.io) {
          req.io.emit('card_created', clonedTaskRes.rows[0]);
        }

        // Sino Exclusivo para o Responsável
        if (oldTask.owner_id) {
          await createNotification(
            oldTask.owner_id,
            'Tarefa Recorrente Gerada',
            `A renovação do ciclo de "${oldTask.title}" ocorreu automaticamente.`,
            'info',
            clonedTaskRes.rows[0].id,
            req.io
          );
        }
      }
    }

    // Loga a Movimentação da Coluna no Histórico
    await logTaskHistory(
       id,
       req.user.id,
       'MOVE',
       `Moveu o cartão para a coluna [${status_column}].`
    );

    // Dispara Sino caso quem arrastou for Diferente do Dono
    if(oldTask.owner_id && oldTask.owner_id !== req.user.id) {
       let type = status_column === 'DONE' ? 'task_completed' : 'info';
       await createNotification(
         oldTask.owner_id,
         status_column === 'DONE' ? 'Tarefa Finalizada' : 'Status Atualizado',
         status_column === 'DONE' ? `A tarefa "${oldTask.title}" foi concluída.` : `A tarefa "${oldTask.title}" foi movida para ${status_column}.`,
         type,
         id,
         req.io
       );
    }

    // Avisa todos para atualizar o card na interface
    if (req.io) {
      req.io.emit('card_moved', result.rows[0]);
    }

    res.json({ message: 'Status atualizado com sucesso.', task: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao mover a tarefa.' });
  }
});

// Deletar Tarefa (DELETE /api/tasks/:id) - Apenas Admin
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  try {
    const { id } = req.params;
    const check = await pool.query('SELECT id FROM tasks WHERE id = $1', [id]);
    
    if (check.rows.length === 0) return res.status(404).json({ error: 'Tarefa não encontrada.' });

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ message: 'Tarefa excluída com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao excluir a tarefa.' });
  }
});

module.exports = router;
