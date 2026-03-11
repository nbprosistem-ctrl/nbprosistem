const pool = require('./database');

/**
 * Registra um ping estático no Bell Icon de um usuário específico.
 * @param {string} userId - UUID de QUEM VAI RECEBER a notificação
 * @param {string} title - Título Forte
 * @param {string} message - Corpo descritivo do que aconteceu na conta/tarefa
 */
const createNotification = async (userId, title, message) => {
  if (!userId) return; // Evita quebrar a API se a tarefa não tiver 'owner' ou 'user' fixo.

  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message) 
       VALUES ($1, $2, $3)`,
      [userId, title, message]
    );
  } catch (error) {
    console.error('Falha audível ao Injetar Notificação para Usuário:', error);
  }
};

module.exports = { createNotification };
