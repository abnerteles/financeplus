const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { authenticate, authorize, requireOwnershipOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Aplicar autenticação a todas as rotas
router.use(authenticate);

// @route   GET /api/subscriptions/plans
// @desc    Obter planos disponíveis
// @access  Public
router.get('/plans', async (req, res) => {
  try {
    const plans = [
      {
        id: 'free',
        name: 'Gratuito',
        price: 0,
        currency: 'BRL',
        interval: 'month',
        features: [
          'Até 3 contas bancárias',
          'Até 10 categorias',
          'Até 100 transações/mês',
          'Dashboard básico',
          'Suporte por email'
        ],
        limits: {
          accounts: 3,
          categories: 10,
          transactions: 100,
          reports: false,
          exports: false,
          apiAccess: false
        },
        popular: false
      },
      {
        id: 'pro',
        name: 'Profissional',
        price: 2990, // R$ 29,90
        currency: 'BRL',
        interval: 'month',
        features: [
          'Até 10 contas bancárias',
          'Até 50 categorias',
          'Até 1.000 transações/mês',
          'Relatórios avançados',
          'Exportação de dados',
          'Metas financeiras',
          'Alertas de orçamento',
          'Suporte prioritário'
        ],
        limits: {
          accounts: 10,
          categories: 50,
          transactions: 1000,
          reports: true,
          exports: true,
          apiAccess: false
        },
        popular: true
      },
      {
        id: 'enterprise',
        name: 'Empresarial',
        price: 9990, // R$ 99,90
        currency: 'BRL',
        interval: 'month',
        features: [
          'Contas ilimitadas',
          'Categorias ilimitadas',
          'Transações ilimitadas',
          'Relatórios avançados',
          'Exportação de dados',
          'API de integração',
          'Suporte 24/7',
          'Integrações personalizadas',
          'Gerente de conta dedicado'
        ],
        limits: {
          accounts: -1,
          categories: -1,
          transactions: -1,
          reports: true,
          exports: true,
          apiAccess: true
        },
        popular: false
      }
    ];

    res.json({
      success: true,
      data: { plans }
    });
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/subscriptions/current
// @desc    Obter assinatura atual do usuário
// @access  Private
router.get('/current', async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ 
      userId: req.user.id,
      status: { $in: ['active', 'trialing'] }
    });

    if (!subscription) {
      return res.json({
        success: true,
        data: { 
          subscription: null,
          plan: 'free'
        }
      });
    }

    res.json({
      success: true,
      data: { 
        subscription,
        plan: subscription.planId
      }
    });
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/subscriptions/request
// @desc    Solicitar upgrade de plano (manual)
// @access  Private
router.post('/request', [
  body('planId').isIn(['pro', 'enterprise']).withMessage('Plano inválido'),
  body('interval').optional().isIn(['month', 'year']).withMessage('Intervalo inválido'),
  body('message').optional().isLength({ max: 500 }).withMessage('Mensagem muito longa')
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

    const { planId, interval = 'month', message } = req.body;

    // Verificar se já tem assinatura ativa
    const existingSubscription = await Subscription.findOne({
      userId: req.user.id,
      status: { $in: ['active', 'trialing', 'pending'] }
    });

    if (existingSubscription && existingSubscription.planId !== 'free') {
      return res.status(400).json({
        success: false,
        message: 'Você já possui uma assinatura ativa'
      });
    }

    // Criar solicitação de assinatura
    const subscription = new Subscription({
      userId: req.user.id,
      planId,
      status: 'pending',
      interval,
      requestedAt: new Date(),
      requestMessage: message,
      priceAtPurchase: planId === 'pro' ? 2990 : 9990
    });

    await subscription.save();

    res.json({
      success: true,
      message: 'Solicitação de upgrade enviada! Nossa equipe entrará em contato em breve.',
      data: { subscription }
    });
  } catch (error) {
    console.error('Erro ao solicitar upgrade:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/subscriptions/activate
// @desc    Ativar assinatura manualmente (Admin only)
// @access  Admin
router.post('/activate', authorize('admin'), [
  body('userId').isInt().withMessage('ID de usuário inválido'),
  body('planId').isIn(['pro', 'enterprise']).withMessage('Plano inválido'),
  body('interval').optional().isIn(['month', 'year']).withMessage('Intervalo inválido'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duração inválida')
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

    const { userId, planId, interval = 'month', duration = 1 } = req.body;

    // Verificar se usuário existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Cancelar assinatura existente se houver
    await Subscription.updateMany(
      { userId, status: { $in: ['active', 'trialing', 'pending'] } },
      { status: 'cancelled', cancelledAt: new Date() }
    );

    // Calcular data de expiração
    const currentDate = new Date();
    const expiresAt = new Date(currentDate);
    if (interval === 'month') {
      expiresAt.setMonth(expiresAt.getMonth() + duration);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + duration);
    }

    // Criar nova assinatura
    const subscription = new Subscription({
      userId,
      planId,
      status: 'active',
      interval,
      currentPeriodStart: currentDate,
      currentPeriodEnd: expiresAt,
      activatedAt: currentDate,
      activatedBy: req.user.id,
      priceAtPurchase: planId === 'pro' ? 2990 : 9990
    });

    await subscription.save();

    // Atualizar plano do usuário
    user.plan = planId;
    await user.save();

    res.json({
      success: true,
      message: `Assinatura ${planId} ativada com sucesso para ${user.name}`,
      data: { subscription }
    });
  } catch (error) {
    console.error('Erro ao ativar assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/subscriptions/extend
// @desc    Estender assinatura existente (Admin only)
// @access  Admin
router.post('/extend', authorize('admin'), [
  body('subscriptionId').isInt().withMessage('ID de assinatura inválido'),
  body('duration').isInt({ min: 1 }).withMessage('Duração inválida')
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

    const { subscriptionId, duration } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Assinatura não encontrada'
      });
    }

    // Estender período
    const newEndDate = new Date(subscription.currentPeriodEnd);
    if (subscription.interval === 'month') {
      newEndDate.setMonth(newEndDate.getMonth() + duration);
    } else {
      newEndDate.setFullYear(newEndDate.getFullYear() + duration);
    }

    subscription.currentPeriodEnd = newEndDate;
    subscription.extendedAt = new Date();
    subscription.extendedBy = req.user.id;

    await subscription.save();

    res.json({
      success: true,
      message: `Assinatura estendida por ${duration} ${subscription.interval}(s)`,
      data: { subscription }
    });
  } catch (error) {
    console.error('Erro ao estender assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/subscriptions/cancel
// @desc    Cancelar assinatura
// @access  Private
router.post('/cancel', async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: { $in: ['active', 'trialing'] }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Nenhuma assinatura ativa encontrada'
      });
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    await subscription.save();

    // Atualizar plano do usuário para free
    const user = await User.findById(req.user.id);
    user.plan = 'free';
    await user.save();

    res.json({
      success: true,
      message: 'Assinatura cancelada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   GET /api/subscriptions/pending
// @desc    Listar solicitações pendentes (admin)
// @access  Private (Admin)
router.get('/pending', authenticate, authorize('admin', 'root'), async (req, res) => {
  try {
    const pendingRequests = await Subscription.find({ status: 'pending' })
      .populate('userId', 'name email')
      .sort({ requestedAt: -1 });

    res.json({
      success: true,
      data: { requests: pendingRequests }
    });

  } catch (error) {
    console.error('Erro ao buscar solicitações pendentes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/subscriptions/activate/:id
// @desc    Ativar assinatura pendente (admin)
// @access  Private (Admin)
router.post('/activate/:id', authenticate, authorize('admin', 'root'), async (req, res) => {
  try {
    const subscriptionId = req.params.id;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Assinatura não encontrada'
      });
    }

    if (subscription.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Apenas assinaturas pendentes podem ser ativadas'
      });
    }

    // Calcular período
    const now = new Date();
    const periodEnd = new Date(now);
    if (subscription.interval === 'month') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Ativar assinatura
    subscription.status = 'active';
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = periodEnd;
    subscription.activatedAt = now;
    subscription.activatedBy = req.user._id;

    await subscription.save();

    // Atualizar limites do usuário
    await User.findByIdAndUpdate(subscription.userId, {
      subscription: subscription._id,
      limits: subscription.limits
    });

    res.json({
      success: true,
      message: 'Assinatura ativada com sucesso',
      data: { subscription }
    });

  } catch (error) {
    console.error('Erro ao ativar assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/subscriptions/extend/:id
// @desc    Estender assinatura ativa (admin)
// @access  Private (Admin)
router.post('/extend/:id', [
  authenticate,
  authorize('admin', 'root'),
  body('days').isInt({ min: 1, max: 365 }).withMessage('Dias deve ser entre 1 e 365')
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
    const { days } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Assinatura não encontrada'
      });
    }

    if (!['active', 'trialing'].includes(subscription.status)) {
      return res.status(400).json({
        success: false,
        message: 'Apenas assinaturas ativas podem ser estendidas'
      });
    }

    // Estender período
    const currentEnd = new Date(subscription.currentPeriodEnd || new Date());
    currentEnd.setDate(currentEnd.getDate() + days);

    subscription.currentPeriodEnd = currentEnd;
    subscription.extendedAt = new Date();
    subscription.extendedBy = req.user._id;

    await subscription.save();

    res.json({
      success: true,
      message: `Assinatura estendida por ${days} dias`,
      data: { 
        subscription,
        newEndDate: currentEnd
      }
    });

  } catch (error) {
    console.error('Erro ao estender assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// @route   POST /api/subscriptions/cancel/:id
// @desc    Cancelar assinatura (admin)
// @access  Private (Admin)
router.post('/cancel/:id', authenticate, authorize('admin', 'root'), async (req, res) => {
  try {
    const subscriptionId = req.params.id;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Assinatura não encontrada'
      });
    }

    if (subscription.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Assinatura já está cancelada'
      });
    }

    // Cancelar assinatura
    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();

    await subscription.save();

    // Reverter usuário para plano gratuito
    const freeSubscription = new Subscription({
      userId: subscription.userId,
      planId: 'free',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: null
    });

    await freeSubscription.save();

    // Atualizar limites do usuário
    await User.findByIdAndUpdate(subscription.userId, {
      subscription: freeSubscription._id,
      limits: freeSubscription.limits
    });

    res.json({
      success: true,
      message: 'Assinatura cancelada com sucesso',
      data: { subscription }
    });

  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;