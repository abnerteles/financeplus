const { Pool } = require('pg');

// Configuração do banco Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
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
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        // Verificar se já existe um admin
        const checkAdmin = await pool.query(
            'SELECT id FROM usuarios WHERE email = $1',
            ['admin@financeplus.com']
        );

        if (checkAdmin.rows.length > 0) {
            return res.status(200).json({ 
                success: true, 
                message: 'Usuário admin já existe',
                admin: {
                    email: 'admin@financeplus.com',
                    role: 'admin'
                }
            });
        }

        // Criar usuário admin
        const adminPassword = 'Admin@123456';
        const hashedPassword = Buffer.from(adminPassword).toString('base64');

        const result = await pool.query(
            `INSERT INTO usuarios (email, senha, role, subscription_type, subscription_status, created_at) 
             VALUES ($1, $2, $3, $4, $5, NOW()) 
             RETURNING id, email, role, subscription_type, subscription_status`,
            ['admin@financeplus.com', hashedPassword, 'admin', 'premium', 'active']
        );

        const admin = result.rows[0];

        res.status(201).json({
            success: true,
            message: 'Usuário admin criado com sucesso',
            admin: {
                id: admin.id,
                email: admin.email,
                role: admin.role,
                subscription_type: admin.subscription_type,
                subscription_status: admin.subscription_status
            },
            credentials: {
                email: 'admin@financeplus.com',
                password: adminPassword
            }
        });

    } catch (error) {
        console.error('Erro ao criar admin:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno do servidor',
            details: error.message 
        });
    }
};