require('dotenv').config();
const db = require('./utils/database');

async function testQuery() {
  try {
    let query = `
      SELECT t.*, 
             p.name as project_name, 
             s.name as service_name, 
             u.name as owner_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN services s ON t.service_id = s.id
      LEFT JOIN users u ON t.owner_id = u.id
      ORDER BY t.created_at DESC
    `;
    const result = await db.query(query, []);
    console.log('TASKS FOUND:', result.rows.length);

    let queryProj = `
      SELECT p.*, COUNT(t.id) as task_count 
      FROM projects p 
      LEFT JOIN tasks t ON p.id = t.project_id 
      GROUP BY p.id 
      ORDER BY p.created_at DESC
    `;
    const proj = await db.query(queryProj, []);
    console.log('PROJECTS FOUND:', proj.rows.length);

  } catch(e) {
    console.error('SQL ERROR DETECTED:', e);
  } finally {
    process.exit(0);
  }
}

testQuery();
