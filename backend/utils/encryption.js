const crypto = require('crypto');

// O algoritmo de criptografia
const algorithm = 'aes-256-cbc';

// Chave secreta deve ter 32 bytes. No .env deve estar VITE_VAULT_KEY
const secretKey = process.env.VITE_VAULT_KEY || 'nextfy-super-secret-vault-key-256'; // Fallback apenas para dev, ideal usar .env
const iv = crypto.randomBytes(16);

/**
 * Criptografa um texto
 * @param {string} text 
 * @returns {string} formato iv:encrypted
 */
function encrypt(text) {
    if (!text) return '';
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey.padEnd(32).substring(0, 32)), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Descriptografa um texto
 * @param {string} text formato iv:encrypted
 * @returns {string} texto original
 */
function decrypt(text) {
    if (!text || !text.includes(':')) return text;
    try {
        const textParts = text.split(':');
        const ivPart = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey.padEnd(32).substring(0, 32)), ivPart);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (err) {
        console.error('Erro na descriptografia:', err.message);
        return '********'; // Retorna mascarado em caso de falha catastrófica
    }
}

module.exports = { encrypt, decrypt };
