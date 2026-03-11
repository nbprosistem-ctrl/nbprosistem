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

  const PLACEHOLDER = "__PARAM__";

  let query = text;

  params.forEach((value, index) => {
    const escaped = format("%L", value);
    query = query.replace(new RegExp(`\\$${index + 1}`, "g"), escaped);
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