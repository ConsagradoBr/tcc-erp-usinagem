import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, verify_jwt_in_request
from flask_jwt_extended.exceptions import JWTExtendedException

from backend.extensions import db
from backend.models import Usuario
from backend.security import (PERFIS_SISTEMA, get_current_usuario,
                              normalizar_perfil, require_permissions,
                              serializar_usuario, usuario_tem_permissoes)

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


def _payload_json():
    return request.get_json() or {}


def _coerce_bool(value, default=True):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "sim", "yes", "on"}
    return bool(value)


def _validar_campos_usuario(data, permitir_senha_vazia=False):
    nome = (data.get("nome") or "").strip()
    email = (data.get("email") or "").strip().lower()
    senha = (data.get("senha") or "").strip()
    if not nome or not email:
        return (
            None,
            None,
            None,
            (jsonify({"erro": "Nome e e-mail sao obrigatorios."}), 400),
        )
    if not permitir_senha_vazia and not senha:
        return None, None, None, (jsonify({"erro": "Senha e obrigatoria."}), 400)
    return nome, email, senha, None


def _contar_administradores_ativos(excluir_id=None):
    query = Usuario.query.filter_by(perfil="administrador", ativo=True)
    if excluir_id is not None:
        query = query.filter(Usuario.id != excluir_id)
    return query.count()


@auth_bp.route("/bootstrap-status", methods=["GET"])
def bootstrap_status():
    return jsonify({"bootstrap_required": Usuario.query.count() == 0}), 200


@auth_bp.route("/usuarios", methods=["POST"])
def criar_usuario():
    try:
        data = _payload_json()
        nome, email, senha, erro = _validar_campos_usuario(data)
        if erro:
            return erro
        if Usuario.query.filter_by(email=email).first():
            return jsonify({"erro": "Usuario ja existe."}), 400

        if Usuario.query.count() == 0:
            novo = Usuario(nome=nome, email=email, perfil="administrador", ativo=True)
            novo.set_password(senha)
            db.session.add(novo)
            db.session.commit()
            return (
                jsonify(
                    {
                        "mensagem": "Usuario administrador inicial criado com sucesso!",
                        "user": serializar_usuario(novo),
                    }
                ),
                201,
            )

        try:
            verify_jwt_in_request()
        except JWTExtendedException as exc:
            return jsonify({"erro": str(exc)}), 401

        usuario_atual = get_current_usuario()
        if not usuario_tem_permissoes(usuario_atual, "usuarios"):
            return (
                jsonify({"erro": "Apenas administradores podem criar novos usuarios."}),
                403,
            )

        perfil = normalizar_perfil(data.get("perfil"))
        if not perfil:
            return jsonify({"erro": "Perfil invalido."}), 400

        novo = Usuario(
            nome=nome,
            email=email,
            perfil=perfil,
            ativo=_coerce_bool(data.get("ativo"), default=True),
        )
        novo.set_password(senha)
        db.session.add(novo)
        db.session.commit()
        return (
            jsonify(
                {
                    "mensagem": "Usuario criado com sucesso!",
                    "user": serializar_usuario(novo),
                }
            ),
            201,
        )
    except Exception as exc:
        logging.error(f"Erro ao criar usuario: {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@auth_bp.route("/usuarios", methods=["GET"])
@require_permissions("usuarios")
def listar_usuarios():
    usuarios = Usuario.query.order_by(Usuario.nome.asc()).all()
    return jsonify([serializar_usuario(usuario) for usuario in usuarios]), 200


@auth_bp.route("/usuarios/<int:usuario_id>", methods=["PUT"])
@require_permissions("usuarios")
def editar_usuario(usuario_id):
    try:
        usuario = db.session.get(Usuario, usuario_id)
        if not usuario:
            return jsonify({"erro": "Usuario nao encontrado."}), 404

        data = _payload_json()
        if "nome" in data:
            nome = (data.get("nome") or "").strip()
            if not nome:
                return jsonify({"erro": "Nome e obrigatorio."}), 400
            usuario.nome = nome

        if "email" in data:
            email = (data.get("email") or "").strip().lower()
            if not email:
                return jsonify({"erro": "E-mail e obrigatorio."}), 400
            outro = Usuario.query.filter(
                Usuario.email == email, Usuario.id != usuario.id
            ).first()
            if outro:
                return (
                    jsonify({"erro": "Ja existe outro usuario com este e-mail."}),
                    400,
                )
            usuario.email = email

        novo_perfil = usuario.perfil
        if "perfil" in data:
            perfil = normalizar_perfil(data.get("perfil"))
            if not perfil:
                return jsonify({"erro": "Perfil invalido."}), 400
            novo_perfil = perfil

        novo_ativo = usuario.ativo
        if "ativo" in data:
            novo_ativo = _coerce_bool(data.get("ativo"), default=usuario.ativo)

        if (
            (novo_perfil != "administrador" or not novo_ativo)
            and usuario.perfil == "administrador"
            and usuario.ativo
            and _contar_administradores_ativos(excluir_id=usuario.id) == 0
        ):
            msg = "O sistema precisa manter pelo menos um administrador " "ativo."
            return jsonify({"erro": msg}), 400

        usuario.perfil = novo_perfil
        usuario.ativo = novo_ativo

        senha = (data.get("senha") or "").strip()
        if senha:
            usuario.set_password(senha)

        db.session.commit()
        return (
            jsonify(
                {
                    "mensagem": "Usuario atualizado com sucesso!",
                    "user": serializar_usuario(usuario),
                }
            ),
            200,
        )
    except Exception as exc:
        logging.error(f"Erro ao editar usuario: {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@auth_bp.route("/perfis", methods=["GET"])
@require_permissions("usuarios")
def listar_perfis():
    return (
        jsonify(
            [
                {
                    "id": perfil,
                    "label": dados["label"],
                    "permissoes": dados["permissoes"],
                }
                for perfil, dados in PERFIS_SISTEMA.items()
            ]
        ),
        200,
    )


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = _payload_json()
        email = (data.get("email") or "").strip().lower()
        senha = (data.get("senha") or "").strip()
        usuario = Usuario.query.filter_by(email=email).first()
        if not usuario or not usuario.check_password(senha):
            return jsonify({"erro": "Credenciais invalidas."}), 401
        if not usuario.ativo:
            return (
                jsonify(
                    {"erro": "Usuario desativado. Procure um administrador do sistema."}
                ),
                403,
            )
        user_payload = serializar_usuario(usuario)
        token = create_access_token(
            identity=str(usuario.id),
            additional_claims={
                "nome": usuario.nome,
                "email": usuario.email,
                "perfil": usuario.perfil,
                "permissoes": user_payload["permissoes"],
            },
        )
        return (
            jsonify(
                {
                    "mensagem": "Login bem-sucedido!",
                    "token": token,
                    "user": user_payload,
                }
            ),
            200,
        )
    except Exception as exc:
        logging.error(f"Erro no login: {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@auth_bp.route("/perfil", methods=["GET"])
@require_permissions()
def perfil():
    usuario = get_current_usuario()
    return (
        jsonify({"mensagem": "Bem-vindo(a)!", "user": serializar_usuario(usuario)}),
        200,
    )
