const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function initDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Conectado ao banco de dados com sucesso.');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath).toString();

    console.log('Executando script de inicialização...');
    await client.query(sql);

    console.log('Banco de dados inicializado com as tabelas e admin padrão!');
  } catch (err) {
    console.error('Erro ao inicializar o banco:', err);
  } finally {
    await client.end();
  }
}

initDb();
