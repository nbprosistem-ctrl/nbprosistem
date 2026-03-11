require('dotenv').config({path: '.env'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  try {
    const result = await pool.query(`INSERT INTO tasks (title, project_id, recurrence_days, recurrence_time, recurrence_start_date) VALUES ('DB TEST SCRIPT TOOL', '0b28e510-bf2c-4182-a82a-ff213707ee33', '1,3', '18:15', '2026-03-09') RETURNING *`);
    console.log("DB RESULT:", result.rows[0]);
  } catch(e) { console.error("DB ERROR:", e); }
  pool.end();
})();
