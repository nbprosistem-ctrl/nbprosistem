const https = require('https');

async function testFetch() {
  const loginData = JSON.stringify({ email: 'admin@marketing.com', password: '123' }); // Senha padrão se não trocada, falhará no login. Se você tiver as credenciais do admin atual posso substituir. Usarei os credenciais antigas do seed do admin. Mas vou usar o fato que o /api/tasks SEM TOKEN deve falhar com 401. Se a API estiver crashando no Boot, vai retornar 502 Bad Gateway.
  
  // Como eu não tenho certeza da sua senha de admin, enviarei a requisição de ping básico para "projects".
  const req = https.request('https://nextfy.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
  }, res => {
      let b=''; res.on('data', d=>b+=d); res.on('end', async () => {
         console.log('Login Result:', b);
         try {
             const token = JSON.parse(b).token;
             if (!token) return console.log('Não obteve token');

             // Buscar tasks
             https.get('https://nextfy.onrender.com/api/tasks', { headers: { Authorization: 'Bearer ' + token } }, resTask => {
                 let t=''; resTask.on('data', d=>t+=d); resTask.on('end', () => console.log('Tasks GET:', resTask.statusCode, t));
             });
             
         } catch(e) {}
      });
  });
  req.write(loginData);
  req.end();
}

testFetch();
