// Vercel Serverless Function - Register
const { initializeDatabase, registerUser } = require('./auth');

export default async function handler(req, res) {
    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
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

        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Nome, email e senha são obrigatórios' 
            });
        }

        // Validação de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email inválido' 
            });
        }

        const user = await registerUser(name, email, password);
        
        res.status(201).json({
            success: true,
            user: user
        });
    } catch (error) {
        console.error('Erro no registro:', error);
        
        // Tratar erros específicos
        if (error.message === 'Usuário já existe') {
            res.status(400).json({ 
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