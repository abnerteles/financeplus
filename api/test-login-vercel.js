// Teste específico para verificar login na Vercel
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
        return res.status(405).json({ 
            error: 'Método não permitido',
            method: req.method,
            body: req.body,
            headers: req.headers
        });
    }

    try {
        console.log('🔍 Teste Login Vercel - Iniciando...');
        console.log('📦 Body recebido:', req.body);
        console.log('📋 Headers:', req.headers);
        
        // Inicializar banco
        await initializeDatabase();
        console.log('✅ Banco inicializado');

        const { email, password } = req.body;
        
        console.log('📧 Email:', email);
        console.log('🔑 Password presente:', !!password);
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email e senha são obrigatórios',
                received: { email: !!email, password: !!password }
            });
        }

        const user = await loginUser(email, password);
        console.log('👤 Usuário encontrado:', user);
        
        res.status(200).json({
            success: true,
            user: user,
            debug: {
                email_received: email,
                password_received: !!password,
                user_structure: Object.keys(user)
            }
        });
    } catch (error) {
        console.error('❌ Erro no login:', error);
        
        res.status(500).json({ 
            success: false, 
            error: error.message,
            debug: {
                error_type: error.constructor.name,
                stack: error.stack
            }
        });
    }
}