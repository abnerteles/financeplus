const { Pool } = require('pg');

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

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verificar estrutura da tabela users
        const tableStructureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position;
        `;
        
        const tableStructure = await pool.query(tableStructureQuery);

        // Verificar se a tabela existe
        const tableExistsQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'users'
            );
        `;
        
        const tableExists = await pool.query(tableExistsQuery);

        // Listar todas as tabelas
        const allTablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `;
        
        const allTables = await pool.query(allTablesQuery);

        res.status(200).json({
            success: true,
            tableExists: tableExists.rows[0].exists,
            tableStructure: tableStructure.rows,
            allTables: allTables.rows.map(row => row.table_name)
        });

    } catch (error) {
        console.error('Erro ao verificar tabela:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
};