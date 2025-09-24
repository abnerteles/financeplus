// API para migrar dados da tabela users para usuarios
const { Pool } = require('pg');

let pool = null;
if (process.env.POSTGRES_URL || process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
}

export default async function handler(req, res) {
    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!pool) {
        return res.status(500).json({ 
            success: false, 
            error: 'Banco de dados não configurado' 
        });
    }

    try {
        // Verificar quantos usuários existem em cada tabela
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        const usuariosCount = await pool.query('SELECT COUNT(*) FROM usuarios');

        // Migrar dados da tabela users para usuarios
        const migrationResult = await pool.query(`
            INSERT INTO usuarios (nome, email, senha, role, subscription_type, subscription_status, created_at, updated_at)
            SELECT name, email, password_hash, 'user', 
                   COALESCE(subscription_type, 'free'), 
                   CASE WHEN subscription_active THEN 'active' ELSE 'inactive' END,
                   COALESCE(created_at, NOW()), 
                   COALESCE(updated_at, NOW())
            FROM users 
            WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuarios.email = users.email)
            RETURNING id, nome, email
        `);

        // Verificar novamente após migração
        const newUsuariosCount = await pool.query('SELECT COUNT(*) FROM usuarios');

        res.status(200).json({
            success: true,
            message: 'Migração concluída',
            data: {
                users_table_count: parseInt(usersCount.rows[0].count),
                usuarios_table_before: parseInt(usuariosCount.rows[0].count),
                usuarios_table_after: parseInt(newUsuariosCount.rows[0].count),
                migrated_users: migrationResult.rows.length,
                migrated_data: migrationResult.rows
            }
        });

    } catch (error) {
        console.error('Erro na migração:', error);
        res.status(500).json({
            success: false,
            error: 'Erro na migração',
            details: error.message
        });
    }
}