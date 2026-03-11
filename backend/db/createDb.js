const { Client } = require('pg');

async function createDatabase() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // connect to default db first
    password: '123',
    port: 5432,
  });

  try {
    await client.connect();
    console.log("Conectado ao postgres padrão.");
    
    // Check se já existe (não pode criar dentro de transação, p/ pg é direto na query final)
    const checkDb = await client.query("SELECT datname FROM pg_database WHERE datname = 'kanban_db'");
    
    if (checkDb.rows.length === 0) {
      await client.query('CREATE DATABASE kanban_db');
      console.log('Banco de dados kanban_db criado com sucesso!');
    } else {
      console.log('Banco kanban_db já existe.');
    }
    
  } catch (err) {
    console.error('Erro ao criar database:', err);
  } finally {
    await client.end();
  }
}

createDatabase();
