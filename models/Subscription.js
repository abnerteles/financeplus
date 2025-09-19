const { sql } = require('@vercel/postgres');

class Subscription {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.user_id;
    this.planId = data.plan_id;
    this.status = data.status || 'pending';
    this.interval = data.interval || 'month';
    this.currentPeriodStart = data.current_period_start;
    this.currentPeriodEnd = data.current_period_end;
    this.requestedAt = data.requested_at;
    this.activatedAt = data.activated_at;
    this.activatedBy = data.activated_by;
    this.extendedAt = data.extended_at;
    this.extendedBy = data.extended_by;
    this.cancelledAt = data.cancelled_at;
    this.limits = data.limits || this.getDefaultLimits();
    this.features = data.features || this.getDefaultFeatures();
    this.paymentHistory = data.payment_history || [];
    this.metadata = data.metadata || {};
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Limites padrão baseados no plano
  getDefaultLimits() {
    const planLimits = {
      free: {
        accounts: 2,
        categories: 5,
        transactions: 50,
        reports: 1,
        exports: 0
      },
      basic: {
        accounts: 5,
        categories: 15,
        transactions: 500,
        reports: 5,
        exports: 2
      },
      premium: {
        accounts: 20,
        categories: 50,
        transactions: 5000,
        reports: 20,
        exports: 10
      },
      enterprise: {
        accounts: -1, // ilimitado
        categories: -1,
        transactions: -1,
        reports: -1,
        exports: -1
      }
    };

    return planLimits[this.planId] || planLimits.free;
  }

  // Features padrão baseadas no plano
  getDefaultFeatures() {
    const planFeatures = {
      free: ['basic_dashboard', 'manual_transactions'],
      basic: ['basic_dashboard', 'manual_transactions', 'categories', 'basic_reports'],
      premium: ['basic_dashboard', 'manual_transactions', 'categories', 'advanced_reports', 'exports', 'goals'],
      enterprise: ['all_features', 'priority_support', 'custom_integrations']
    };

    return planFeatures[this.planId] || planFeatures.free;
  }

