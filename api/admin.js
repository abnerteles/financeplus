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

    try {
        // Parse manual do JSON para compatibilidade com Vercel
        let body = req.body;
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        // Para GET, pegar adminEmail do header, para outros métodos do body
        let adminEmail, action, userId, subscriptionType, subscriptionStatus;
        
        if (req.method === 'GET') {
            adminEmail = req.headers['admin-email'];
            action = 'list_users';
        } else {
            ({ action, userId, subscriptionType, subscriptionStatus, adminEmail } = body);
        }

        // Verificar se o usuário é admin
        const adminCheck = await pool.query(
            'SELECT role FROM usuarios WHERE email = $1',
            [adminEmail]
        );

        if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: 'Acesso negado. Apenas administradores podem gerenciar subscriptions.' 
            });
        }

        switch (action) {
            case 'list_users':
                const users = await pool.query(
                    'SELECT id, nome, email, role, subscription_type, subscription_status, created_at FROM usuarios ORDER BY created_at DESC'
                );
                return res.status(200).json({
                    success: true,
                    users: users.rows
                });

            case 'update_subscription':
                if (!userId || !subscriptionType || !subscriptionStatus) {
                    return res.status(400).json({
                        success: false,
                        error: 'userId, subscriptionType e subscriptionStatus são obrigatórios'
                    });
                }

                const updateResult = await pool.query(
                    'UPDATE usuarios SET subscription_type = $1, subscription_status = $2, updated_at = NOW() WHERE id = $3 RETURNING id, nome, email, subscription_type, subscription_status',
                    [subscriptionType, subscriptionStatus, userId]
                );

                if (updateResult.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Usuário não encontrado'
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: 'Subscription atualizada com sucesso',
                    user: updateResult.rows[0]
                });

            case 'delete_user':
                if (!userId) {
                    return res.status(400).json({
                        success: false,
                        error: 'userId é obrigatório'
                    });
                }

                const deleteResult = await pool.query(
                    'DELETE FROM usuarios WHERE id = $1 AND role != $2 RETURNING email',
                    [userId, 'admin']
                );

                if (deleteResult.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Usuário não encontrado ou não pode ser deletado (admin)'
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: 'Usuário deletado com sucesso'
                });

            default:
                return res.status(400).json({
                    success: false,
                    error: 'Ação não reconhecida. Use: list_users, update_subscription, delete_user'
                });
        }

    } catch (error) {
        console.error('Erro na administração:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno do servidor',
            details: error.message 
        });
    }
};