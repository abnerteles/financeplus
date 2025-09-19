const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

// Simulação de dados para desenvolvimento local
let localUsers = [
  {
    id: 1,
    name: 'Administrador',
    email: 'admin@financeplus.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'admin',
    subscriptionId: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

let localSubscriptions = [
  {
    id: 1,
    plan: 'enterprise',
    status: 'active',
    limits: { accounts: -1, categories: -1, transactions: -1 },
    features: { reports: true, export: true, api: true },
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const isLocal = !process.env.POSTGRES_URL && !process.env.VERCEL;

class User {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.role = data.role || 'user';
    this.isActive = data.is_active !== undefined ? data.is_active : true;
    this.subscriptionId = data.subscription_id;
    this.limits = data.limits || {};
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Criar usuário
  static async create(userData) {
    try {
      const { name, email, password, role = 'user' } = userData;
      
      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const result = await sql`
        INSERT INTO users (name, email, password, role)
        VALUES (${name}, ${email}, ${hashedPassword}, ${role})
        RETURNING *
      `;
      
      return new User(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Buscar por ID
  static async findById(id) {
    try {
      if (isLocal) {
        const user = localUsers.find(u => u.id === parseInt(id));
        if (!user) return null;
        
        const subscription = localSubscriptions.find(s => s.id === user.subscriptionId);
        return new User({
          ...user,
          plan: subscription?.plan,
          subscription_status: subscription?.status,
          limits: subscription?.limits,
          features: subscription?.features
        });
      }

      const result = await sql`
        SELECT u.*, s.plan, s.status as subscription_status, s.limits, s.features
        FROM users u
        LEFT JOIN subscriptions s ON u.subscription_id = s.id
        WHERE u.id = ${id}
        LIMIT 1
      `;
      
      if (result.rows.length === 0) return null;
      
      return new User(result.rows[0]);
    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error);
      throw error;
    }
  }

  // Buscar por email
  static async findByEmail(email) {
    try {
      if (isLocal) {
        const user = localUsers.find(u => u.email === email);
        if (!user) return null;
        
        const subscription = localSubscriptions.find(s => s.id === user.subscriptionId);
        return new User({
          ...user,
          plan: subscription?.plan,
          subscription_status: subscription?.status,
          limits: subscription?.limits,
          features: subscription?.features
        });
      }

      const result = await sql`
        SELECT u.*, s.plan, s.status as subscription_status, s.limits, s.features
        FROM users u
        LEFT JOIN subscriptions s ON u.subscription_id = s.id
        WHERE u.email = ${email}
        LIMIT 1
      `;
      
      if (result.rows.length === 0) return null;
      
      return new User(result.rows[0]);
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error);
      throw error;
    }
  }

  // Listar usuários com paginação
  static async find(options = {}) {
    try {
      const { page = 1, limit = 10, search = '', role = '' } = options;
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      
      if (search) {
        whereClause += ` AND (name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 2})`;
        params.push(`%${search}%`, `%${search}%`);
      }
      
      if (role) {
        whereClause += ` AND role = $${params.length + 1}`;
        params.push(role);
      }
      
      const query = `
        SELECT * FROM users 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      
      params.push(limit, offset);
      
      const result = await sql.query(query, params);
      
      // Contar total
      const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
      const countResult = await sql.query(countQuery, params.slice(0, -2));
      
      return {
        users: result.rows.map(row => new User(row)),
        total: parseInt(countResult.rows[0].count),
        page,
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  // Atualizar usuário
  async update(updateData) {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          const dbKey = key === 'isActive' ? 'is_active' : 
                       key === 'subscriptionId' ? 'subscription_id' : key;
          fields.push(`${dbKey} = $${paramIndex}`);
          values.push(updateData[key]);
          paramIndex++;
        }
      });
      
      if (fields.length === 0) return this;
      
      fields.push(`updated_at = $${paramIndex}`);
      values.push(new Date());
      values.push(this.id);
      
      const query = `
        UPDATE users 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex + 1}
        RETURNING *
      `;
      
      const result = await sql.query(query, values);
      
      if (result.rows[0]) {
        Object.assign(this, new User(result.rows[0]));
      }
      
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Deletar usuário
  async delete() {
    try {
      await sql`DELETE FROM users WHERE id = ${this.id}`;
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Verificar senha
  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  // Verificar se tem permissão
  hasPermission(requiredRole) {
    const roleHierarchy = {
      'user': 1,
      'admin': 2,
      'root': 3
    };
    
    return roleHierarchy[this.role] >= roleHierarchy[requiredRole];
  }

  // Converter para JSON (remover senha)
  toJSON() {
    const user = { ...this };
    delete user.password;
    return user;
  }

  // Obter estatísticas
  static async getStats() {
    try {
      const result = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true) as active,
          COUNT(*) FILTER (WHERE role = 'admin') as admins,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as recent
        FROM users
      `;
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;