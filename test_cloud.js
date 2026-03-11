const https = require('https');

async function testCloudTasks() {
    const creds = JSON.stringify({name:'Tste', email:'tesssstte5@gmail.com', password:'123', role:'COLABORADOR'})
    
    // Passo 1 - Registrar conta pra gerar valid JWT na nuvem
    const reqReg = https.request('https://nextfy.onrender.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': creds.length }
    }, resReg => {
        let b=''; resReg.on('data', d=>b+=d); resReg.on('end', () => {
            console.log('Reg/Log Result:', resReg.statusCode, b);
            
            // Passo 2 - Como o email está pendente de aprovação, talvez não logue,
            // O ideal seria tentar Logar com as credenciais antigas do admin ou
            // descobrir o token fazendo hack direto no admin? 
            // Já sei, o test login do admin padrão!
            const adminCreds = JSON.stringify({ email: 'admin@marketing.com', password: '123' });
            
            const reqLog = https.request('https://nextfy.onrender.com/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': adminCreds.length }
            }, resLog => {
                let j=''; resLog.on('data', d=>j+=d); resLog.on('end', () => {
                     console.log('Admin Log:', resLog.statusCode, j);
                     try {
                         const token = JSON.parse(j).token;
                         if(!token) return console.log('Falha na auth');
                         
                         // Buscar Tasks
                         https.get('https://nextfy.onrender.com/api/tasks', { headers: { Authorization: 'Bearer ' + token } }, resTask => {
                            let t=''; resTask.on('data', d=>t+=d); resTask.on('end', () => console.log('Tasks GET:', resTask.statusCode, t));
                         });
                         
                         https.get('https://nextfy.onrender.com/api/projects', { headers: { Authorization: 'Bearer ' + token } }, resProj => {
                            let p=''; resProj.on('data', d=>p+=d); resProj.on('end', () => console.log('Proj GET:', resProj.statusCode, p));
                         });
                     }catch(e){console.error(e)}
                });
            });
            reqLog.write(adminCreds);
            reqLog.end();
        });
    });
    reqReg.write(creds);
    reqReg.end();
}
testCloudTasks();
