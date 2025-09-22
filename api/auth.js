// API de Autenticação com Neon Database
// Mantém localStorage para dados financeiros, usa banco apenas para usuários e subscription

const { Pool } = require('pg');

// Configuração do banco Neon
let pool = null;
let databaseEnabled = false;

if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    databaseEnabled = true;
}

// Inicializar tabela de usuários
async function initializeDatabase() {
    if (!databaseEnabled) {
        console.log('Banco de dados não configurado - usando apenas localStorage');
        return;
    }
    
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                subscription_type VARCHAR(50) DEFAULT 'free',
                subscription_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Banco de dados inicializado com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar banco:', error);
        databaseEnabled = false;
    }
}

// Função para hash de senha (simples para este exemplo)
function hashPassword(password) {
    // Em produção, use bcrypt ou similar
    return Buffer.from(password).toString('base64');
}

function verifyPassword(password, hash) {
    return hashPassword(password) === hash;
}

// Registrar usuário
async function registerUser(name, email, password) {
    if (!databaseEnabled) {
        return { success: false, error: 'Banco de dados não configurado' };
    }
    
    try {
        // Verificar se email já existe
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return { success: false, error: 'Email já cadastrado' };
        }

        // Criar usuário
        const passwordHash = hashPassword(password);
        const result = await pool.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, subscription_type',
            [name, email, passwordHash]
        );

        return { 
            success: true, 
            user: result.rows[0] 
        };
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        return { success: false, error: 'Erro interno do servidor' };
    }
}

// Login de usuário
async function loginUser(email, password) {
    if (!databaseEnabled) {
        return { success: false, error: 'Banco de dados não configurado' };
    }
    
    try {
        const result = await pool.query(
            'SELECT id, name, email, password_hash, subscription_type, subscription_expires_at FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'Usuário não encontrado' };
        }

        const user = result.rows[0];
        
        if (!verifyPassword(password, user.password_hash)) {
            return { success: false, error: 'Senha incorreta' };
        }

        // Verificar se subscription ainda é válida
        const now = new Date();
        const isSubscriptionValid = user.subscription_expires_at && new Date(user.subscription_expires_at) > now;

        return {
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                subscription_type: user.subscription_type,
                subscription_active: isSubscriptionValid || user.subscription_type === 'free'
            }
        };
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return { success: false, error: 'Erro interno do servidor' };
    }
}

// Atualizar subscription
async function updateSubscription(userId, subscriptionType, expiresAt = null) {
    try {
        await pool.query(
            'UPDATE users SET subscription_type = $1, subscription_expires_at = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [subscriptionType, expiresAt, userId]
        );
        return { success: true };
    } catch (error) {
        console.error('Erro ao atualizar subscription:', error);
        return { success: false, error: 'Erro interno do servidor' };
    }
}

// Verificar subscription
async function checkSubscription(userId) {
    try {
        const result = await pool.query(
            'SELECT subscription_type, subscription_expires_at FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'Usuário não encontrado' };
        }

        const user = result.rows[0];
        const now = new Date();
        const isSubscriptionValid = user.subscription_expires_at && new Date(user.subscription_expires_at) > now;

        return {
            success: true,
            subscription: {
                type: user.subscription_type,
                active: isSubscriptionValid || user.subscription_type === 'free',
                expires_at: user.subscription_expires_at
            }
        };
    } catch (error) {
        console.error('Erro ao verificar subscription:', error);
        return { success: false, error: 'Erro interno do servidor' };
    }
}

module.exports = {
    initializeDatabase,
    registerUser,
    loginUser,
    updateSubscription,
    checkSubscription
};