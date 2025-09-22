# Configuração do Banco Neon

## Como configurar o banco de dados Neon

1. **Acesse seu projeto no Neon**: https://console.neon.tech/
2. **Encontre a string de conexão** do seu banco `financeplus-db`
3. **Copie a URL de conexão** que deve ter o formato:
   ```
   postgresql://financeplus-db_owner:sua_senha@seu_host.neon.tech/financeplus-db?sslmode=require
   ```

4. **Edite o arquivo `.env`** na raiz do projeto:
   ```bash
   # Descomente e substitua pela sua URL real:
   DATABASE_URL=postgresql://financeplus-db_owner:sua_senha@seu_host.neon.tech/financeplus-db?sslmode=require
   
   # Porta do servidor
   PORT=3001
   ```

## Como funciona a integração híbrida

### Sem banco configurado (atual):
- ✅ Sistema funciona 100% com localStorage
- ✅ Todos os dados ficam no navegador
- ✅ Login e registro funcionam normalmente

### Com banco configurado:
- ✅ Usuários e assinaturas salvos no banco Neon
- ✅ Dados financeiros continuam no localStorage
- ✅ Controle de assinaturas centralizado
- ✅ Fallback automático para localStorage se API falhar

## Comandos para desenvolvimento

```bash
# Servidor frontend (porta 8000) - APENAS LOCAL
npm run local

# Servidor backend + frontend (porta 3000) - APENAS LOCAL  
npm start

# Apenas desenvolvimento frontend
npm run dev
```

## Deploy na Vercel

### ✅ O que funciona na Vercel:
- Frontend estático (HTML, CSS, JS)
- API backend Node.js (serverless functions)
- Banco de dados Neon (PostgreSQL)

### ❌ O que NÃO funciona na Vercel:
- Servidor Python (`python -m http.server`)
- Servidores que ficam sempre rodando

### Como fazer deploy:
1. **Configure o banco Neon** no arquivo `.env` ou nas variáveis de ambiente da Vercel
2. **Faça push para o GitHub**
3. **Conecte o repositório na Vercel**
4. **A Vercel automaticamente:**
   - Serve o `index.html` como frontend
   - Roda as APIs Node.js em `/api/*` como serverless functions
   - Conecta com o banco Neon

### Estrutura no deploy:
- **Frontend**: `https://seu-projeto.vercel.app/` 
- **API**: `https://seu-projeto.vercel.app/api/login`, `/api/register`, etc.
- **Banco**: Neon PostgreSQL (sempre ativo)

## Estrutura da tabela de usuários

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    subscription_type VARCHAR(50) DEFAULT 'free',
    subscription_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Endpoints da API

- `POST /api/register` - Registrar usuário
- `POST /api/login` - Fazer login
- `GET /api/subscription/:email` - Verificar assinatura
- `PUT /api/subscription/:email` - Atualizar assinatura
- `GET /api/health` - Status da API

## Vantagens da implementação

1. **Zero breaking changes**: Tudo continua funcionando como antes
2. **Gradual migration**: Pode ativar o banco quando quiser
3. **Fallback robusto**: Se API falhar, usa localStorage
4. **Subscription control**: Controle centralizado de assinaturas
5. **Scalable**: Preparado para crescer com mais usuários