# 🚀 Deploy FinancePlus SaaS no Vercel

## ✅ Configuração Atualizada

A estrutura do projeto foi **atualizada** para funcionar corretamente no Vercel com:

- ✅ Serverless functions configuradas
- ✅ Roteamento API correto
- ✅ Headers de segurança
- ✅ CORS configurado
- ✅ Estrutura híbrida (frontend + backend)

## 📋 Pré-requisitos

### 1. MongoDB Atlas (Obrigatório)
Como o Vercel não suporta MongoDB local, você precisa:

```bash
# 1. Acesse https://cloud.mongodb.com
# 2. Crie um cluster gratuito
# 3. Configure usuário e senha
# 4. Obtenha a string de conexão
# Exemplo: mongodb+srv://usuario:senha@cluster.mongodb.net/financeplus
```

### 2. Conta Stripe
```bash
# 1. Acesse https://stripe.com
# 2. Crie conta e obtenha as chaves
# 3. Configure webhook para: https://seudominio.vercel.app/api/subscriptions/webhook
```

## 🔧 Configuração no Vercel

### 1. Variáveis de Ambiente
No painel do Vercel, adicione estas variáveis:

```env
# Banco de dados
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/financeplus

# JWT
JWT_SECRET=sua_chave_secreta_super_forte_producao
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=sua_refresh_secret_producao
JWT_REFRESH_EXPIRES_IN=30d

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_sua_chave_publica
STRIPE_SECRET_KEY=sk_live_sua_chave_secreta
STRIPE_WEBHOOK_SECRET=whsec_sua_webhook_secret

# Email
EMAIL_FROM=noreply@seudominio.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_app

# URLs (substitua pelo seu domínio)
FRONTEND_URL=https://seudominio.vercel.app
BASE_URL=https://seudominio.vercel.app
API_URL=https://seudominio.vercel.app/api

# Segurança
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Features
ENABLE_REGISTRATION=true
ENABLE_EMAIL_VERIFICATION=false
ENABLE_PASSWORD_RESET=true

# Planos
PLAN_FREE_PRICE=0
PLAN_PRO_PRICE=2990
PLAN_ENTERPRISE_PRICE=9990
```

### 2. Deploy
```bash
# Fazer commit das mudanças
git add .
git commit -m "Configuração para Vercel"
git push origin main

# O Vercel fará deploy automaticamente
```

## 🗄️ Configurar Banco de Dados

### 1. Executar Seed Remotamente
Após o deploy, execute o seed:

```bash
# Opção 1: Localmente apontando para produção
MONGODB_URI="sua_string_producao" node scripts/seed.js

# Opção 2: Criar endpoint temporário
# Adicione rota em routes/admin.js:
# GET /api/admin/seed (apenas para admin)
```

### 2. Usuário Root
Após o seed, use:
- **Email**: `admin@financeplus.com`
- **Senha**: `Admin123!@#`

## 🔗 Estrutura de URLs

### Frontend
```
https://seudominio.vercel.app/          # Dashboard
https://seudominio.vercel.app/login     # Login
https://seudominio.vercel.app/register  # Registro
```

### API
```
https://seudominio.vercel.app/api/auth/login        # Login
https://seudominio.vercel.app/api/dashboard/stats   # Dashboard
https://seudominio.vercel.app/api/admin/dashboard   # Admin
```

## 🔧 Configurações Específicas

### 1. Webhook Stripe
Configure no Stripe Dashboard:
```
URL: https://seudominio.vercel.app/api/subscriptions/webhook
Eventos: checkout.session.completed, invoice.payment_succeeded, etc.
```

### 2. CORS
Já configurado para aceitar requisições do seu domínio.

### 3. Rate Limiting
Configurado para 100 requests por 15 minutos por IP.

## 🚨 Limitações do Vercel

### 1. Tempo de Execução
- Máximo 10 segundos por função (plano gratuito)
- Máximo 60 segundos (plano pro)

### 2. Memória
- 1024MB máximo por função

### 3. Banco de Dados
- Não suporta MongoDB local
- Use MongoDB Atlas ou outro serviço

## 🔍 Troubleshooting

### Erro de Conexão MongoDB
```bash
# Verifique se:
1. String de conexão está correta
2. IP está liberado no MongoDB Atlas (0.0.0.0/0 para Vercel)
3. Usuário tem permissões corretas
```

### Erro 500 nas APIs
```bash
# Verifique:
1. Variáveis de ambiente configuradas
2. Logs no painel do Vercel
3. Dependências instaladas corretamente
```

### Webhook Stripe não funciona
```bash
# Verifique:
1. URL do webhook está correta
2. Secret do webhook configurado
3. Eventos selecionados corretamente
```

## ✅ Checklist Final

- [ ] MongoDB Atlas configurado
- [ ] Variáveis de ambiente no Vercel
- [ ] Deploy realizado com sucesso
- [ ] Seed executado
- [ ] Login com usuário root funcionando
- [ ] Webhook Stripe configurado
- [ ] Pagamentos testados
- [ ] Domínio personalizado (opcional)

## 🎯 Próximos Passos

1. **Teste completo** do sistema em produção
2. **Configure domínio personalizado** (opcional)
3. **Configure SSL** (automático no Vercel)
4. **Monitore logs** e performance
5. **Configure backup** do MongoDB Atlas

---

**Seu FinancePlus SaaS está pronto para produção! 🚀**