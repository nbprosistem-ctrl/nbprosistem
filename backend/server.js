const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Força o resolvedor de DNS a priorizar conexões IPv4 sobre IPv6 (evita erro ENETUNREACH no Render.com)
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

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

            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50);
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_days VARCHAR(50);
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_time TIME;
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_start_date DATE;
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_end_type VARCHAR(50);
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_occurrences INTEGER;
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS review_status VARCHAR(50) DEFAULT 'PENDING';
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL;
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS review_timestamp TIMESTAMP;

            CREATE TABLE IF NOT EXISTS password_vault (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title VARCHAR(255) NOT NULL,
                login VARCHAR(255) NOT NULL,
                password TEXT NOT NULL,
                url VARCHAR(500),
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS password_vault_access (
                id SERIAL PRIMARY KEY,
                vault_id UUID REFERENCES password_vault(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(vault_id, user_id)
            );

            ALTER TABLE password_vault ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
        `);
        console.log('Tabelas de BD verificadas e garantidas (Supabase).');
        // O admin padrão não é mais inserido localmente de forma hardcoded (autenticação via Supabase)

        // Garantir coluna is_blocked e remover obrigatoriedade de password_hash para autenticação externa
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false`);
        await pool.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`);

        // Ajustar restrições para não deletar dados históricos ao excluir usuário
        // Tentamos remover CASCADE e colocar SET NULL para comentários, histórico e anexos
        const tablesToAdjust = [
            { table: 'task_comments', column: 'user_id' },
            { table: 'task_attachments', column: 'user_id' },
            { table: 'task_history', column: 'user_id' }
        ];

        for (const item of tablesToAdjust) {
            try {
                // Tenta dropar a fkey padrão (Supabase costuma seguir esse padrão)
                const fkeyName = `${item.table}_${item.column}_fkey`;
                await pool.query(`ALTER TABLE ${item.table} DROP CONSTRAINT IF EXISTS ${fkeyName}`);
                await pool.query(`ALTER TABLE ${item.table} ADD CONSTRAINT ${fkeyName} FOREIGN KEY (${item.column}) REFERENCES users(id) ON DELETE SET NULL`);
            } catch (e) {
                console.warn(`Aviso ao ajustar constraint em ${item.table}:`, e.message);
            }
        }
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
const vaultRoutes = require('./routes/vaultRoutes');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const port = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"]
  }
});

// Middleware injetar o `io` em todas as req para que as Rotas possam disparar eventos WebSockets
app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on('connection', (socket) => {
  socket.on('join_user_room', (userId) => {
    if (userId) {
      socket.join(userId);
    }
  });
});

app.use(cors());
app.use(express.json());

// Inicialização do Supabase Client para Autenticação
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

// Rota raiz para teste
app.get('/', (req, res) => {
  res.send("API nbprosistem rodando");
});

// Endpoint de login direto via Supabase Auth + Sincronização e Carga de Dados Locais do PostgreSQL
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // 1. Autenticar no Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    const authUser = data.user;

    // 2. Buscar informações adicionais no banco PostgreSQL local
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [authUser.id]);
    let userDetails = userResult.rows[0];

    // 3. Se o usuário não existe no PostgreSQL local, sincronizamos ele de forma dinâmica
    if (!userDetails) {
      const name = authUser.user_metadata?.name || authUser.email.split('@')[0];
      const role = authUser.user_metadata?.role || 'COLABORADOR';
      const status = authUser.user_metadata?.status || 'APPROVED';
      
      const insertRes = await pool.query(
        'INSERT INTO users (id, name, email, role, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET id = $1, role = $4, status = $5 RETURNING *',
        [authUser.id, name, authUser.email, role, status]
      );
      userDetails = insertRes.rows[0];
    }

    // 4. Verificar se o usuário está bloqueado localmente
    if (userDetails.is_blocked) {
      return res.status(403).json({ error: 'Sua conta foi bloqueada. Por favor, entre em contato com o administrador.' });
    }

    // 5. Retornar token e payload compatível com o controle de acesso do frontend (roles/permissions)
    return res.json({
      token: data.session.access_token,
      user: {
        id: userDetails.id,
        email: userDetails.email,
        role: userDetails.role,
        status: userDetails.status,
        name: userDetails.name
      }
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return res.status(500).json({ 
      error: 'Erro interno no servidor ao tentar realizar o login',
      message: err.message,
      stack: err.stack 
    });
  }
});

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
app.use('/api/vault', vaultRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const { createNotification } = require('./utils/notifier');

server.listen(port, () => {
  console.log(`Backend server rodando na porta ${port} com Socket.IO`);

  // Job de Verificação de Tarefas Vencendo em 24h (Roda a cada 1 hora)
  setInterval(async () => {
    try {
      const query = `
        SELECT t.id, t.owner_id, t.title 
        FROM tasks t
        WHERE t.due_date IS NOT NULL 
          AND t.status_column != 'DONE' 
          AND t.owner_id IS NOT NULL
          AND t.due_date <= CURRENT_TIMESTAMP + INTERVAL '24 hours'
          AND NOT EXISTS (
            SELECT 1 FROM notifications n 
            WHERE n.task_id = t.id AND n.type = 'task_due_soon'
          )
      `;
      const resTasks = await pool.query(query);
      for (let t of resTasks.rows) {
        await createNotification(
          t.owner_id,
          'Prazo Esgotando',
          `A tarefa "${t.title}" vence em menos de 24 horas!`,
          'task_due_soon',
          t.id,
          io
        );
      }
    } catch(e) {
      console.error('Erro no CronJob de Due Date:', e.message);
    }
  }, 3600000); // 1 hora
});

// reload