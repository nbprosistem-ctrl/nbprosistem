const pool = require('./database');

/**
 * Registra um ping estático no Bell Icon de um usuário específico.
 * E opcionalmente emite em tempo real via WebSockets se io for fornecido.
 */
const createNotification = async (userId, title, message, type = 'info', taskId = null, io = null) => {
  if (!userId) return; // Evita quebrar a API se a tarefa não tiver 'owner' ou 'user' fixo.

  try {
    const res = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, task_id) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, title, message, type, taskId]
    );

    const notificationItem = res.rows[0];

    // Emitir via Socket.IO para a sala específica do usuário
    if (io) {
      io.to(userId).emit('notification', notificationItem);
    }
  } catch (error) {
    console.error('Falha audível ao Injetar Notificação para Usuário:', error);
  }
};

module.exports = { createNotification };
