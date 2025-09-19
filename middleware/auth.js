const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware de autenticação
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso requerido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'financeplus_secret_key');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }

    console.error('Erro na autenticação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Middleware de autorização por role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Permissões insuficientes.'
      });
    }

    next();
  };
};

// Middleware para verificar permissões específicas
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        message: `Permissão '${permission}' requerida`
      });
    }

    next();
  };
};

// Middleware para verificar assinatura ativa
const requireActiveSubscription = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    });
  }

  // Root e admin sempre têm acesso
  if (req.user.role === 'root' || req.user.role === 'admin') {
    return next();
  }

  if (!req.user.subscription) {
    return res.status(403).json({
      success: false,
      message: 'Assinatura requerida',
      code: 'SUBSCRIPTION_REQUIRED'
    });
  }

  if (!req.user.subscription.isActive()) {
    return res.status(403).json({
      success: false,
      message: 'Assinatura inativa ou expirada',
      code: 'SUBSCRIPTION_INACTIVE'
    });
  }

  next();
};

// Middleware para verificar feature específica
const requireFeature = (featureName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Root e admin sempre têm acesso
    if (req.user.role === 'root' || req.user.role === 'admin') {
      return next();
    }

    if (!req.user.subscription) {
      return res.status(403).json({
        success: false,
        message: 'Assinatura requerida para esta funcionalidade',
        code: 'SUBSCRIPTION_REQUIRED'
      });
    }

    if (!req.user.subscription.hasFeature(featureName)) {
      return res.status(403).json({
        success: false,
        message: `Funcionalidade '${featureName}' não disponível no seu plano`,
        code: 'FEATURE_NOT_AVAILABLE',
        requiredFeature: featureName
      });
    }

    next();
  };
};

// Middleware para verificar limites de uso
const checkUsageLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      // Root e admin não têm limites
      if (req.user.role === 'root' || req.user.role === 'admin') {
        return next();
      }

      const userLimit = req.user.limits[limitType];
      
      // -1 significa ilimitado
      if (userLimit === -1) {
        return next();
      }

      // Aqui você implementaria a lógica para contar o uso atual
      // Por exemplo, contar quantas contas/categorias/transações o usuário tem
      let currentUsage = 0;
      
      switch (limitType) {
        case 'accounts':
          // currentUsage = await Account.countDocuments({ user: req.user._id });
          break;
        case 'categories':
          // currentUsage = await Category.countDocuments({ user: req.user._id });
          break;
        case 'transactions':
          // currentUsage = await Transaction.countDocuments({ user: req.user._id });
          break;
      }

      if (currentUsage >= userLimit) {
        return res.status(403).json({
          success: false,
          message: `Limite de ${limitType} atingido (${userLimit})`,
          code: 'USAGE_LIMIT_EXCEEDED',
          limitType,
          currentUsage,
          maxUsage: userLimit
        });
      }

      req.currentUsage = currentUsage;
      req.maxUsage = userLimit;
      next();
    } catch (error) {
      console.error('Erro ao verificar limite de uso:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };
};

// Middleware para verificar se é o próprio usuário ou admin
const requireOwnershipOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    });
  }

  const targetUserId = req.params.userId || req.params.id;
  
  if (req.user.role === 'root' || 
      req.user.role === 'admin' || 
      req.user._id.toString() === targetUserId) {
    return next();
  }

  res.status(403).json({
    success: false,
    message: 'Acesso negado. Você só pode acessar seus próprios dados.'
  });
};

// Middleware para verificar acesso a features específicas
const checkFeatureAccess = (feature) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Acesso negado'
        });
      }

      // Verificar se o usuário tem acesso à feature
      if (!user.limits[feature]) {
        return res.status(403).json({
          success: false,
          message: `Acesso à feature '${feature}' não disponível no seu plano atual`,
          upgradeRequired: true
        });
      }

      next();
    } catch (error) {
      console.error('Erro na verificação de feature:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  };
};

module.exports = {
  authenticate,
  authorize,
  checkPermission,
  requireActiveSubscription,
  requireFeature,
  checkUsageLimit,
  requireOwnershipOrAdmin,
  checkFeatureAccess
};