"""Wrapper para criar/verificar tabelas usando a factory oficial do backend."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.factory import create_app


def main():
    create_app()
    print("Tabelas verificadas/criadas com sucesso.")


if __name__ == "__main__":
    main()
