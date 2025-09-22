// Vercel Serverless Function - Login
const { initializeDatabase, loginUser } = require('./auth');

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Método não permitido' 
        });
    }

    try {
        // Inicializar banco (será executado a cada chamada)
        await initializeDatabase();

        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email e senha são obrigatórios' 
            });
        }

        const result = await loginUser(email, password);
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(401).json(result);
        }
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno do servidor' 
        });
    }
}