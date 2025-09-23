const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configuração temporária do banco Neon com string hardcoded
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_zqtSeXWc73YP@ep-bold-bird-ac0xf3tg-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = async (req, res) => {
    // Configurar headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Tratar requisições preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const adminEmail = 'admin@financeplus.com';
        
        // Deletar usuário admin existente se houver
        const deleteQuery = 'DELETE FROM users WHERE email = $1';
        await pool.query(deleteQuery, [adminEmail]);

        // Criar usuário admin
        const adminPassword = 'Admin123!';
        const hashedPassword = bcrypt.hashSync(adminPassword, 10);

        const insertQuery = `
            INSERT INTO users (name, email, password_hash, subscription_type, subscription_active, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            RETURNING id, name, email, subscription_type
        `;

        const result = await pool.query(insertQuery, [
            'Administrador',
            adminEmail,
            hashedPassword,
            'premium',
            true // subscription_active
        ]);

        const newAdmin = result.rows[0];

        res.status(201).json({
            success: true,
            message: 'Usuário admin recriado com sucesso',
            admin: {
                id: newAdmin.id,
                name: newAdmin.name,
                email: newAdmin.email,
                subscription: newAdmin.subscription_type
            },
            credentials: {
                email: adminEmail,
                password: adminPassword
            }
        });

    } catch (error) {
        console.error('Erro ao recriar admin:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};