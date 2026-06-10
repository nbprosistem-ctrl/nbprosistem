const { createClient } = require('@supabase/supabase-js');
const pool = require('../utils/database');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ error: 'Token não fornecido' });

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(403).json({ error: 'Token inválido ou expirado' });
    }

    // Buscar informações adicionais do usuário na tabela local do PostgreSQL
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
    let userDetails = userResult.rows[0];

    // Se o usuário foi criado no painel do Supabase mas ainda não existe no PostgreSQL,
    // criamos e sincronizamos ele automaticamente no primeiro acesso
    if (!userDetails) {
      const name = user.user_metadata?.name || user.email.split('@')[0];
      const role = user.user_metadata?.role || 'COLABORADOR';
      const status = user.user_metadata?.status || 'APPROVED';
      
      const insertRes = await pool.query(
        'INSERT INTO users (id, name, email, role, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET id = $1, role = $4, status = $5 RETURNING *',
        [user.id, name, user.email, role, status]
      );
      userDetails = insertRes.rows[0];
    }

    if (userDetails.is_blocked) {
      return res.status(403).json({ error: 'Sua conta foi bloqueada. Por favor, entre em contato com o administrador.' });
    }

    req.user = {
      id: userDetails.id,
      email: userDetails.email,
      role: userDetails.role,
      status: userDetails.status,
      name: userDetails.name
    };
    
    next();
  } catch (err) {
    console.error('AUTH MIDDLEWARE ERROR:', err);
    return res.status(500).json({ error: 'Erro interno na validação de autenticação' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ error: 'Acesso negado: Requer privilégios de administrador' });
  }
};

const requireApproved = (req, res, next) => {
  if (req.user && req.user.status === 'APPROVED') {
    next();
  } else {
    res.status(403).json({ error: 'Seu usuário ainda está pendente de aprovação pelo administrador' });
  }
};

module.exports = { authenticateToken, requireAdmin, requireApproved };
