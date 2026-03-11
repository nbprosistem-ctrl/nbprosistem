const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const pool = require('../utils/database');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    const requestedRole = (role === 'ADMIN' || role === 'COLABORADOR') ? role : 'COLABORADOR';

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, status',
      [name, email, passwordHash, requestedRole, 'PENDING']
    );

    res.status(201).json({ message: 'Usuário cadastrado com sucesso. Aguardando aprovação do Admin.', user: result.rows[0] });
  } catch (err) {
    fs.appendFileSync('./login_error.log', new Date().toISOString() + ' REGISTER ERROR: ' + err.message + '\n');
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = userResult.rows[0];
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (user.status !== 'APPROVED') {
      return res.status(403).json({ error: 'Usuário pendente de aprovação pelo administrador' });
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      name: user.name
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user: tokenPayload });
  } catch (err) {
    fs.appendFileSync('./login_error.log', new Date().toISOString() + ' LOGIN ERROR: ' + err.message + ' STACK: ' + err.stack + '\n');
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

module.exports = router;
