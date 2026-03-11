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

*Nota: Todas as pastas do repositório local (`e:\Desenvolvimento\Nextfy`) já foram curadas e higienizadas pelo script inicial.*
