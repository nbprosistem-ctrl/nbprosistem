require('dotenv').config({ path: './.env' });
const express = require('express');
const pool = require('./utils/database');
const jwt = require('jsonwebtoken');
const app = express();

const token = jwt.sign({ id: 'f8d8f5cb-d6f6-4240-92ba-756d00e6c43b', email: 'admin@marketing.com', role: 'ADMIN', status: 'APPROVED', name: 'Admin API' }, process.env.JWT_SECRET, { expiresIn: '24h' });

app.get('/api/tasks', async (req, res) => {
  try {
    const { project_id } = req.query;
    let query = `
      SELECT t.*, 
             p.name as project_name, 
             s.name as service_name, 
             u.name as owner_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN services s ON t.service_id = s.id
      LEFT JOIN users u ON t.owner_id = u.id
    `;
    const params = [];
    if (project_id) {
       query += ` WHERE t.project_id = $1`;
       params.push(project_id);
    }
    query += ` ORDER BY t.created_at DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('BINGO ERROR ->', err.message, err.stack);
    res.status(500).json({ error: 'Erro ao buscar tarefas.' });
  }
});

const server = app.listen(5555, () => {
   const http = require('http');
   http.get('http://localhost:5555/api/tasks', { headers: { Authorization: 'Bearer ' + token } }, resTask => {
       resTask.on('data', d => {});
       resTask.on('end', () => { setTimeout(() => process.exit(0), 100); });
   });
});
