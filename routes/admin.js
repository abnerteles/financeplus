const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { authenticate, authorize, checkPermission } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação a todas as rotas admin
router.use(authenticate);
router.use(authorize('admin', 'root'));

// @route   GET /api/admin/dashboard
// @desc    Obter dados do dashboard administrativo
// @access  Private (Admin/Root)
router.get('/dashboard', async (req, res) => {
  try {
    // Estatísticas gerais
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalSubscriptions = await Subscription.countDocuments();
    const activeSubscriptions = await Subscription.countDocuments({ 
      status: { $in: ['active', 'trialing'] } 
    });

    // Estatísticas por plano
    const subscriptionStats = await Subscription.getStats();

    // Usuários registrados nos últimos 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsersLast30Days = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Receita total (apenas assinaturas ativas)
    const revenueData = await Subscription.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$billing.amount' },
          monthlyRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$billing.interval', 'month'] },
                '$billing.amount',
                { $divide: ['$billing.amount', 12] }
              ]
            }
          }
        }
      }
    ]);

    const revenue = revenueData[0] || { totalRevenue: 0, monthlyRevenue: 0 };

    // Últimos usuários registrados
    const recentUsers = await User.find()
      .select('name email role createdAt isActive')
      .populate('subscription', 'plan status')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          totalSubscriptions,
          activeSubscriptions,
          newUsersLast30Days,
          revenue: revenue.monthlyRevenue
        },
        subscriptionStats,
        recentUsers
      }
    });

  } catch (error) {
    console.error('Erro no dashboard admin:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Listar usuários com filtros e paginação
// @access  Private (Admin/Root)
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100'),
  query('search').optional().isLength({ max: 100 }).withMessage('Busca deve ter no máximo 100 caracteres'),
  query('role').optional().isIn(['user', 'admin', 'root']).withMessage('Role inválido'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Status inválido'),
  query('plan').optional().isIn(['free', 'pro', 'enterprise']).withMessage('Plano inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Parâmetros inválidos',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search;
    const role = req.query.role;
    const status = req.query.status;
    const plan = req.query.plan;

    // Construir filtros
    const filters = {};

    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      filters.role = role;
    }

    if (status) {
      filters.isActive = status === 'active';
    }

    // Pipeline de agregação para incluir filtro por plano
    const pipeline = [
      { $match: filters },
      {
        $lookup: {
          from: 'subscriptions',
          localField: 'subscription',
          foreignField: '_id',
          as: 'subscriptionData'
        }
      },
      {
        $unwind: {
          path: '$subscriptionData',
          preserveNullAndEmptyArrays: true
        }
      }
    ];

    if (plan) {
      pipeline.push({
        $match: { 'subscriptionData.plan': plan }
      });
    }

    pipeline.push(
      {
        $project: {
          password: 0,
          passwordResetToken: 0,
          emailVerificationToken: 0
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    );

    const users = await User.aggregate(pipeline);
    const totalUsers = await User.countDocuments(filters);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          hasNext: page * limit < totalUsers,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Obter detalhes de um usuário específico
// @access  Private (Admin/Root)
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('subscription')
      .select('-password -passwordResetToken -emailVerificationToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Atualizar usuário
// @access  Private (Admin/Root)
router.put('/users/:id', [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Email inválido'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role inválido'),
  body('isActive').optional().isBoolean().withMessage('Status deve ser boolean')
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

    const { name, email, role, isActive } = req.body;
    const userId = req.params.id;

    // Verificar se usuário existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Apenas root pode alterar outros admins ou criar admins
    if (req.user.role !== 'root') {
      if (user.role === 'admin' || user.role === 'root') {
        return res.status(403).json({
          success: false,
          message: 'Apenas root pode alterar administradores'
        });
      }
      
      if (role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Apenas root pode promover usuários a administrador'
        });
      }
    }

    // Não permitir alterar o próprio role
    if (userId === req.user._id.toString() && role && role !== req.user.role) {
      return res.status(400).json({
        success: false,
        message: 'Você não pode alterar seu próprio nível de acesso'
      });
    }

    // Verificar se email já está em uso
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email já está em uso'
        });
      }
    }

    // Atualizar campos
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    await user.save();

    // Retornar usuário atualizado
    const updatedUser = await User.findById(userId)
      .populate('subscription')
      .select('-password -passwordResetToken -emailVerificationToken');

    res.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Deletar usuário
// @access  Private (Root only)
router.delete('/users/:id', authorize('root'), async (req, res) => {
  try {
    const userId = req.params.id;

    // Não permitir deletar a si mesmo
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Você não pode deletar sua própria conta'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Deletar assinatura associada
    if (user.subscription) {
      await Subscription.findByIdAndDelete(user.subscription);
    }

    // Deletar usuário
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Usuário deletado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/admin/subscriptions
// @desc    Listar assinaturas com filtros e paginação
// @access  Private (Admin/Root)
router.get('/subscriptions', [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite deve ser entre 1 e 100'),
  query('status').optional().isIn(['active', 'inactive', 'cancelled', 'past_due', 'trialing', 'pending']).withMessage('Status inválido'),
  query('plan').optional().isIn(['free', 'pro', 'enterprise']).withMessage('Plano inválido'),
  query('search').optional().isLength({ max: 100 }).withMessage('Busca deve ter no máximo 100 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Parâmetros inválidos',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Construir filtros
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.plan) filters.planId = req.query.plan;
    if (req.query.search) {
      // Buscar por nome ou email do usuário
      const users = await User.find({
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } }
        ]
      }).select('_id');
      
      filters.userId = { $in: users.map(u => u._id) };
    }

    // Buscar assinaturas
    const subscriptions = await Subscription.find(filters)
      .populate('userId', 'name email role isActive')
      .populate('activatedBy', 'name email')
      .populate('extendedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Subscription.countDocuments(filters);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Erro ao listar assinaturas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/admin/subscriptions/stats
// @desc    Obter estatísticas de assinaturas
// @access  Private (Admin/Root)
router.get('/subscriptions/stats', async (req, res) => {
  try {
    const stats = await Subscription.getStats();
    
    res.json({
      success: true,
      data: {
        total: stats.byPlan.reduce((acc, plan) => acc + plan.count, 0),
        active: stats.byPlan.reduce((acc, plan) => acc + plan.active, 0),
        pending: stats.pendingRequests,
        revenue: stats.totalRevenue
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

// @route   POST /api/admin/subscriptions
// @desc    Criar nova assinatura manual
// @access  Private (Admin/Root)
router.post('/subscriptions', [
  body('userId').isInt().withMessage('ID do usuário inválido'),
  body('planId').isIn(['pro', 'enterprise']).withMessage('Plano inválido'),
  body('interval').isIn(['month', 'year']).withMessage('Intervalo inválido'),
  body('priceAtPurchase').isFloat({ min: 0 }).withMessage('Preço deve ser um número positivo'),
  body('paymentMethod').isIn(['pix', 'transfer', 'cash', 'other']).withMessage('Método de pagamento inválido'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Observações muito longas')
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

    const { userId, planId, interval, priceAtPurchase, paymentMethod, notes } = req.body;

    // Verificar se usuário existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar se já existe assinatura ativa
    const existingSubscription = await Subscription.findOne({
      userId: userId,
      status: { $in: ['active', 'trialing', 'pending'] }
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já possui uma assinatura ativa ou pendente'
      });
    }

    // Calcular período
    const now = new Date();
    const periodEnd = new Date(now);
    if (interval === 'month') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Criar assinatura
    const subscription = new Subscription({
      userId,
      planId,
      status: 'active',
      interval,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      activatedAt: now,
      activatedBy: req.user._id,
      priceAtPurchase,
      metadata: {
        notes,
        source: 'admin_manual'
      }
    });

    // Adicionar pagamento ao histórico
    subscription.paymentHistory.push({
      amount: priceAtPurchase,
      currency: 'BRL',
      status: 'succeeded',
      method: paymentMethod,
      description: `Pagamento manual - ${planId} ${interval}`,
      addedBy: req.user._id
    });

    await subscription.save();

    // Atualizar limites do usuário
    await User.findByIdAndUpdate(userId, {
      subscription: subscription._id,
      limits: subscription.limits
    });

    res.status(201).json({
      success: true,
      message: 'Assinatura criada com sucesso',
      data: { subscription }
    });

  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   PUT /api/admin/subscriptions/:id
// @desc    Atualizar assinatura
// @access  Private (Admin/Root)
router.put('/subscriptions/:id', [
  body('planId').optional().isIn(['free', 'pro', 'enterprise']).withMessage('Plano inválido'),
  body('status').optional().isIn(['active', 'inactive', 'cancelled', 'past_due', 'trialing', 'pending']).withMessage('Status inválido'),
  body('currentPeriodEnd').optional().isISO8601().withMessage('Data de fim inválida'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Observações muito longas')
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

    const subscriptionId = req.params.id;
    const { planId, status, currentPeriodEnd, notes } = req.body;

    // Verificar se assinatura existe
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Assinatura não encontrada'
      });
    }

    // Atualizar campos
    if (planId) subscription.planId = planId;
    if (status) {
      subscription.status = status;
      if (status === 'cancelled') {
        subscription.cancelledAt = new Date();
      }
    }
    if (currentPeriodEnd) subscription.currentPeriodEnd = new Date(currentPeriodEnd);
    if (notes !== undefined) {
      subscription.metadata = subscription.metadata || {};
      subscription.metadata.notes = notes;
    }

    await subscription.save();

    // Atualizar limites do usuário se o plano mudou
    if (planId) {
      await User.findByIdAndUpdate(subscription.userId, {
        limits: subscription.limits
      });
    }

    res.json({
      success: true,
      message: 'Assinatura atualizada com sucesso',
      data: { subscription }
    });

  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/admin/analytics
// @desc    Obter analytics detalhados
// @access  Private (Admin/Root)
router.get('/analytics', async (req, res) => {
  try {
    // Analytics de usuários por mês
    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    // Analytics de receita por mês
    const revenueGrowth = await Subscription.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$billing.amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    // Distribuição por planos
    const planDistribution = await Subscription.aggregate([
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
          revenue: { $sum: '$billing.amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        userGrowth,
        revenueGrowth,
        planDistribution
      }
    });

  } catch (error) {
    console.error('Erro ao obter analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;