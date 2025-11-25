import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
from dotenv import load_dotenv
import logging

# -------------------------------
# CONFIGURAÇÃO INICIAL
# -------------------------------

load_dotenv()

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# -------------------------------
# VARIÁVEIS DE AMBIENTE
# -------------------------------

user = os.getenv("DB_USER")
password = os.getenv("DB_PASS")
host = os.getenv("DB_HOST", "localhost")
port = os.getenv("DB_PORT", "5432")
dbname = os.getenv("DB_NAME", "amp_usinagem")

# -------------------------------
# BANCO DE DADOS POSTGRES
# -------------------------------

app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"
)

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# -------------------------------
# JWT
# -------------------------------

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "chave_jwt_segura")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)

jwt = JWTManager(app)
db = SQLAlchemy(app)

# -------------------------------
# MODELO DE USUÁRIO
# -------------------------------

class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    senha_hash = db.Column(db.String(255), nullable=False)

    def set_password(self, senha):
        self.senha_hash = generate_password_hash(senha)

    def check_password(self, senha):
        return check_password_hash(self.senha_hash, senha)

# -------------------------------
# CRIAR TABELAS AUTOMATICAMENTE
# -------------------------------

with app.app_context():
    try:
        db.create_all()
        logging.info("✅ Tabelas verificadas/criadas.")
    except Exception as e:
        logging.error(f"❌ Erro ao criar tabelas: {e}")

# -------------------------------
# ROTA: CRIAR USUÁRIO
# -------------------------------

@app.route("/usuarios", methods=["POST"])
def criar_usuario():
    try:
        data = request.get_json()

        nome = data.get("nome", "").strip()
        email = data.get("email", "").strip().lower()
        senha = data.get("senha", "").strip()

        if not nome or not email or not senha:
            return jsonify({"erro": "Campos obrigatórios ausentes."}), 400

        if Usuario.query.filter_by(email=email).first():
            return jsonify({"erro": "Usuário já existe."}), 400

        novo = Usuario(nome=nome, email=email)
        novo.set_password(senha)
        db.session.add(novo)
        db.session.commit()

        return jsonify({"mensagem": "Usuário criado com sucesso!"}), 201

    except Exception as e:
        logging.error(f"❌ Erro ao criar usuário: {e}")
        return jsonify({"erro": "Erro interno ao criar usuário."}), 500

# -------------------------------
# ROTA: LOGIN
# -------------------------------

@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        email = data.get("email", "").strip().lower()
        senha = data.get("senha", "").strip()

        user = Usuario.query.filter_by(email=email).first()

        if not user or not user.check_password(senha):
            return jsonify({"erro": "Credenciais inválidas."}), 401

        token = create_access_token(
            identity={"id": user.id, "nome": user.nome, "email": user.email}
        )

        return jsonify({
            "mensagem": "Login bem-sucedido!",
            "token": token,
            "user": {
                "id": user.id,
                "nome": user.nome,
                "email": user.email
            }
        }), 200

    except Exception as e:
        logging.error(f"❌ Erro no login: {e}")
        return jsonify({"erro": "Erro interno no login."}), 500

# -------------------------------
# ROTA PROTEGIDA
# -------------------------------

@app.route("/perfil", methods=["GET"])
@jwt_required()
def perfil():
    usuario = get_jwt_identity()
    return jsonify({"mensagem": "Bem-vindo(a)!", "usuario": usuario}), 200

# -------------------------------
# INÍCIO DO SERVIDOR
# -------------------------------

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
