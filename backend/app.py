import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.extensions import db
from backend.factory import create_app, run_dev_server

app = create_app()

if __name__ == "__main__":
    run_dev_server(app)
