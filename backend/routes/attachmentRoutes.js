const express = require('express');
const pool = require('../utils/database');
const { authenticateToken } = require('../middleware/authMiddleware');
const { logTaskHistory } = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Garantir que a pasta de uploads exista
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração refinada do Multer para Storage Local
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir); 
    },
    filename: function (req, file, cb) {
      // Cria um nome único com timestamp e um número ramdom para previnir colisão
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      // Remove espaços originais e adiciona a extensão original
      const cleanFileName = file.originalname.trim().replace(/\s+/g, '-');
      cb(null, uniqueSuffix + '-' + cleanFileName);
    }
});

// Limite de 20MB para suportar vídeos pequenos e grandes PDFs
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 } 
});

// Protege todas as rotas com JWT
router.use(authenticateToken);

// GET /api/tasks/:id/attachments - Listar anexos de uma tarefa
router.get('/:id/attachments', async (req, res) => {
  const { id } = req.params;
  try {
    const attachmentsQuery = await pool.query(`
      SELECT 
        ta.id, 
        ta.file_name,
        ta.file_url,
        ta.file_type, 
        ta.created_at, 
        u.name as user_name 
      FROM task_attachments ta
      JOIN users u ON ta.user_id = u.id
      WHERE ta.task_id = $1
      ORDER BY ta.created_at DESC
    `, [id]);
    
    res.json(attachmentsQuery.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar anexos.' });
  }
});

// POST /api/tasks/:id/attachments - Fazer Upload de um arquivo e salvar referência no SQL
router.post('/:id/attachments', upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id; 

  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  try {
    const fileUrl = `/uploads/${req.file.filename}`;
    const fileName = req.file.originalname;
    const fileType = req.file.mimetype;

    const newAttachment = await pool.query(`
      INSERT INTO task_attachments (task_id, user_id, file_name, file_url, file_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, userId, fileName, fileUrl, fileType]);

    // Buscar o nome de usuário para retornar completo ao frontend imediatamente
    const userQuery = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    const userName = userQuery.rows[0].name;

    // Grava como Evento na Timeline
    await logTaskHistory(
      id,
      userId,
      'ATTACH',
      `Anexou um novo arquivo: ${fileName}`
    );

    res.status(201).json({
      ...newAttachment.rows[0],
      user_name: userName
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar anexo no banco.' });
  }
});

module.exports = router;
