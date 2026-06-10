const express = require('express');
const pool = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

// Lista todos os usuários
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, email, role, status, is_blocked, created_at FROM users WHERE email <> 'admin@nestx.com.br' ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Aprova um usuário (muda status para APPROVED)
router.patch('/users/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    const checkUser = await pool.query('SELECT id, status FROM users WHERE id = $1', [id]);
    
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const result = await pool.query(
      'UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role, status, is_blocked',
      ['APPROVED', id]
    );

    res.json({ message: 'Usuário aprovado com sucesso', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Alterna papel do usuário (ADMIN <-> COLABORADOR)
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode alterar seu próprio nível de acesso' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role, status, is_blocked',
      [role, id]
    );

    res.json({ message: 'Papel do usuário atualizado', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Bloqueia ou desbloqueia um usuário
router.patch('/users/:id/block', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_blocked } = req.body;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode bloquear sua própria conta' });
    }

    const result = await pool.query(
      'UPDATE users SET is_blocked = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role, status, is_blocked',
      [is_blocked, id]
    );

    res.json({ message: is_blocked ? 'Usuário bloqueado' : 'Usuário desbloqueado', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Exclui um usuário
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
    }

    // Nota: Mantemos a integridade referencial. O banco de dados deve estar configurado com ON DELETE SET NULL ou similar se quisermos manter registros.
    // Mas o requisito diz: "Tasks or comments created by deleted users should display: Deleted User"
    // Isso sugere que não deletamos fisicamente ou usamos uma query complexa na leitura.
    // Uma alternativa é apenas desativar, mas o user pediu DELETE.
    // Para cumprir "Deleted User" visualmente sem quebrar o banco, o ideal é o frontend tratar IDs nulos ou o backend tratar no SELECT.
    
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'Usuário removido com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

module.exports = router;
