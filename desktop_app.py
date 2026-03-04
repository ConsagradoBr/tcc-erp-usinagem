import os
import sys
import webbrowser
from threading import Thread
import time
from waitress import serve
from flask import send_from_directory

# Importa o Flask com todas as rotas de API
from backend.app import app as flask_app

# Configuração de caminho (funciona no terminal E no .exe)
if getattr(sys, 'frozen', False):
    base_path = sys._MEIPASS
else:
    base_path = os.path.dirname(os.path.abspath(__file__))

dist_path = os.path.join(base_path, 'dist')

# === ROTAS DO FRONTEND (SPA) - vem DEPOIS das rotas de API ===
@flask_app.route('/', defaults={'path': ''})
@flask_app.route('/<path:path>')
def serve_spa(path):
    # Deixa as rotas da API passarem (não intercepta /login, /usuarios, etc)
    if path.startswith(('login', 'usuarios', 'api', 'auth', 'static')):
        return flask_app.send_static_file('index.html')  # fallback para SPA

    # Serve arquivos estáticos (js, css, imagens) se existirem
    try:
        return send_from_directory(dist_path, path)
    except:
        # Qualquer outra rota → serve index.html (React Router SPA)
        return send_from_directory(dist_path, 'index.html')

PORT = 5000
URL = f"http://127.0.0.1:{PORT}"

def run_server():
    print("🚀 Servidor Flask + Frontend iniciado...")
    serve(flask_app, host='127.0.0.1', port=PORT, threads=8)

if __name__ == "__main__":
    print("🌟 Iniciando AMP Usinagem Industrial v1.0 - Supabase Edition...")
    
    server_thread = Thread(target=run_server, daemon=True)
    server_thread.start()

    time.sleep(3)

    print(f"🌐 Abrindo janela limpa → {URL}")

    try:
        webbrowser.get('chrome').open(f'--app={URL}', new=2)
    except:
        webbrowser.open_new(URL)

    print("💡 Programa rodando. Feche esta janela para sair.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("👋 Encerrando AMP Usinagem Industrial...")
        sys.exit(0)