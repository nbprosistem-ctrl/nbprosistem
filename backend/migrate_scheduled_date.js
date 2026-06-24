require('dotenv').config();
const pool = require('./utils/database');

async function migrate() {
  try {
    console.log("Adding scheduled_date to tasks...");
    await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP;");
    console.log("Migration successful.");
  } catch (e) {
    console.error("Migration failed", e);
  } finally {
    process.exit(0);
  }
}

migrate();
