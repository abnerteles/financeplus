// Vercel Serverless Function - Health Check
export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Método não permitido' 
        });
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