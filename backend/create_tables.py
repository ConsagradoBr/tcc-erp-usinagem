from app import app, db

with app.app_context():
    db.create_all()
    print("✅ Tabelas criadas com sucesso no Supabase!")
    print("Banco conectado perfeitamente da nuvem!")
    print("AMP Usinagem Industrial está pronto!")