  // Criar assinatura
  static async create(subscriptionData) {
    try {
      const {
        userId,
        planId,
        status = 'pending',
        interval = 'month',
        metadata = {}
      } = subscriptionData;

      const subscription = new Subscription({ user_id: userId, plan_id: planId, status, interval, metadata });
      const limits = subscription.getDefaultLimits();
      const features = subscription.getDefaultFeatures();

      const result = await sql`
        INSERT INTO subscriptions (
          user_id, plan_id, status, interval, limits, features, 
          requested_at, metadata
        )
        VALUES (
          ${userId}, ${planId}, ${status}, ${interval}, 
          ${JSON.stringify(limits)}, ${JSON.stringify(features)},
          ${new Date()}, ${JSON.stringify(metadata)}
        )
        RETURNING *
      `;

      return new Subscription(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Buscar por ID
  static async findById(id) {
    try {
      const result = await sql`
        SELECT s.*, u.name as user_name, u.email as user_email,
               a.name as activated_by_name, e.name as extended_by_name
        FROM subscriptions s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN users a ON s.activated_by = a.id
        LEFT JOIN users e ON s.extended_by = e.id
        WHERE s.id = ${id}
      `;

      if (result.rows[0]) {
        const subscription = new Subscription(result.rows[0]);
        subscription.user = {
          id: subscription.userId,
          name: result.rows[0].user_name,
          email: result.rows[0].user_email
        };
        if (result.rows[0].activated_by_name) {
          subscription.activatedByUser = {
            id: subscription.activatedBy,
            name: result.rows[0].activated_by_name
          };
        }
        if (result.rows[0].extended_by_name) {
          subscription.extendedByUser = {
            id: subscription.extendedBy,
            name: result.rows[0].extended_by_name
          };
        }
        return subscription;
      }

      return null;
    } catch (error) {
      throw error;
    }
  }

  // Buscar por usuário
  static async findByUserId(userId) {
    try {
      const result = await sql`
        SELECT * FROM subscriptions 
        WHERE user_id = ${userId} AND status IN ('active', 'trialing')
        ORDER BY created_at DESC
        LIMIT 1
      `;

      return result.rows[0] ? new Subscription(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  // Listar assinaturas com filtros
  static async find(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status = '', 
        planId = '', 
        search = '',
        userId = ''
      } = options;
      
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      
      if (status) {
        whereClause += ` AND s.status = $${params.length + 1}`;
        params.push(status);
      }
      
      if (planId) {
        whereClause += ` AND s.plan_id = $${params.length + 1}`;
        params.push(planId);
      }
      
      if (userId) {
        whereClause += ` AND s.user_id = $${params.length + 1}`;
        params.push(userId);
      }
      
      if (search) {
        whereClause += ` AND (u.name ILIKE $${params.length + 1} OR u.email ILIKE $${params.length + 2})`;
        params.push(`%${search}%`, `%${search}%`);
      }
      
      const query = `
        SELECT s.*, u.name as user_name, u.email as user_email
        FROM subscriptions s
        LEFT JOIN users u ON s.user_id = u.id
        ${whereClause}
        ORDER BY s.created_at DESC 
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      
      params.push(limit, offset);
      
      const result = await sql.query(query, params);
      
      // Contar total
      const countQuery = `
        SELECT COUNT(*) 
        FROM subscriptions s
        LEFT JOIN users u ON s.user_id = u.id
        ${whereClause}
      `;
      const countResult = await sql.query(countQuery, params.slice(0, -2));
      
      const subscriptions = result.rows.map(row => {
        const subscription = new Subscription(row);
        subscription.user = {
          id: subscription.userId,
          name: row.user_name,
          email: row.user_email
        };
        return subscription;
      });
      
      return {
        subscriptions,
        total: parseInt(countResult.rows[0].count),
        page,
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  // Atualizar assinatura
  async update(updateData) {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          const dbKey = key === 'userId' ? 'user_id' : 
                       key === 'planId' ? 'plan_id' :
                       key === 'currentPeriodStart' ? 'current_period_start' :
                       key === 'currentPeriodEnd' ? 'current_period_end' :
                       key === 'requestedAt' ? 'requested_at' :
                       key === 'activatedAt' ? 'activated_at' :
                       key === 'activatedBy' ? 'activated_by' :
                       key === 'extendedAt' ? 'extended_at' :
                       key === 'extendedBy' ? 'extended_by' :
                       key === 'cancelledAt' ? 'cancelled_at' :
                       key === 'paymentHistory' ? 'payment_history' : key;
          
          let value = updateData[key];
          if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
          }
          
          fields.push(`${dbKey} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });
      
      if (fields.length === 0) return this;
      
      fields.push(`updated_at = $${paramIndex}`);
      values.push(new Date());
      values.push(this.id);
      
      const query = `
        UPDATE subscriptions 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex + 1}
        RETURNING *
      `;
      
      const result = await sql.query(query, values);
      
      if (result.rows[0]) {
        Object.assign(this, new Subscription(result.rows[0]));
      }
      
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Salvar (criar ou atualizar)
  async save() {
    if (this.id) {
      return this.update(this);
    } else {
      const created = await Subscription.create(this);
      Object.assign(this, created);
      return this;
    }
  }

  // Verificar se tem feature
  hasFeature(feature) {
    return this.features.includes(feature) || this.features.includes('all_features');
  }

  // Verificar se está ativa
  isActive() {
    return ['active', 'trialing'].includes(this.status) && 
           (!this.currentPeriodEnd || new Date(this.currentPeriodEnd) > new Date());
  }

  // Adicionar pagamento ao histórico
  async addPayment(paymentData) {
    const payment = {
      id: Date.now().toString(),
      amount: paymentData.amount,
      method: paymentData.method || 'manual',
      description: paymentData.description || '',
      processedBy: paymentData.processedBy,
      processedAt: new Date(),
      ...paymentData
    };

    this.paymentHistory.push(payment);
    await this.update({ paymentHistory: this.paymentHistory });
    
    return payment;
  }

  // Obter estatísticas
  static async getStats() {
    try {
      const result = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
          COUNT(*) FILTER (WHERE plan_id = 'free') as free_plan,
          COUNT(*) FILTER (WHERE plan_id = 'basic') as basic_plan,
          COUNT(*) FILTER (WHERE plan_id = 'premium') as premium_plan,
          COUNT(*) FILTER (WHERE plan_id = 'enterprise') as enterprise_plan,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as recent
        FROM subscriptions
      `;
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Buscar assinaturas expirando
  static async getExpiringSubscriptions(days = 7) {
    try {
      const result = await sql`
        SELECT s.*, u.name as user_name, u.email as user_email
        FROM subscriptions s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.status = 'active' 
        AND s.current_period_end <= CURRENT_DATE + INTERVAL '${days} days'
        AND s.current_period_end > CURRENT_DATE
        ORDER BY s.current_period_end ASC
      `;
      
      return result.rows.map(row => {
        const subscription = new Subscription(row);
        subscription.user = {
          id: subscription.userId,
          name: row.user_name,
          email: row.user_email
        };
        return subscription;
      });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Subscription;