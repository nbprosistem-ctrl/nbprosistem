const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ error: 'Token não fornecido' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido ou expirado' });
    req.user = user;
    next();
  });
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
