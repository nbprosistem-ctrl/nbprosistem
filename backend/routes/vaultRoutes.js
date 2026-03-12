const express = require('express');
const pool = require('../utils/database');
const { authenticateToken } = require('../middleware/authMiddleware');
const { encrypt, decrypt } = require('../utils/encryption');

const router = express.Router();
router.use(authenticateToken);

// Middleware para verificar se é ADMIN
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
    }
    next();
};

// GET /api/vault - Listar senhas acessíveis
router.get('/', async (req, res) => {
    try {
        let query;
        let params;

        if (req.user.role === 'ADMIN') {
            // Admin vê tudo
            query = 'SELECT * FROM password_vault ORDER BY created_at DESC';
            params = [];
        } else {
            // Usuário comum vê apenas o que tem acesso
            query = `
                SELECT pv.* 
                FROM password_vault pv
                JOIN password_vault_access pva ON pv.id = pva.vault_id
                WHERE pva.user_id = $1
                ORDER BY pv.created_at DESC
            `;
            params = [req.user.id];
        }

        const result = await pool.query(query, params);
        
        // Retornamos mapeado para não expor a senha criptografada crua se não solicitado
        // ou descriptografamos logo se o requisito for simplificar. 
        // Vamos descriptografar aqui para o front receber pronto, já que o acesso já foi filtrado na query.
        const entries = result.rows.map(row => ({
            ...row,
            password: decrypt(row.password) // O front lida com o "ocultar" por segurança visual
        }));

        res.json(entries);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar no cofre de senhas.' });
    }
});

// POST /api/vault - Criar entrada (Admin)
router.post('/', isAdmin, async (req, res) => {
    const { title, login, password, url, description, accessUserIds } = req.body;

    if (!title || !login || !password) {
        return res.status(400).json({ error: 'Título, login e senha são obrigatórios.' });
    }

    try {
        const encryptedPassword = encrypt(password);
        const result = await pool.query(
            `INSERT INTO password_vault (title, login, password, url, description) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [title, login, encryptedPassword, url, description]
        );
        const newEntry = result.rows[0];

        // Se informou usuários para acesso, insere na tabela de permissões
        if (accessUserIds && Array.isArray(accessUserIds)) {
            for (const userId of accessUserIds) {
                await pool.query(
                    'INSERT INTO password_vault_access (vault_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [newEntry.id, userId]
                );
            }
        }

        res.status(201).json({ ...newEntry, password: decrypt(newEntry.password) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar entrada no cofre.' });
    }
});

// PUT /api/vault/:id - Editar entrada (Admin)
router.put('/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, login, password, url, description, accessUserIds } = req.body;

    try {
        let updateQuery = 'UPDATE password_vault SET title=$1, login=$2, url=$3, description=$4, updated_at=CURRENT_TIMESTAMP';
        let params = [title, login, url, description];

        if (password) {
            updateQuery += ', password=$5 WHERE id=$6 RETURNING *';
            params.push(encrypt(password), id);
        } else {
            updateQuery += ' WHERE id=$5 RETURNING *';
            params.push(id);
        }

        const result = await pool.query(updateQuery, params);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Entrada não encontrada.' });

        const updated = result.rows[0];

        // Atualizar acessos (Admin limpa e refaz para simplificar)
        if (accessUserIds && Array.isArray(accessUserIds)) {
            await pool.query('DELETE FROM password_vault_access WHERE vault_id = $1', [id]);
            for (const userId of accessUserIds) {
                await pool.query(
                    'INSERT INTO password_vault_access (vault_id, user_id) VALUES ($1, $2)',
                    [id, userId]
                );
            }
        }

        res.json({ ...updated, password: decrypt(updated.password) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao editar entrada.' });
    }
});

// DELETE /api/vault/:id - Deletar (Admin)
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM password_vault WHERE id = $1', [req.params.id]);
        res.json({ message: 'Entrada removida com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao deletar entrada.' });
    }
});

// GET /api/vault/:id/access - Listar quem tem acesso (Admin)
router.get('/:id/access', isAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.name, u.email 
            FROM users u
            JOIN password_vault_access pva ON u.id = pva.user_id
            WHERE pva.vault_id = $1
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar acessos.' });
    }
});

module.exports = router;
