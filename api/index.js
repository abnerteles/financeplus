// API Routes para FinancePlus
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase, registerUser, loginUser, updateSubscription, checkSubscription } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Inicializar banco na inicialização
initializeDatabase();

// Servir arquivo principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Endpoint de registro
app.post('/api/register', async (req, res) => {
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

    const result = await registerUser(name, email, password);
    
    if (result.success) {
        res.status(201).json(result);
    } else {
        res.status(400).json(result);
    }
});

// Endpoint de login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            error: 'Email e senha são obrigatórios' 
        });
    }

    const result = await loginUser(email, password);
    
    if (result.success) {
        res.json(result);
    } else {
        res.status(401).json(result);
    }
});

// Endpoint para verificar subscription
app.get('/api/subscription/:userId', async (req, res) => {
    const { userId } = req.params;
    
    const result = await checkSubscription(userId);
    
    if (result.success) {
        res.json(result);
    } else {
        res.status(404).json(result);
    }
});

// Endpoint para atualizar subscription
app.put('/api/subscription/:userId', async (req, res) => {
    const { userId } = req.params;
    const { subscriptionType, expiresAt } = req.body;
    
    const result = await updateSubscription(userId, subscriptionType, expiresAt);
    
    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json(result);
    }
});

// Endpoint de health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;