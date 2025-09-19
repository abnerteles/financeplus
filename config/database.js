const { sql } = require('@vercel/postgres');

class Database {
  constructor() {
    this.connected = false;
    this.isLocal = !process.env.POSTGRES_URL && !process.env.VERCEL;
  }

  async connect() {
    try {
      if (this.isLocal) {
        // Em desenvolvimento local, simular conexão
        console.log('🔧 Modo desenvolvimento local - simulando banco de dados');
        this.connected = true;
        await this.createTables();
        return;
      }

      // Testar conexão com Vercel Postgres
      await sql`SELECT 1`;
      this.connected = true;
      console.log('✅ Conectado ao Vercel Postgres');
      
      // Criar tabelas se não existirem
      await this.createTables();
    } catch (error) {
      console.error('❌ Erro ao conectar com Vercel Postgres:', error);
      throw error;
    }
  }

  async createTables() {
    try {
      if (this.isLocal) {
        console.log('🔧 Modo local - tabelas simuladas');
        return;
      }

      // Criar tabela de usuários
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          subscription_id INTEGER REFERENCES subscriptions(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Criar tabela de assinaturas
      await sql`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id SERIAL PRIMARY KEY,
          plan VARCHAR(50) NOT NULL DEFAULT 'free',
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          limits JSONB DEFAULT '{}',
          features JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      console.log('✅ Tabelas criadas/verificadas com sucesso');
    } catch (error) {
      console.error('❌ Erro ao criar tabelas:', error);
      throw error;
    }
  }

  async disconnect() {
    // Vercel Postgres gerencia conexões automaticamente
    this.connected = false;
    console.log('🔌 Desconectado do Vercel Postgres');
  }

  isConnected() {
    return this.connected;
  }
}

module.exports = new Database();