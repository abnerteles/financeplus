// API de Autenticação com Neon Database
// Mantém localStorage para dados financeiros, usa banco apenas para usuários e subscription

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configuração do banco Neon
let pool = null;
let databaseEnabled = false;

if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    databaseEnabled = true;
}

// Cache para evitar múltiplas inicializações em serverless
let isInitialized = false;

// Inicializar tabela de usuários
async function initializeDatabase() {
    if (!databaseEnabled) {
        console.log('Banco de dados não configurado - usando apenas localStorage');
        return;
    }
    
    // Evitar múltiplas inicializações em serverless
    if (isInitialized) {
        return;
    }
    
    try {
        // Criar tabela usuarios com campos atualizados
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255),
                email VARCHAR(255) UNIQUE NOT NULL,
                senha VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                subscription_type VARCHAR(50) DEFAULT 'free',
                subscription_status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Migrar dados da tabela antiga se existir
        try {
            await pool.query(`
                INSERT INTO usuarios (nome, email, senha, role, subscription_type, subscription_status, created_at, updated_at)
                SELECT name, email, password_hash, 'user', subscription_type, 
                       CASE WHEN subscription_active THEN 'active' ELSE 'inactive' END,
                       created_at, updated_at
                FROM users 
                WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuarios.email = users.email)
            `);
        } catch (migrationError) {
            // Tabela users pode não existir, ignorar erro
        }
        isInitialized = true;
        console.log('Banco de dados inicializado com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar banco:', error);
        databaseEnabled = false;
    }
}

// Função para hash de senha usando bcrypt
function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

// Registrar usuário
async function registerUser(name, email, password) {
    if (!databaseEnabled) {
        throw new Error('Banco de dados não disponível');
    }
    
    try {
        // Verificar se usuário já existe
        const existingUser = await pool.query(
            'SELECT id FROM usuarios WHERE email = $1',
            [email]
        );
        
        if (existingUser.rows.length > 0) {
            throw new Error('Usuário já existe');
        }
        
        // Criar novo usuário
        const hashedPassword = hashPassword(password);
        const result = await pool.query(
            'INSERT INTO usuarios (nome, email, senha, role) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, role, subscription_type, subscription_status',
            [name, email, hashedPassword, 'user']
        );
        
        const user = result.rows[0];
        return {
            id: user.id,
            name: user.nome,
            email: user.email,
            role: user.role,
            subscription: {
                type: user.subscription_type,
                status: user.subscription_status
            }
        };
    } catch (error) {
        console.error('Erro no registro:', error);
        throw error;
    }
}

// Login de usuário
async function loginUser(email, password) {
    if (!databaseEnabled) {
        throw new Error('Banco de dados não disponível');
    }
    
    try {
        // Buscar usuário
        const result = await pool.query(
            'SELECT id, nome, email, senha, subscription_type, subscription_status FROM usuarios WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            throw new Error('Usuário não encontrado');
        }
        
        const user = result.rows[0];
        
        // Verificar senha
        if (!verifyPassword(password, user.senha)) {
            throw new Error('Senha incorreta');
        }
        
        // Retornar dados do usuário (sem a senha)
        return {
            id: user.id,
            name: user.nome,
            email: user.email,
            subscription: {
                type: user.subscription_type,
                status: user.subscription_status
            }
        };
    } catch (error) {
        console.error('Erro no login:', error);
        throw error;
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