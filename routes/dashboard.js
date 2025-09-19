const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { authenticate, checkFeatureAccess, checkUsageLimit } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação a todas as rotas
router.use(authenticate);

// @route   GET /api/dashboard/stats
// @desc    Obter estatísticas do dashboard
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const user = req.user;
    const subscription = await Subscription.findOne({ user: user._id });

    // Simular dados financeiros (em produção, viria do banco de dados)
    const mockData = {
      totalBalance: 15750.50,
      monthlyIncome: 8500.00,
      monthlyExpenses: 3200.75,
      savingsGoal: 50000.00,
      currentSavings: 15750.50,
      accounts: [
        { name: 'Conta Corrente', balance: 5250.30, type: 'checking' },
        { name: 'Poupança', balance: 8500.20, type: 'savings' },
        { name: 'Investimentos', balance: 2000.00, type: 'investment' }
      ],
      recentTransactions: [
        { id: 1, description: 'Salário', amount: 8500.00, type: 'income', date: new Date(), category: 'Trabalho' },
        { id: 2, description: 'Supermercado', amount: -250.75, type: 'expense', date: new Date(), category: 'Alimentação' },
        { id: 3, description: 'Freelance', amount: 1200.00, type: 'income', date: new Date(), category: 'Trabalho' },
        { id: 4, description: 'Combustível', amount: -180.00, type: 'expense', date: new Date(), category: 'Transporte' },
        { id: 5, description: 'Academia', amount: -89.90, type: 'expense', date: new Date(), category: 'Saúde' }
      ],
      categories: [
        { name: 'Alimentação', spent: 850.50, budget: 1200.00, color: '#FF6B6B' },
        { name: 'Transporte', spent: 420.30, budget: 600.00, color: '#4ECDC4' },
        { name: 'Saúde', spent: 289.90, budget: 400.00, color: '#45B7D1' },
        { name: 'Lazer', spent: 180.00, budget: 300.00, color: '#96CEB4' },
        { name: 'Educação', spent: 120.00, budget: 200.00, color: '#FFEAA7' }
      ],
      monthlyTrend: [
        { month: 'Jan', income: 8200, expenses: 3100 },
        { month: 'Fev', income: 8500, expenses: 3250 },
        { month: 'Mar', income: 8300, expenses: 3180 },
        { month: 'Abr', income: 8600, expenses: 3300 },
        { month: 'Mai', income: 8500, expenses: 3200 }
      ]
    };

    // Aplicar limitações baseadas no plano
    const limits = user.limits;
    
    // Limitar número de contas mostradas
    if (limits.accounts > 0) {
      mockData.accounts = mockData.accounts.slice(0, limits.accounts);
    }

    // Limitar número de transações mostradas
    if (limits.transactions > 0) {
      mockData.recentTransactions = mockData.recentTransactions.slice(0, Math.min(5, limits.transactions));
    }

    // Limitar número de categorias mostradas
    if (limits.categories > 0) {
      mockData.categories = mockData.categories.slice(0, limits.categories);
    }

    // Adicionar informações do plano
    const planInfo = {
      currentPlan: subscription?.plan || 'free',
      limits: limits,
      features: {
        reports: limits.reports,
        exports: limits.exports,
        apiAccess: limits.apiAccess
      },
      usage: {
        accounts: mockData.accounts.length,
        transactions: mockData.recentTransactions.length,
        categories: mockData.categories.length
      }
    };

    res.json({
      success: true,
      data: {
        ...mockData,
        planInfo
      }
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/dashboard/accounts
// @desc    Obter contas do usuário
// @access  Private
router.get('/accounts', async (req, res) => {
  try {
    const user = req.user;
    
    // Simular dados de contas (em produção, viria do banco de dados)
    let accounts = [
      { 
        id: 1, 
        name: 'Conta Corrente Principal', 
        bank: 'Banco do Brasil', 
        type: 'checking', 
        balance: 5250.30,
        currency: 'BRL',
        createdAt: new Date('2024-01-15'),
        isActive: true
      },
      { 
        id: 2, 
        name: 'Poupança', 
        bank: 'Banco do Brasil', 
        type: 'savings', 
        balance: 8500.20,
        currency: 'BRL',
        createdAt: new Date('2024-01-20'),
        isActive: true
      },
      { 
        id: 3, 
        name: 'Conta Investimentos', 
        bank: 'XP Investimentos', 
        type: 'investment', 
        balance: 2000.00,
        currency: 'BRL',
        createdAt: new Date('2024-02-01'),
        isActive: true
      },
      { 
        id: 4, 
        name: 'Conta Dólar', 
        bank: 'Itaú', 
        type: 'checking', 
        balance: 1500.00,
        currency: 'USD',
        createdAt: new Date('2024-02-15'),
        isActive: true
      }
    ];

    // Aplicar limitação do plano
    if (user.limits.accounts > 0) {
      accounts = accounts.slice(0, user.limits.accounts);
    }

    res.json({
      success: true,
      data: { 
        accounts,
        totalAccounts: accounts.length,
        maxAccounts: user.limits.accounts === -1 ? 'Ilimitado' : user.limits.accounts
      }
    });

  } catch (error) {
    console.error('Erro ao obter contas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/dashboard/accounts
// @desc    Criar nova conta
// @access  Private
router.post('/accounts', [
  checkUsageLimit('accounts'),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Nome é obrigatório'),
  body('bank').trim().isLength({ min: 1, max: 100 }).withMessage('Banco é obrigatório'),
  body('type').isIn(['checking', 'savings', 'investment', 'credit']).withMessage('Tipo inválido'),
  body('balance').isFloat({ min: 0 }).withMessage('Saldo deve ser um número positivo'),
  body('currency').isIn(['BRL', 'USD', 'EUR']).withMessage('Moeda inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { name, bank, type, balance, currency = 'BRL' } = req.body;

    // Simular criação da conta (em produção, salvaria no banco)
    const newAccount = {
      id: Date.now(), // ID temporário
      name,
      bank,
      type,
      balance: parseFloat(balance),
      currency,
      createdAt: new Date(),
      isActive: true,
      userId: req.user._id
    };

    res.status(201).json({
      success: true,
      message: 'Conta criada com sucesso',
      data: { account: newAccount }
    });

  } catch (error) {
    console.error('Erro ao criar conta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/dashboard/transactions
// @desc    Obter transações do usuário
// @access  Private
router.get('/transactions', async (req, res) => {
  try {
    const { page = 1, limit = 10, type, category, startDate, endDate } = req.query;
    const user = req.user;

    // Simular dados de transações (em produção, viria do banco de dados)
    let transactions = [
      { id: 1, description: 'Salário', amount: 8500.00, type: 'income', date: new Date('2024-05-01'), category: 'Trabalho', account: 'Conta Corrente' },
      { id: 2, description: 'Supermercado Extra', amount: -250.75, type: 'expense', date: new Date('2024-05-02'), category: 'Alimentação', account: 'Conta Corrente' },
      { id: 3, description: 'Freelance Design', amount: 1200.00, type: 'income', date: new Date('2024-05-03'), category: 'Trabalho', account: 'Conta Corrente' },
      { id: 4, description: 'Posto Shell', amount: -180.00, type: 'expense', date: new Date('2024-05-04'), category: 'Transporte', account: 'Conta Corrente' },
      { id: 5, description: 'Academia Smart Fit', amount: -89.90, type: 'expense', date: new Date('2024-05-05'), category: 'Saúde', account: 'Conta Corrente' },
      { id: 6, description: 'Dividendos', amount: 150.30, type: 'income', date: new Date('2024-05-06'), category: 'Investimentos', account: 'Investimentos' },
      { id: 7, description: 'Netflix', amount: -32.90, type: 'expense', date: new Date('2024-05-07'), category: 'Lazer', account: 'Conta Corrente' },
      { id: 8, description: 'Uber', amount: -25.50, type: 'expense', date: new Date('2024-05-08'), category: 'Transporte', account: 'Conta Corrente' },
      { id: 9, description: 'Transferência Poupança', amount: -1000.00, type: 'transfer', date: new Date('2024-05-09'), category: 'Transferência', account: 'Conta Corrente' },
      { id: 10, description: 'Curso Udemy', amount: -89.90, type: 'expense', date: new Date('2024-05-10'), category: 'Educação', account: 'Conta Corrente' }
    ];

    // Aplicar filtros
    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }
    if (category) {
      transactions = transactions.filter(t => t.category.toLowerCase().includes(category.toLowerCase()));
    }
    if (startDate) {
      transactions = transactions.filter(t => new Date(t.date) >= new Date(startDate));
    }
    if (endDate) {
      transactions = transactions.filter(t => new Date(t.date) <= new Date(endDate));
    }

    // Aplicar limitação do plano
    const maxTransactions = user.limits.transactions;
    if (maxTransactions > 0 && transactions.length > maxTransactions) {
      transactions = transactions.slice(0, maxTransactions);
    }

    // Paginação
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedTransactions = transactions.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        transactions: paginatedTransactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(transactions.length / limit),
          totalTransactions: transactions.length,
          hasNext: endIndex < transactions.length,
          hasPrev: page > 1
        },
        limits: {
          maxTransactions: maxTransactions === -1 ? 'Ilimitado' : maxTransactions,
          currentUsage: transactions.length
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter transações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/dashboard/transactions
// @desc    Criar nova transação
// @access  Private
router.post('/transactions', [
  checkUsageLimit('transactions'),
  body('description').trim().isLength({ min: 1, max: 200 }).withMessage('Descrição é obrigatória'),
  body('amount').isFloat().withMessage('Valor deve ser um número'),
  body('type').isIn(['income', 'expense', 'transfer']).withMessage('Tipo inválido'),
  body('category').trim().isLength({ min: 1, max: 50 }).withMessage('Categoria é obrigatória'),
  body('accountId').isInt({ min: 1 }).withMessage('Conta é obrigatória'),
  body('date').optional().isISO8601().withMessage('Data inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { description, amount, type, category, accountId, date = new Date() } = req.body;

    // Simular criação da transação (em produção, salvaria no banco)
    const newTransaction = {
      id: Date.now(), // ID temporário
      description,
      amount: parseFloat(amount),
      type,
      category,
      accountId: parseInt(accountId),
      date: new Date(date),
      createdAt: new Date(),
      userId: req.user._id
    };

    res.status(201).json({
      success: true,
      message: 'Transação criada com sucesso',
      data: { transaction: newTransaction }
    });

  } catch (error) {
    console.error('Erro ao criar transação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/dashboard/categories
// @desc    Obter categorias do usuário
// @access  Private
router.get('/categories', async (req, res) => {
  try {
    const user = req.user;

    // Simular dados de categorias (em produção, viria do banco de dados)
    let categories = [
      { id: 1, name: 'Alimentação', type: 'expense', color: '#FF6B6B', budget: 1200.00, spent: 850.50 },
      { id: 2, name: 'Transporte', type: 'expense', color: '#4ECDC4', budget: 600.00, spent: 420.30 },
      { id: 3, name: 'Saúde', type: 'expense', color: '#45B7D1', budget: 400.00, spent: 289.90 },
      { id: 4, name: 'Lazer', type: 'expense', color: '#96CEB4', budget: 300.00, spent: 180.00 },
      { id: 5, name: 'Educação', type: 'expense', color: '#FFEAA7', budget: 200.00, spent: 120.00 },
      { id: 6, name: 'Trabalho', type: 'income', color: '#74B9FF', budget: 0, spent: 0 },
      { id: 7, name: 'Investimentos', type: 'income', color: '#00B894', budget: 0, spent: 0 },
      { id: 8, name: 'Casa', type: 'expense', color: '#E17055', budget: 800.00, spent: 650.00 },
      { id: 9, name: 'Roupas', type: 'expense', color: '#A29BFE', budget: 300.00, spent: 150.00 },
      { id: 10, name: 'Tecnologia', type: 'expense', color: '#FD79A8', budget: 500.00, spent: 200.00 }
    ];

    // Aplicar limitação do plano
    if (user.limits.categories > 0) {
      categories = categories.slice(0, user.limits.categories);
    }

    res.json({
      success: true,
      data: {
        categories,
        totalCategories: categories.length,
        maxCategories: user.limits.categories === -1 ? 'Ilimitado' : user.limits.categories
      }
    });

  } catch (error) {
    console.error('Erro ao obter categorias:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/dashboard/reports
// @desc    Obter relatórios financeiros
// @access  Private (requer feature de relatórios)
router.get('/reports', checkFeatureAccess('reports'), async (req, res) => {
  try {
    const { type = 'monthly', year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

    // Simular dados de relatórios (em produção, viria do banco de dados)
    const reports = {
      monthly: {
        period: `${month}/${year}`,
        totalIncome: 9700.00,
        totalExpenses: 3200.75,
        netIncome: 6499.25,
        expensesByCategory: [
          { category: 'Alimentação', amount: 850.50, percentage: 26.6 },
          { category: 'Transporte', amount: 420.30, percentage: 13.1 },
          { category: 'Saúde', amount: 289.90, percentage: 9.1 },
          { category: 'Casa', amount: 650.00, percentage: 20.3 },
          { category: 'Lazer', amount: 180.00, percentage: 5.6 },
          { category: 'Outros', amount: 810.05, percentage: 25.3 }
        ],
        incomeBySource: [
          { source: 'Salário', amount: 8500.00, percentage: 87.6 },
          { source: 'Freelance', amount: 1200.00, percentage: 12.4 }
        ],
        savingsRate: 67.0,
        budgetComparison: {
          planned: 3500.00,
          actual: 3200.75,
          variance: -299.25,
          variancePercentage: -8.5
        }
      }
    };

    res.json({
      success: true,
      data: reports[type] || reports.monthly
    });

  } catch (error) {
    console.error('Erro ao obter relatórios:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/dashboard/export
// @desc    Exportar dados financeiros
// @access  Private (requer feature de exportação)
router.get('/export', checkFeatureAccess('exports'), async (req, res) => {
  try {
    const { format = 'csv', type = 'transactions', startDate, endDate } = req.query;

    if (!['csv', 'xlsx', 'pdf'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de exportação inválido'
      });
    }

    // Simular exportação (em produção, geraria arquivo real)
    const exportData = {
      filename: `financeplus_${type}_${new Date().toISOString().split('T')[0]}.${format}`,
      downloadUrl: `/api/dashboard/download/${Date.now()}.${format}`,
      recordsCount: 150,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
    };

    res.json({
      success: true,
      message: 'Exportação gerada com sucesso',
      data: exportData
    });

  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/dashboard/usage
// @desc    Obter informações de uso do plano
// @access  Private
router.get('/usage', async (req, res) => {
  try {
    const user = req.user;
    const subscription = await Subscription.findOne({ user: user._id });

    // Simular dados de uso (em produção, viria do banco de dados)
    const usage = {
      accounts: {
        current: 3,
        limit: user.limits.accounts,
        percentage: user.limits.accounts === -1 ? 0 : (3 / user.limits.accounts) * 100
      },
      categories: {
        current: 8,
        limit: user.limits.categories,
        percentage: user.limits.categories === -1 ? 0 : (8 / user.limits.categories) * 100
      },
      transactions: {
        current: 45, // Transações este mês
        limit: user.limits.transactions,
        percentage: user.limits.transactions === -1 ? 0 : (45 / user.limits.transactions) * 100
      },
      features: {
        reports: user.limits.reports,
        exports: user.limits.exports,
        apiAccess: user.limits.apiAccess
      },
      subscription: {
        plan: subscription?.plan || 'free',
        status: subscription?.status || 'active',
        currentPeriodEnd: subscription?.currentPeriodEnd,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false
      }
    };

    res.json({
      success: true,
      data: usage
    });

  } catch (error) {
    console.error('Erro ao obter informações de uso:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;