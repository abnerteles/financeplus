// Vercel Serverless Function - Health Check
module.exports = async (req, res) => {
    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        res.status(200).json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            environment: 'vercel-serverless'
        });
    } catch (error) {
        console.error('Erro no health check:', error);
        res.status(500).json({ 
            status: 'ERROR', 
            error: 'Erro interno do servidor' 
        });
    }
}