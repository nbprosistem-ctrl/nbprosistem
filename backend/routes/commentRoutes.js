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

    // Para cada comentário, buscar suas menções
    for (let c of comments) {
      const mentionsQ = await pool.query(`
        SELECT m.user_id, u.name 
        FROM comment_mentions m
        JOIN users u ON m.user_id = u.id
        WHERE m.comment_id = $1
      `, [c.id]);
      c.mentions = mentionsQ.rows || [];
    }
    
    res.json(comments);
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

    // Tenta processar notificações e menções de forma assíncrona/silenciosa
    try {
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
      
      // Regex que suporta nomes com espaços (ex: @Thiago Sertori)
      // Captura @ seguido de letras/espaços até encontrar pontuação ou nova menção
      const mentions = comment.match(/@([a-zA-ZÀ-ÿ\s]+?)(?=[,.;!?]|\s@|$)/g);
      if(mentions) {
          for(let m of mentions) {
              const mentionedName = m.substring(1).trim(); 
              // Busca usuário por nome exato ou similar
              const userQ = await pool.query('SELECT id, name FROM users WHERE name ILIKE $1 LIMIT 1', [`%${mentionedName}%`]);
              if(userQ.rows.length > 0) {
                  const mentionedUserId = userQ.rows[0].id;

                  // Salvar na tabela comment_mentions
                  await pool.query('INSERT INTO comment_mentions (comment_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newCommentId, mentionedUserId]);

                  // Não notificar a si mesmo
                  if(mentionedUserId !== req.user.id){
                      await createNotification(
                          mentionedUserId,
                          'Você foi mencionado!',
                          `${req.user.name} citou você na Tarefa "${taskData.title}".`,
                          'mention',
                          id,
                          req.io
                      );
                  }
              }
          }
      }
    } catch (notifErr) {
      console.error('FALHA NÃO CRÍTICA NA NOTIFICAÇÃO/MENTION:', notifErr);
      // Não interrompe o fluxo de sucesso do comentário
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

    // Busca as menções salvas para este comentário
    const mentionsQuery = await pool.query(`
      SELECT m.user_id, u.name 
      FROM comment_mentions m
      JOIN users u ON m.user_id = u.id
      WHERE m.comment_id = $1
    `, [newCommentId]);

    const newCommentObj = {
      ...selectQuery.rows[0],
      mentions: mentionsQuery.rows || []
    };
    
    // Emitir via socket para a board atualizar em real-time
    if (req.io) {
       req.io.emit('comment_added', { taskId: id, comment: newCommentObj });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Comentário adicionado.', 
      comment: newCommentObj 
    });
  } catch (err) {
    console.error('COMMENT ERROR CODE:', err.code);
    console.error('COMMENT ERROR MSG:', err.message);
    console.error('COMMENT ERROR DETAIL:', err.detail);
    console.error('COMMENT FULL ERR:', err);
    res.status(500).json({ error: 'Erro ao criar comentário.', detail: err.message, code: err.code });
  }
});

module.exports = router;
