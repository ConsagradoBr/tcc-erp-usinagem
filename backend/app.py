import os
import traceback
from urllib.parse import quote_plus
from flask import Flask, Blueprint, request, jsonify
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

db_user = os.getenv("DB_USER")
db_pass = os.getenv("DB_PASS")
db_host = os.getenv("DB_HOST", "localhost")
db_port = os.getenv("DB_PORT", "5432")
db_name = os.getenv("DB_NAME", "postgres")

# -------------------------------
# BANCO DE DADOS POSTGRES (Session Pooler - IPv4)
# -------------------------------

app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"postgresql+psycopg2://{quote_plus(db_user)}:{quote_plus(db_pass)}@{db_host}:{db_port}/{db_name}"
    f"?sslmode=require"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_pre_ping": True,
    "pool_recycle": 300,
    "connect_args": {
        "sslmode": "require",
        "connect_timeout": 10,
    }
}

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
# BLUEPRINT: /auth
# (espelha as chamadas do AuthPage.jsx)
# -------------------------------

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

# POST /auth/usuarios — Cadastro
@auth_bp.route("/usuarios", methods=["POST"])
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

# POST /auth/login — Login
@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        email = data.get("email", "").strip().lower()
        senha = data.get("senha", "").strip()

        usuario = Usuario.query.filter_by(email=email).first()

        if not usuario or not usuario.check_password(senha):
            return jsonify({"erro": "Credenciais inválidas."}), 401

        token = create_access_token(
            identity={"id": usuario.id, "nome": usuario.nome, "email": usuario.email}
        )

        return jsonify({
            "mensagem": "Login bem-sucedido!",
            "token": token,
            "user": {
                "id": usuario.id,
                "nome": usuario.nome,
                "email": usuario.email
            }
        }), 200

    except Exception as e:
        logging.error(f"❌ Erro no login: {e}")
        return jsonify({"erro": "Erro interno no login."}), 500

# GET /auth/perfil — Rota protegida por JWT
@auth_bp.route("/perfil", methods=["GET"])
@jwt_required()
def perfil():
    usuario = get_jwt_identity()
    return jsonify({"mensagem": "Bem-vindo(a)!", "usuario": usuario}), 200

# -------------------------------
# REGISTRO DO BLUEPRINT
# -------------------------------

app.register_blueprint(auth_bp)

# -------------------------------
# HANDLER DE ERROS GLOBAIS
# -------------------------------

@app.errorhandler(Exception)
def handle_exception(e):
    print("\n" + "="*80)
    print("🚨 ERRO 500 DETECTADO NO BACKEND - TRACEBACK COMPLETO")
    print("="*80)
    print(traceback.format_exc())
    print("="*80 + "\n")
    return {"error": "Erro interno do servidor"}, 500

# -------------------------------
# INÍCIO DO SERVIDOR
# -------------------------------

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)