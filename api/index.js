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

    try {
        const user = await loginUser(email, password);
        res.json({
            success: true,
            user: user
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            error: error.message
        });
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

// Endpoint de// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Server is working',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Debug endpoint
app.get('/api/debug', async (req, res) => {
    try {
        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const fs = require('fs');
        
        const dbPath = path.join(__dirname, 'database.db');
        const db = new sqlite3.Database(dbPath);
        
        const debug = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            database: {
                path: dbPath,
                exists: fs.existsSync(dbPath)
            },
            tables: {},
            users: []
        };
        
        // Verificar tabelas
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
            if (err) {
                debug.tables.error = err.message;
            } else {
                debug.tables.list = tables.map(t => t.name);
            }
            
            // Verificar usuários
            db.all("SELECT id, name, email, subscription FROM usuarios", (err, users) => {
                if (err) {
                    debug.users.error = err.message;
                } else {
                    debug.users.count = users.length;
                    debug.users.list = users;
                }
                
                db.close();
                res.json(debug);
            });
        });
        
    } catch (error) {
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;