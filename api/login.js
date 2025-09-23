// Vercel Serverless Function - Login
const { initializeDatabase, loginUser } = require('./auth');

module.exports = async (req, res) => {
    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
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

        const user = await loginUser(email, password);
        
        res.status(200).json({
            success: true,
            user: user
        });
    } catch (error) {
        console.error('Erro no login:', error);
        
        // Tratar erros específicos
        if (error.message === 'Usuário não encontrado' || error.message === 'Senha incorreta') {
            res.status(401).json({ 
                success: false, 
                error: error.message 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Erro interno do servidor' 
            });
        }
    }
}