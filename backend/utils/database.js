const { Pool } = require("pg");
const format = require("pg-format");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },

  // Pool seguro para produção
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,

  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Log de conexão
pool.on("connect", () => {
  console.log("Connected to Supabase PostgreSQL");
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error", err);
});

// Compatibilidade com PgBouncer (Supabase pooler)
function buildQuery(text, params) {
  if (!params || params.length === 0) return text;

  let query = text;

  params.forEach((value, index) => {
    const escaped = format("%L", value);
    // Usa uma função replacer () => escaped para prevenir que o símbolo '$' dentro de hashes 
    // do bcrypt ou textos normais quebre a string de substituição.
    // Usa (?!\d) para evitar que $1 dê match parcial em $10, $11, etc.
    query = query.replace(new RegExp(`\\$${index + 1}(?!\\d)`, "g"), () => escaped);
  });

  return query;
}

const db = {
  query: async (text, params) => {
    const finalQuery = buildQuery(text, params);
    return pool.query(finalQuery);
  },

  connect: async () => {
    const client = await pool.connect();

    const originalQuery = client.query.bind(client);

    client.query = (text, params) => {
      const finalQuery = buildQuery(text, params);
      return originalQuery(finalQuery);
    };

    return client;
  }
};

module.exports = db;