"""
Migration: adiciona colunas parcelas e parcela_num na tabela lancamentos
Execute uma vez: python migrate.py
"""
from app import app, db

SQL = """
ALTER TABLE lancamentos
    ADD COLUMN IF NOT EXISTS parcelas    INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS parcela_num INTEGER DEFAULT 1;
"""

with app.app_context():
    try:
        db.session.execute(db.text(SQL))
        db.session.commit()
        print("✅ Colunas adicionadas com sucesso!")
        print("   - lancamentos.parcelas")
        print("   - lancamentos.parcela_num")
    except Exception as e:
        db.session.rollback()
        print(f"❌ Erro: {e}")