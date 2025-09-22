# Deploy na Vercel - Sistema Financeiro

## 📋 Pré-requisitos

1. Conta na [Vercel](https://vercel.com)
2. Repositório Git (GitHub, GitLab ou Bitbucket)

## 🚀 Passos para Deploy

### 1. Preparar o Repositório
```bash
git init
git add .
git commit -m "Initial commit - Sistema Financeiro"
git branch -M main
git remote add origin https://github.com/seu-usuario/web-financial.git
git push -u origin main
```

### 2. Configurar Variáveis de Ambiente (Opcional)

Se quiser usar o banco Neon em produção:
1. No dashboard da Vercel, vá em "Settings" > "Environment Variables"
2. Adicione:
   - `DATABASE_URL`: sua string de conexão do Neon
   - `PORT`: 3001

### 3. Deploy na Vercel

#### Opção A: Via Dashboard Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Clique em "New Project"
3. Conecte seu repositório GitHub
4. Selecione o repositório `web-financial`
5. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: ./
   - **Build Command**: `npm install`
   - **Output Directory**: ./
6. Clique em "Deploy"

#### Opção B: Via CLI Vercel
```bash
npm i -g vercel
vercel login
vercel --prod
```

### 3. Configurações Automáticas

O arquivo `vercel.json` já está configurado com:
- ✅ Roteamento para SPA
- ✅ Headers de segurança
- ✅ Content Security Policy
- ✅ Proteção XSS
- ✅ Proteção contra clickjacking

## 🔒 Recursos de Segurança Implementados

### Bloqueio de DevTools
- ❌ F12 (DevTools)
- ❌ Ctrl+Shift+I (Inspetor)
- ❌ Ctrl+Shift+J (Console)
- ❌ Ctrl+U (View Source)
- ❌ Ctrl+Shift+C (Seletor)
- ❌ Botão direito (Context Menu)
- ❌ Seleção de texto
- ❌ Arrastar elementos
- ❌ Detecção de abertura do console

### Headers de Segurança
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` configurado

## 🌐 URLs Após Deploy

- **Produção**: `https://seu-projeto.vercel.app`
- **Preview**: URLs automáticas para cada commit
- **Desenvolvimento**: `http://localhost:3000`

## 📁 Estrutura de Arquivos

```
web-financial/
├── index.html          # Arquivo principal (renomeado)
├── vercel.json         # Configurações Vercel
├── package.json        # Dependências e scripts
├── DEPLOY.md          # Este arquivo
├── README.md          # Documentação original
└── .gitignore         # Arquivos ignorados
```

## 🔧 Scripts Disponíveis

```bash
npm run dev      # Servidor local
npm run start    # Servidor local
npm run preview  # Preview local
npm run build    # Build (apenas echo)
```

## ⚠️ Notas Importantes

1. **Arquivo Principal**: Renomeado de `Financas_Pessoais.html` para `index.html`
2. **Proteção DevTools**: Ativa em produção - pode interferir no desenvolvimento
3. **CDNs**: Todos os recursos externos estão configurados no CSP
4. **Dados**: Sistema usa localStorage - dados ficam no navegador do usuário
5. **Responsivo**: Interface adaptada para mobile e desktop

## 🐛 Troubleshooting

### Erro de CSP
Se houver erros de Content Security Policy, verifique o `vercel.json` e adicione os domínios necessários.

### Proteção DevTools Muito Restritiva
Para desenvolvimento, comente temporariamente o script de proteção no `index.html`.

### Problemas de Roteamento
O `vercel.json` está configurado para SPA - todas as rotas redirecionam para `index.html`.

## 📞 Suporte

Para problemas específicos do deploy, consulte:
- [Documentação Vercel](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)