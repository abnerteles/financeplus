const database = require('../config/database');

async function migrate() {
  try {
    console.log('🚀 Iniciando migração do banco de dados...');
    
    // Conectar ao banco
    await database.connect();
    console.log('✅ Conectado ao Vercel Postgres');
    
    // Criar tabelas
    await database.createTables();
    console.log('✅ Tabelas criadas com sucesso');
    
    console.log('🎉 Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    process.exit(1);
  }
}

// Executar migração se o script for chamado diretamente
if (require.main === module) {
  migrate();
}

module.exports = migrate;