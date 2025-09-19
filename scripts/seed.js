const mongoose = require('mongoose');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/financeplus', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Conectado ao MongoDB');

    // Verificar se já existe usuário root
    const existingRoot = await User.findOne({ role: 'root' });
    if (existingRoot) {
      console.log('⚠️  Usuário root já existe:', existingRoot.email);
      return;
    }

    // Criar usuário root padrão
    const rootUser = new User({
      name: 'Administrador Root',
      email: 'admin@financeplus.com',
      password: 'Admin123!', // Senha temporária - DEVE SER ALTERADA
      role: 'root',
      isActive: true,
      emailVerified: true,
      profile: {
        occupation: 'Administrador do Sistema'
      },
      preferences: {
        currency: 'BRL',
        language: 'pt-BR',
        notifications: {
          email: true,
          push: true
        }
      },
      limits: {
        accounts: -1, // ilimitado
        categories: -1,
        transactions: -1
      }
    });

    await rootUser.save();
    console.log('✅ Usuário root criado com sucesso');
    console.log('📧 Email:', rootUser.email);
    console.log('🔑 Senha temporária: Admin123!');
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');

    // Criar assinatura enterprise para o root
    const rootSubscription = new Subscription({
      user: rootUser._id,
      plan: 'enterprise',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 anos
      billing: {
        amount: 0,
        currency: 'BRL',
        interval: 'year'
      },
      metadata: {
        source: 'system',
        campaign: 'root_user'
      }
    });

    await rootSubscription.save();

    // Atualizar usuário root com a assinatura
    rootUser.subscription = rootSubscription._id;
    await rootUser.save();

    console.log('✅ Assinatura enterprise criada para o usuário root');

    // Criar alguns dados de exemplo (opcional)
    await createSampleData();

    console.log('🎉 Seed concluído com sucesso!');
    console.log('\n📋 Resumo:');
    console.log('- Usuário root criado');
    console.log('- Assinatura enterprise configurada');
    console.log('- Dados de exemplo criados');
    console.log('\n🚀 Próximos passos:');
    console.log('1. Faça login com admin@financeplus.com');
    console.log('2. Altere a senha padrão');
    console.log('3. Configure as variáveis de ambiente');
    console.log('4. Configure o sistema de pagamentos');

  } catch (error) {
    console.error('❌ Erro no seed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Desconectado do MongoDB');
    process.exit(0);
  }
};

const createSampleData = async () => {
  try {
    console.log('📊 Criando dados de exemplo...');

    // Criar usuário de exemplo
    const sampleUser = new User({
      name: 'João Silva',
      email: 'joao@exemplo.com',
      password: 'Usuario123!',
      role: 'user',
      isActive: true,
      emailVerified: true,
      profile: {
        occupation: 'Desenvolvedor',
        monthlyIncome: 5000
      }
    });

    await sampleUser.save();

    // Criar assinatura gratuita para o usuário de exemplo
    const sampleSubscription = new Subscription({
      user: sampleUser._id,
      plan: 'free',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      billing: {
        amount: 0,
        currency: 'BRL',
        interval: 'month'
      }
    });

    await sampleSubscription.save();

    sampleUser.subscription = sampleSubscription._id;
    await sampleUser.save();

    // Criar usuário admin de exemplo
    const adminUser = new User({
      name: 'Maria Admin',
      email: 'maria@financeplus.com',
      password: 'Admin123!',
      role: 'admin',
      isActive: true,
      emailVerified: true,
      profile: {
        occupation: 'Administradora'
      }
    });

    await adminUser.save();

    // Criar assinatura pro para o admin
    const adminSubscription = new Subscription({
      user: adminUser._id,
      plan: 'pro',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      billing: {
        amount: 0,
        currency: 'BRL',
        interval: 'month'
      }
    });

    await adminSubscription.save();

    adminUser.subscription = adminSubscription._id;
    await adminUser.save();

    console.log('✅ Dados de exemplo criados:');
    console.log('- Usuário: joao@exemplo.com (senha: Usuario123!)');
    console.log('- Admin: maria@financeplus.com (senha: Admin123!)');

  } catch (error) {
    console.error('❌ Erro ao criar dados de exemplo:', error);
  }
};

// Executar seed se chamado diretamente
if (require.main === module) {
  console.log('🌱 Iniciando seed do banco de dados...');
  seedDatabase();
}

module.exports = { seedDatabase };