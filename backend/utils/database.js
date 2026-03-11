const { Pool } = require('pg');
const format = require('pg-format');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // Configurações para manter conexões ativas e evitar que o Supabase
  // encerre conexões ociosas, causando o Node.js a sair com Exit code 0
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  max: 10,
});

// Manter o event loop ativo com ping periódico ao banco
setInterval(async () => {
  try {
    await pool.query('SELECT 1');
  } catch (e) {
    // Silencioso - só garante que o evento está ativo
  }
}, 25000);

// Converte uma query parametrizada node-pg ($1, $2...) em uma query literal
// segura usando pg-format. Necessário pois o Supabase Transaction Pooler
// (PgBouncer, porta 6543) não suporta Prepared Statements do node-pg (Erro 42601).
function buildQuery(text, params) {
  if (!params || params.length === 0) return text;

  // Estratégia: substituir $N por um placeholder único ANTES de escapar os valores
  // para evitar que o valor de $1 (ex: hash bcrypt '$2b$10$...') seja re-processado
  const PLACEHOLDER = '\x00PARAM\x00';
  let parts = [text];
  
  // Divide a query nos placeholders $N (do maior pro menor para evitar $1 x $10)
  const sortedParams = params.map((v, i) => ({ v, i: i + 1 })).sort((a, b) => b.i - a.i);
  
  for (const { i } of sortedParams) {
    const newParts = [];
    for (const part of parts) {
      const split = part.split('$' + String(i));
      newParts.push(...split.flatMap((s, idx) => idx < split.length - 1 ? [s, `${PLACEHOLDER}${i}${PLACEHOLDER}`] : [s]));
    }
    parts = newParts;
  }
  
  // Monta o resultado substituindo os placeholders pelos valores escapados
  const result = parts.map(part => {
    const match = part.match(new RegExp(`^${PLACEHOLDER}(\\d+)${PLACEHOLDER}$`));
    if (match) {
      const idx = parseInt(match[1]) - 1;
      return format('%L', params[idx]);
    }
    return part;
  }).join('');
  
  return result;
}

const poolWrapper = {
  query: async (text, params) => {
    const finalQuery = buildQuery(text, params);
    return await pool.query(finalQuery);
  },
  connect: async () => {
    const client = await pool.connect();
    const origQuery = client.query.bind(client);
    client.query = (text, params) => origQuery(buildQuery(text, params));
    return client;
  }
};

module.exports = poolWrapper;
