require('dotenv').config({ path: './.env' });
const jwt = require('jsonwebtoken');
const http = require('http');

// Token falso mas com a assinatura correta do backend
const token = jwt.sign({
    id: 'f8d8f5cb-d6f6-4240-92ba-756d00e6c43b', // ID do mock
    email: 'admin@marketing.com',
    role: 'ADMIN',
    status: 'APPROVED',
    name: 'Admin API'
}, process.env.JWT_SECRET, { expiresIn: '24h' });

console.log('Token forjado com sucesso...');

http.get('http://localhost:3001/api/tasks', { headers: { Authorization: 'Bearer ' + token } }, resTask => {
    let t=''; resTask.on('data', d=>t+=d); resTask.on('end', () => console.log('Tasks GET:', resTask.statusCode, t));
});

http.get('http://localhost:3001/api/projects', { headers: { Authorization: 'Bearer ' + token } }, resProj => {
    let p=''; resProj.on('data', d=>p+=d); resProj.on('end', () => console.log('Proj GET:', resProj.statusCode, p));
});
