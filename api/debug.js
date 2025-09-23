const { Pool } = require('pg');

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

module.exports = async (req, res) => {
    // Configurar headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Tratar requisições preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const debug = {
            databaseEnabled,
            hasPool: !!pool,
            envVars: {
                hasPostgresUrl: !!process.env.POSTGRES_URL,
                hasDatabaseUrl: !!process.env.DATABASE_URL,
                nodeEnv: process.env.NODE_ENV
            }
        };

        if (databaseEnabled && pool) {
            try {
                // Testar conexão
                const result = await pool.query('SELECT NOW() as current_time');
                debug.connectionTest = {
                    success: true,
                    currentTime: result.rows[0].current_time
                };

                // Verificar se tabela usuarios existe
                const tableCheck = await pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'usuarios'
                    );
                `);
                debug.tableExists = tableCheck.rows[0].exists;

                // Contar usuários
                if (debug.tableExists) {
                    const userCount = await pool.query('SELECT COUNT(*) as count FROM usuarios');
                    debug.userCount = userCount.rows[0].count;
                }

            } catch (dbError) {
                debug.connectionTest = {
                    success: false,
                    error: dbError.message
                };
            }
        }

        res.json({
            success: true,
            debug
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
};