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
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email e senha são obrigatórios' 
            });
        }

        // Buscar usuário
        const result = await pool.query(
            'SELECT id, name, email, password_hash, subscription_type, subscription_active FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Usuário não encontrado'
            });
        }
        
        const user = result.rows[0];
        
        // Verificar senha
        const isValidPassword = bcrypt.compareSync(password, user.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Senha incorreta'
            });
        }
        
        // Retornar dados do usuário (sem a senha)
        res.status(200).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                subscription: {
                    type: user.subscription_type,
                    active: user.subscription_active
                }
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};