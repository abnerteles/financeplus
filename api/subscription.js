// Vercel Serverless Function - Subscription Management
const { initializeDatabase, checkSubscription, updateSubscription } = require('./auth');

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Inicializar banco (será executado a cada chamada)
        await initializeDatabase();

        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'ID do usuário é obrigatório' 
            });
        }

        if (req.method === 'GET') {
            // Verificar assinatura
            const result = await checkSubscription(userId);
            
            if (result.success) {
                res.status(200).json(result);
            } else {
                res.status(404).json(result);
            }
        } else if (req.method === 'PUT') {
            // Atualizar assinatura
            const { subscriptionType, subscriptionActive } = req.body;
            
            if (!subscriptionType) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Tipo de assinatura é obrigatório' 
                });
            }

            const result = await updateSubscription(userId, subscriptionType, subscriptionActive);
            
            if (result.success) {
                res.status(200).json(result);
            } else {
                res.status(400).json(result);
            }
        } else {
            return res.status(405).json({ 
                success: false, 
                error: 'Método não permitido' 
            });
        }
    } catch (error) {
        console.error('Erro na assinatura:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno do servidor' 
        });
    }
}