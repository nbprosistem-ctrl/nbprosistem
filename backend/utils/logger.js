const pool = require('./database');
const fs = require('fs');

/**
 * Registra uma ação na timeline da tarefa.
 * @param {string} taskId - UUID da Tarefa
 * @param {string} userId - UUID de quem fez a ação
 * @param {string} action - Ação Resumida (ex: 'MOVE', 'COMMENT', 'ATTACH', 'CREATE')
 * @param {string} description - Descrição humanizada do que rolou
 */
const logTaskHistory = async (taskId, userId, action, description) => {
  try {
    await pool.query(
      'INSERT INTO task_history (task_id, user_id, action, description) VALUES ($1, $2, $3, $4)',
      [taskId, userId, action, description]
    );
  } catch (error) {
    // Log detalhado para debug
    const msg = `${new Date().toISOString()} [logTaskHistory ERROR] action=${action} taskId=${taskId} userId=${userId} err=${error.message}\n`;
    try { fs.appendFileSync('./logger_error.log', msg); } catch(e) {}
    console.error('Falha audível ao registrar histórico da Tarefa:', error.message, error.code);
  }
};

module.exports = { logTaskHistory };
