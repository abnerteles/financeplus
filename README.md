# FinancePlus SaaS 💰

Sistema completo de gestão financeira pessoal com controle de assinaturas, planos e painel administrativo.

## 🚀 Características

### ✨ Funcionalidades Principais
- **Dashboard Financeiro**: Visão completa das finanças pessoais
- **Gestão de Contas**: Múltiplas contas bancárias e cartões
- **Controle de Transações**: Receitas, despesas e transferências
- **Categorização**: Organização por categorias personalizáveis
- **Relatórios Avançados**: Análises detalhadas e gráficos
- **Exportação de Dados**: CSV, Excel e PDF
- **Metas Financeiras**: Definição e acompanhamento de objetivos

### 🔐 Sistema SaaS
- **Autenticação JWT**: Login seguro com tokens
- **Controle de Assinaturas**: Planos Free, Pro e Enterprise
- **Pagamentos Stripe**: Integração completa com gateway
- **Painel Administrativo**: Gestão de usuários e assinaturas
- **Limitações por Plano**: Controle automático de recursos
- **API RESTful**: Endpoints completos para integração

## 📋 Planos Disponíveis

### 🆓 Gratuito
- Até 3 contas bancárias
- Até 10 categorias
- Até 100 transações/mês
- Dashboard básico
- Suporte por email

### 💼 Profissional - R$ 29,90/mês
- Até 10 contas bancárias
- Até 50 categorias
- Até 1.000 transações/mês
- Relatórios avançados
- Exportação de dados
- Metas financeiras
- Suporte prioritário

### 🏢 Empresarial - R$ 99,90/mês
- Contas ilimitadas
- Categorias ilimitadas
- Transações ilimitadas
- API de integração
- Suporte 24/7
- Gerente de conta dedicado

## 🛠️ Instalação

### Pré-requisitos
- Node.js 18+ 
- Vercel Postgres (configurado automaticamente no deploy)
- Sistema de assinaturas manual (sem dependências externas)

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/financeplus.git
cd financeplus
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Banco de Dados - Vercel Postgres (configurado automaticamente no deploy)
# Para desenvolvimento local, configure um PostgreSQL local ou deixe vazio
# POSTGRES_URL=postgresql://username:password@localhost:5432/financeplus

# JWT
JWT_SECRET=sua_chave_secreta_super_forte
JWT_EXPIRES_IN=7d

# Sistema de Assinaturas Manual
# Não requer configurações de pagamento externas

# Email (opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_app
```

### 4. Execute a migração do banco
```bash
npm run migrate
```

### 5. Execute o seed do banco
```bash
node scripts/seed.js
```

### 6. Inicie o servidor
```bash
npm start
```

O sistema estará disponível em `http://localhost:3000`

## 👤 Usuário Root Padrão

Após executar o seed, use estas credenciais para primeiro acesso:

- **Email**: `admin@financeplus.com`
- **Senha**: `Admin123!@#`

⚠️ **IMPORTANTE**: Altere a senha imediatamente após o primeiro login!

## 📚 API Endpoints

### Autenticação
```
POST /api/auth/register     # Registrar usuário
POST /api/auth/login        # Login
POST /api/auth/refresh      # Renovar token
GET  /api/auth/me           # Dados do usuário
POST /api/auth/logout       # Logout
```

### Dashboard
```
GET  /api/dashboard/stats        # Estatísticas gerais
GET  /api/dashboard/accounts     # Contas do usuário
POST /api/dashboard/accounts     # Criar conta
GET  /api/dashboard/transactions # Transações
POST /api/dashboard/transactions # Criar transação
GET  /api/dashboard/categories   # Categorias
GET  /api/dashboard/reports      # Relatórios (Pro+)
GET  /api/dashboard/export       # Exportar dados (Pro+)
GET  /api/dashboard/usage        # Uso do plano
```

### Assinaturas
```
GET  /api/subscriptions/plans                    # Planos disponíveis
GET  /api/subscriptions/current                  # Assinatura atual
POST /api/subscriptions/create-checkout-session  # Criar checkout
POST /api/subscriptions/webhook                  # Webhook Stripe
POST /api/subscriptions/cancel                   # Cancelar assinatura
POST /api/subscriptions/reactivate               # Reativar assinatura
```

### Administração
```
GET  /api/admin/dashboard     # Dashboard admin
GET  /api/admin/users         # Listar usuários
GET  /api/admin/users/:id     # Detalhes do usuário
PUT  /api/admin/users/:id     # Atualizar usuário
DELETE /api/admin/users/:id   # Deletar usuário
GET  /api/admin/subscriptions # Listar assinaturas
PUT  /api/admin/subscriptions/:id # Atualizar assinatura
GET  /api/admin/analytics     # Analytics
```

## 🔧 Sistema de Assinaturas Manual

O sistema agora utiliza **gerenciamento manual de assinaturas** através do painel administrativo:

### 1. Acesso Administrativo
- Faça login com uma conta de administrador
- Acesse o painel admin em `/admin`

### 2. Gerenciar Assinaturas
- Visualize todos os usuários e suas assinaturas
- Altere planos manualmente
- Ative/desative assinaturas
- Monitore uso e limites

### 3. Controle de Acesso
- Limites automáticos por plano
- Bloqueio de funcionalidades premium
- Notificações de limite atingido

## 🚀 Deploy

### Vercel (Configurado e Pronto)
O projeto está **totalmente configurado** para deploy no Vercel:

```bash
# 1. Configure variáveis de ambiente no painel do Vercel
# 2. Faça push para o repositório
git push origin main

# 3. O deploy será automático
```

**📋 Guia completo**: Veja `DEPLOY-VERCEL.md` para instruções detalhadas.

**⚠️ Importante**: 
- Configure MongoDB Atlas (obrigatório)
- Configure todas as variáveis de ambiente
- Execute o seed após o primeiro deploy

### Heroku
```bash
git add .
git commit -m "Deploy FinancePlus"
git push heroku main
```

### Docker
```bash
docker build -t financeplus .
docker run -p 3000:3000 financeplus
```

## 🔒 Segurança

- ✅ Autenticação JWT
- ✅ Rate limiting
- ✅ Helmet.js para headers de segurança
- ✅ Validação de entrada
- ✅ Sanitização de dados
- ✅ CORS configurado
- ✅ Senhas criptografadas com bcrypt

## 📊 Monitoramento

### Logs
```bash
# Ver logs em tempo real
npm run logs

# Ver logs de erro
npm run logs:error
```

### Métricas
- Dashboard admin com analytics
- Uso por plano
- Receita mensal
- Usuários ativos

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

- 📧 Email: suporte@financeplus.com
- 💬 Chat: Disponível no painel
- 📚 Documentação: [docs.financeplus.com](https://docs.financeplus.com)

---

**FinancePlus** - Transformando a gestão financeira pessoal 💰✨