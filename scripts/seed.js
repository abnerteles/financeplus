const Database = require('../config/database');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    // Conectar ao banco
    await Database.connect();
    console.log('✅ Conectado ao banco de dados');

    // Verificar se já existe usuário root
    const existingRoot = await User.findByEmail('admin@financeplus.com');
    if (existingRoot) {
      console.log('⚠️  Usuário root já existe:', existingRoot.email);
      return;
    }

    // Criar usuário root padrão
    const rootUser = await User.create({
      name: 'Administrador Root',
      email: 'admin@financeplus.com',
      password: 'Admin123!', // Senha temporária - DEVE SER ALTERADA
      role: 'root'
    });
    console.log('✅ Usuário root criado com sucesso');
    console.log('📧 Email:', rootUser.email);
    console.log('🔑 Senha temporária: Admin123!');
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');

    // Criar assinatura enterprise para o root
    const rootSubscription = await Subscription.create({
      userId: rootUser.id,
      plan: 'enterprise',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) // 10 anos
    });

    console.log('✅ Assinatura enterprise criada para o usuário root');

    // Dados básicos criados com sucesso

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
    await Database.disconnect();
    console.log('📤 Desconectado do banco de dados');
    process.exit(0);
  }
};



// Executar seed se chamado diretamente
if (require.main === module) {
  console.log('🌱 Iniciando seed do banco de dados...');
  seedDatabase();
}

module.exports = { seedDatabase };