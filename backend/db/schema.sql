CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'COLABORADOR' CHECK (role IN ('ADMIN', 'COLABORADOR')),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserindo um admin padrão se não houver registros. A senha é "admin123" criptografada como hash (bcrypt).
-- Este hash foi gerado com bcrypt (salt rounds 10) para a string 'admin123'.
INSERT INTO users (name, email, password_hash, role, status)
SELECT 'Administrador', 'admin@marketing.com', '$2b$10$MFy1bNedYeZY6m1PsUdMtOkLdWAdwFkOArOK7.rpUW96oY9RnJhbi', 'ADMIN', 'APPROVED'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@marketing.com');
