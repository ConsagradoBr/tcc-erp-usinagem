# ⚙️ AMP — ERP para Usinagem  
Sistema ERP web completo desenvolvido como Trabalho de Conclusão de Curso (TCC), voltado para empresas de usinagem de pequeno e médio porte.  
O sistema integra módulos essenciais como: **Ordens de Serviço, Clientes, Financeiro, Estoque, Notas Fiscais e Dashboard em tempo real**.

---

## 📌 **Visão Geral**
O objetivo deste projeto é centralizar a operação de uma oficina de usinagem em um único sistema moderno, responsivo e acessível via navegador.  
O ERP foi construído utilizando **React + Vite no frontend** e **Flask + SQLite/PostgreSQL no backend**, com autenticação via **JWT**.

---

## 🚀 **Tecnologias Utilizadas**

### **Frontend**
- React 18  
- Vite  
- React Router DOM  
- Tailwind CSS  
- Axios  
- Heroicons  
- Context API (estado global)  

### **Backend**
- Python 3  
- Flask  
- Flask-JWT-Extended  
- SQLAlchemy  
- SQLite (ambiente local)  
- PostgreSQL (produção)  

### **Outras tecnologias**
- JWT Authentication  
- Flexbox & Grid  
- ESLint  
- Scripts .BAT para execução rápida  

---

## 📂 **Estrutura do Projeto**

amp-usinagem-project/
│── backend/
│ ├── app.py
│ ├── requirements.txt
│ ├── env.example
│ ├── instance/
│ │ └── usinagem.db (SQLite)
│
│── public/
│── src/
│ ├── App.jsx
│ ├── api.js
│ ├── pages/
│ ├── components/
│ ├── assets/
│
│── index.html
│── package.json
│── .gitignore
│── README.md


---

# 🔐 **Variáveis de Ambiente**
Crie o arquivo: backend/.env

ou use o exemplo: backend/env.example


Variáveis necessárias:

FLASK_ENV=development
SECRET_KEY=sua_chave_secreta
JWT_SECRET_KEY=chave_jwt_aqui

DATABASE_URL=postgresql://usuario:senha@host:porta/banco


---

# 🖥️ **Como Rodar o Projeto**

## 📌 Backend (Flask)

### 1. Criar ambiente virtual
  cd backend
  python -m venv .venv

### 2. Ativar ambiente  
**Windows:**
  .venv\Scripts\activate

### 3. Instalar dependências
  pip install -r requirements.txt

### 4. Rodar a API
  flask run


A API será iniciada em: http://127.0.0.1:5000


---

## 🌐 Frontend (React + Vite)

### 1. Instalar dependências
Na raiz do projeto:
  
  npm install

### 2. Rodar em modo desenvolvimento
npm run dev


A aplicação abrirá em: http://localhost:5173


---

# 📊 **Funcionalidades Principais**

### 🔐 Autenticação
- Login seguro com JWT  
- Proteção de rotas  
- Sessão com expiração  

### 🧾 Ordens de Serviço
- Criar / editar / excluir OS  
- Status: Aberto → Em Andamento → Concluído  
- Vínculo com cliente  
- Upload de Nota Fiscal (PDF)  

### 👥 Clientes
- Cadastro completo  
- Histórico de serviços  
- Busca avançada  

### 💰 Financeiro
- Contas a pagar / receber  
- Relatórios mensais  
- Gráficos integrados  

### 🛠️ Estoque
- Ferramentas e insumos  
- Controle de estoque mínimo  
- Alertas automáticos  

### 📥 Notas Fiscais
- Upload  
- Download  
- Associação automática à OS  

### 📊 Dashboard
- Faturamento  
- OS em aberto  
- Alertas  
- Indicadores  

---

# 📦 **Build de Produção (Frontend)**

  npm run build

Os arquivos serão gerados em: dist/


---

# ☁️ **Deploy (Sugerido)**

## Frontend → **Vercel**
- Subir somente pasta raiz do frontend  
- Framework selecionado: `Vite`  
- Deploy automático vinculado ao GitHub  

## Backend → **Railway / Render**
- Deploy Docker ou Python nativo  
- Variáveis de ambiente configuradas  
- Banco PostgreSQL recomendado  

## Banco de Dados → **Neon / Supabase**
- PostgreSQL gerenciado e gratuito  
- Excelente para TCC e demos  

---

# 📘 **Requisitos para Apresentação (TCC)**

A banca verificará:
- Dashboard funcional  
- Cadastro e manipulação de OS  
- Upload e exibição de PDFs  
- Dados reais no banco  
- Código versionado no GitHub  
- Documentação completa (Incluindo ER e fluxogramas)  
- Responsividade  

---

# 🧭 **Roadmap Futuro**
- Controle de máquinas CNC  
- Multiusuários com níveis de acesso  
- Notificações em tempo real (WebSocket)  
- Relatório OEE completo  
- Integração com NF-e (SEFAZ)  
- Aplicativo mobile (React Native)  

---

# 👨‍💻 **Autores**
**Quesede Constantino**  
Desenvolvedor Fullstack | Projeto de TCC – ERP para Usinagem

---

# ⭐ **Se este projeto te ajudou, deixe uma estrela no repositório!**







