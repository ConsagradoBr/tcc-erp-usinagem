from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from backend.extensions import db
from backend.models import Usuario

PERFIS_SISTEMA = {
    "administrador": {
        "label": "Administrador",
        "permissoes": [
            "dashboard",
            "clientes",
            "financeiro",
            "ordens_servico",
            "orcamentos",
            "backup",
            "usuarios",
        ],
    },
    "financeiro": {
        "label": "Financeiro",
        "permissoes": ["dashboard", "clientes", "financeiro"],
    },
    "producao": {
        "label": "Produção",
        "permissoes": ["dashboard", "ordens_servico"],
    },
    "comercial": {
        "label": "Comercial",
        "permissoes": ["dashboard", "clientes", "orcamentos"],
    },
}


def normalizar_perfil(perfil):
    perfil_normalizado = (perfil or "").strip().lower()
    return perfil_normalizado if perfil_normalizado in PERFIS_SISTEMA else None


def permissoes_do_perfil(perfil):
    perfil_normalizado = normalizar_perfil(perfil) or "comercial"
    return list(PERFIS_SISTEMA[perfil_normalizado]["permissoes"])


def serializar_usuario(usuario):
    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "perfil": usuario.perfil,
        "perfil_label": PERFIS_SISTEMA.get(usuario.perfil, PERFIS_SISTEMA["comercial"])["label"],
        "ativo": bool(usuario.ativo),
        "permissoes": permissoes_do_perfil(usuario.perfil),
    }


def usuario_tem_permissoes(usuario, *permissoes):
    if not usuario or not usuario.ativo:
        return False
    permissoes_usuario = set(permissoes_do_perfil(usuario.perfil))
    return all(permissao in permissoes_usuario for permissao in permissoes)


def get_current_usuario():
    identidade = get_jwt_identity()
    if not identidade:
        return None
    try:
        return db.session.get(Usuario, int(identidade))
    except (TypeError, ValueError):
        return None


def require_permissions(*permissoes):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            usuario = get_current_usuario()
            if not usuario:
                return jsonify({"erro": "Usuário não encontrado."}), 401
            if not usuario.ativo:
                return jsonify({"erro": "Usuário desativado. Procure um administrador do sistema."}), 403
            if permissoes and not usuario_tem_permissoes(usuario, *permissoes):
                return jsonify({"erro": "Você não tem permissão para acessar este recurso."}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
