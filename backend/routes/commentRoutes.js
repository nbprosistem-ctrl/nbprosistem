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
        tc.user_id, 
        COALESCE(u.name, 'Deleted User') as user_name 
      FROM task_comments tc
      LEFT JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = $1
      ORDER BY tc.created_at ASC
    `, [id]);
    
    const comments = commentsQuery.rows;

    // Buscar menções para todos os comentários se a tabela existir
    for (let c of comments) {
      c.mentions = [];
      try {
        const mentionsQ = await pool.query(`
          SELECT m.user_id, u.name 
          FROM comment_mentions m
          JOIN users u ON m.user_id = u.id
          WHERE m.comment_id = $1
        `, [c.id]);
        c.mentions = mentionsQ.rows || [];
      } catch (err) {
        console.error('Erro ao buscar menções:', err.message);
      }
    }
    
    res.json(comments);
  } catch (err) {
    console.error('GET COMMENTS ERROR:', err);
    res.status(500).json({ error: 'Erro ao buscar comentários.' });
  }
});

// POST /api/tasks/:id/comments - Adicionar comentário
router.post('/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  const userId = req.user.id; 

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
    let mentionsData = [];

    // Busca autor para o retorno
    const userQuery = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    const userName = userQuery.rows[0].name;

    // Registro na Timeline e Notificações (Não fatais)
    try {
      await logTaskHistory(id, req.user.id, 'COMMENT', `Deixou um comentário.`);
      
      const dQuery = await pool.query('SELECT owner_id, title FROM tasks WHERE id = $1', [id]);
      const taskData = dQuery.rows[0];

      if(taskData && taskData.owner_id && taskData.owner_id !== req.user.id){
          await createNotification(
              taskData.owner_id,
              'Novo comentário',
              `${req.user.name} comentou em "${taskData.title}": "${comment.substring(0, 30)}..."`,
              'task_comment',
              id,
              req.io
          ).catch(() => {});
      }
      
      const mentions = comment.match(/@([a-zA-ZÀ-ÿ\s]+?)(?=[,.;!?]|\s@|$)/g);
      if(mentions) {
          for(let m of mentions) {
              const mentionedName = m.substring(1).trim(); 
              const userQ = await pool.query('SELECT id, name FROM users WHERE name ILIKE $1 LIMIT 1', [`%${mentionedName}%`]);
              if(userQ.rows.length > 0) {
                  const mentionedUserId = userQ.rows[0].id;

                  await pool.query('INSERT INTO comment_mentions (comment_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newCommentId, mentionedUserId]);

                  if(mentionedUserId !== req.user.id){
                      await createNotification(
                          mentionedUserId,
                          'Você foi mencionado!',
                          `${req.user.name} citou você na Tarefa "${taskData.title}".`,
                          'mention',
                          id,
                          req.io
                      ).catch(() => {});
                  }
              }
          }
      }

      const mentionsResult = await pool.query(`
        SELECT m.user_id, u.name 
        FROM comment_mentions m
        JOIN users u ON m.user_id = u.id
        WHERE m.comment_id = $1
      `, [newCommentId]);
      mentionsData = mentionsResult.rows || [];

    } catch (secErr) {
      console.error('Erro secundário no comentário:', secErr.message);
    }

    const newCommentObj = {
      id: newCommentId,
      comment: comment,
      user_id: userId,
      user_name: userName,
      created_at: insertedComment.rows[0].created_at,
      mentions: mentionsData
    };
    
    if (req.io) {
       req.io.emit('comment_added', { taskId: id, comment: newCommentObj });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Comentário adicionado.', 
      comment: newCommentObj 
    });
  } catch (err) {
    console.error('CRITICAL COMMENT ERROR:', err);
    res.status(500).json({ error: 'Erro ao criar comentário.' });
  }
});

module.exports = router;
