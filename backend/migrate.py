"""Migração leve para bancos existentes sem Alembic.

Atualmente garante as colunas de parcelamento em lancamentos. A factory tambem
executa migracoes defensivas de usuarios/clientes ao iniciar a aplicacao.
"""

import sys
from pathlib import Path

from sqlalchemy import inspect, text

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.extensions import db
from backend.factory import create_app

COLUNAS_LANCAMENTOS = {
    "parcelas": "INTEGER DEFAULT 1",
    "parcela_num": "INTEGER DEFAULT 1",
}


def garantir_colunas_lancamentos():
    inspector = inspect(db.engine)
    if "lancamentos" not in inspector.get_table_names():
        print("Tabela lancamentos nao existe; execute create_tables.py primeiro.")
        return

    existentes = {coluna["name"] for coluna in inspector.get_columns("lancamentos")}
    adicionadas = []
    for coluna, tipo in COLUNAS_LANCAMENTOS.items():
        if coluna in existentes:
            continue
        db.session.execute(text(f"ALTER TABLE lancamentos ADD COLUMN {coluna} {tipo}"))
        adicionadas.append(coluna)

    if adicionadas:
        db.session.commit()
        print("Colunas adicionadas: " + ", ".join(adicionadas))
    else:
        print("Schema ja estava atualizado.")


def main():
    app = create_app()
    with app.app_context():
        garantir_colunas_lancamentos()


if __name__ == "__main__":
    main()
