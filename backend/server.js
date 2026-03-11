const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Evita que o servidor morra silenciosamente com promises rejeitadas não tratadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  UnhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️  UncaughtException:', err.message, err.stack);
});

const pool = require('./utils/database');

const initializeDatabase = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'COLABORADOR',
                status VARCHAR(50) DEFAULT 'PENDING',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS projects (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                client VARCHAR(255),
                description TEXT,
                start_date DATE,
                end_date DATE,
                status VARCHAR(50) DEFAULT 'ATIVO',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS services (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                estimated_time INTEGER,
                priority_level VARCHAR(50) DEFAULT 'MEDIA',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
                service_id UUID REFERENCES services(id) ON DELETE SET NULL,
                owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                priority VARCHAR(50) DEFAULT 'MEDIA',
                due_date DATE,
                recurrence VARCHAR(50) DEFAULT 'NENHUMA',
                status_column VARCHAR(50) DEFAULT 'TODO',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS task_comments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                comment TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS task_attachments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                file_name VARCHAR(255) NOT NULL,
                file_url VARCHAR(500) NOT NULL,
                file_type VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS task_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                action VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS task_templates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS template_tasks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                template_id UUID REFERENCES task_templates(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                priority VARCHAR(10) DEFAULT 'MEDIA',
                sort_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS column_notes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                column_name VARCHAR(50) UNIQUE NOT NULL,
                note TEXT DEFAULT '',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_days VARCHAR(50);
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_time TIME;
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_start_date DATE;
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_end_type VARCHAR(50);
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_occurrences INTEGER;
        `);
        console.log('Tabelas de BD verificadas e garantidas (Supabase).');
        // Inserir admin padrão separadamente (hash de bcrypt tem $ que conflita com template literal)
        const ADMIN_HASH = '$2b$10$MFy1bNedYeZY6m1PsUdMtOkLdWAdwFkOArOK7.rpUW96oY9RnJhbi';
        await pool.query(
            'INSERT INTO users (name, email, password_hash, role, status) SELECT $1, $2, $3, $4, $5 WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = $2)',
            ['Administrador', 'admin@marketing.com', ADMIN_HASH, 'ADMIN', 'APPROVED']
        );
        console.log('Admin padrão garantido.');
    } catch (err) {
        console.error('Erro ao init DB no Supabase', err);
    }
}

initializeDatabase();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const commentRoutes = require('./routes/commentRoutes');
const attachmentRoutes = require('./routes/attachmentRoutes');
const historyRoutes = require('./routes/historyRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const templateRoutes = require('./routes/templateRoutes');
const columnNoteRoutes = require('./routes/columnNoteRoutes');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Expor a pasta uploads publicamente para downloads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/services', serviceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/tasks', commentRoutes);
app.use('/api/tasks', attachmentRoutes);
app.use('/api/tasks', historyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/column-notes', columnNoteRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(port, () => {
  console.log(`Backend server rodando na porta ${port}`);
});

// reload