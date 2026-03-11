const https = require('https');

const data = JSON.stringify({
  email: 'elizandraefeh@gmail.com',
  password: 'wrongpassword'
});

const req = https.request({
  hostname: 'nextfy.onrender.com', // ou nextfy-backend se ele usar 2 projetos
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', body));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
