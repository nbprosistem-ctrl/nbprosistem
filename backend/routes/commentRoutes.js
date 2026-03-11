const express = require('express');
const pool = require('../utils/database');
const { authenticateToken } = require('../middleware/authMiddleware');
const { logTaskHistory } = require('../utils/logger');
const { createNotification } = require('../utils/notifier');

const router = express.Router();
router.use(authenticateToken);

// GET /api/tasks/:id/comments - Listar comentários de uma tarefa
router.get('/:id/comments', async (req, res) => {
  const { id } = req.params;
  try {
    const commentsQuery = await pool.query(`
      SELECT 
        tc.id, 
        tc.comment, 
        tc.created_at, 
        u.id as user_id, 
        u.name as user_name 
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = $1
      ORDER BY tc.created_at ASC
    `, [id]);
    
    res.json(commentsQuery.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar comentários.' });
  }
});

// POST /api/tasks/:id/comments - Adicionar comentário
router.post('/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  const userId = req.user.id; // Vem do token JWT

  if (!comment || comment.trim() === '') {
    return res.status(400).json({ error: 'Comentário não pode estar vazio.' });
  }

  try {
    const insertedComment = await pool.query(`
      INSERT INTO task_comments (task_id, user_id, comment)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, userId, comment]);

    const newCommentId = insertedComment.rows[0].id;

    // Buscar os dados do usuário recém-inserido para já retornar formatado pro front
    const userQuery = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    const userName = userQuery.rows[0].name;

    // Registro silencioso na Timeline
    await logTaskHistory(
        id, 
        req.user.id, 
        'COMMENT', 
        `Deixou um comentário.`
    );

    // [Notificações] Buscar Dono da Tarefa para Avisar sobre o Comentário
    const dQuery = await pool.query('SELECT owner_id, title FROM tasks WHERE id = $1', [id]);
    const taskData = dQuery.rows[0];

    // Se a tarefa tem dono, e o dono NÃO É quem comentou
    if(taskData && taskData.owner_id && taskData.owner_id !== req.user.id){
        await createNotification(
            taskData.owner_id,
            'Novo comentário',
            `${req.user.name} comentou em "${taskData.title}": "${comment.substring(0, 30)}..."`,
            'task_comment',
            id,
            req.io
        );
    }
    
    // Verifica se houve menção @
    const mentions = comment.match(/@(\w+)/g);
    if(mentions) {
        // Para cada menção, tenta achar o user_id no db
        for(let m of mentions) {
            const mentionedName = m.substring(1); // Tira o @
            const userQ = await pool.query('SELECT id FROM users WHERE name ILIKE $1', [`%${mentionedName}%`]);
            if(userQ.rows.length > 0) {
                const mentionedUserId = userQ.rows[0].id;
                // Não notificar a si mesmo se por acaso autotaggear
                if(mentionedUserId !== req.user.id){
                    await createNotification(
                        mentionedUserId,
                        'Você foi mencionado!',
                        `${req.user.name} citou você na Tarefa "${taskData.title}".`,
                        'task_comment',
                        id,
                        req.io
                    );
                }
            }
        }
    }

    // Buscando o comment com formatação do JOIN puro pra devolver p/ Front
    const selectQuery = await pool.query(`
      SELECT 
        tc.id, 
        tc.comment, 
        tc.created_at, 
        tc.user_id,
        u.name as user_name
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.id = $1
    `, [newCommentId]);

    const newComment = selectQuery.rows[0];
    
    // Emitir via socket para a board atualizar em real-time
    if (req.io) {
       req.io.emit('comment_added', { taskId: id, comment: newComment });
    }

    res.status(201).json({ message: 'Comentário adicionado.', comment: newComment });
  } catch (err) {
    console.error('COMMENT ERROR CODE:', err.code);
    console.error('COMMENT ERROR MSG:', err.message);
    console.error('COMMENT ERROR DETAIL:', err.detail);
    console.error('COMMENT FULL ERR:', err);
    res.status(500).json({ error: 'Erro ao criar comentário.', detail: err.message, code: err.code });
  }
});

module.exports = router;
