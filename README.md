# Nextfy Marketing App

Este é o repositório principal do sistema web Nextfy, contendo tanto o frontend corporativo em React (Vite) quanto a API RESTful backend em Node.js (Express) com suporte ao banco Supabase.

## 🛠️ Como Instalar e Rodar o Projeto

Como o repositório é versionado **sem** a pasta pesada `node_modules`, você ou os membros da sua equipe precisarão baixar as bibliotecas locais sempre que clonarem o projeto.

### 1. Iniciar o Backend
Abra um terminal, acesse a pasta `backend/` e instale as dependências:
```bash
cd backend
npm install
```
E então inicie o servidor:
```bash
node server.js
# ou: npm start
```

### 2. Iniciar o Frontend
Em um **segundo terminal paralelo**, acesse a pasta `frontend/`, baixe as dependências e inicie o site:
```bash
cd frontend
npm install
npm run dev
```

## 🔄 Fluxo de Versionamento (Git)

As pastas como `node_modules`, `dist` (builds) e arquivos `.env` ou logs são pesadas e contêm informações sigilosas, por este motivo o arquivo `.gitignore` base do projeto se encarrega de ignorá-las preventivamente.

Para publicar suas atualizações de código fonte na nuvem:

1. **Adicione os arquivos com as suas alterações:**
   ```bash
   git add .
   ```
2. **Faça o commit descrevendo a sua mudança:**
   ```bash
   git commit -m "Explicativo da modificacao que voce fez"
   ```
3. **Envie para o repositório remoto:**
   ```bash
   git push origin main
   ```

---

## 🚀 Deploy Automático (CI/CD)
O repositório já está 100% configurado para **Deploy Automático** em plataformas modernas (Render, Railway, Vercel). Basta você fazer os commits (`git push`) e a plataforma fará o resto.

### Requisitos Atendidos:
- ✅ `package.json` na raiz com scripts (`build` e `start`).
- ✅ `node_modules` ignorados pelo `.gitignore`.
- ✅ Backend configurado em `process.env.PORT || 3000`.
- ✅ Geração nativa e transparente de builds.

### Como configurar o Deploy no Render / Railway:
1. Faça login na plataforma ([Render](https://render.com) ou [Railway](https://railway.app)).
2. Clique em **"New Web Service"** e conecte seu repositório do GitHub com este código.
3. O painel irá detectar o aplicativo como "Node.js" automaticamente por conta do `package.json` raiz.
4. Em **Build Command**, insira:
   ```bash
   npm run build
   ```
5. Em **Start Command**, insira:
   ```bash
   npm start
   ```
6. **[MUITO IMPORTANTE]** Vá na aba "Environment Variables" (Variáveis de Ambiente) e preencha o que está no arquivo `backend/.env.example`:
   - `DATABASE_URL`: A URL do seu Supabase.
   - `JWT_SECRET`: Uma senha forte qualquer (ex: uma frase secreta).
7. Clique em "Deploy"!

Agora o fluxo ficará: `Você faz alterações no PC -> git add . -> git commit -m "bla" -> git push` e o servidor será reinicializado magicamente na nuvem! ✨

*Nota: Todas as pastas do repositório local (`e:\Desenvolvimento\Nextfy`) já foram curadas e higienizadas pelo script inicial.
