from pathlib import Path

from backend import config


def test_build_database_uri_normalizes_postgres_url(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgres://user:pass@localhost:5432/app")

    uri = config.build_database_uri()

    assert uri == "postgresql://user:pass@localhost:5432/app"


def test_build_database_uri_builds_postgres_with_credentials(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("DB_USER", "amp")
    monkeypatch.setenv("DB_PASS", "senha forte")
    monkeypatch.setenv("DB_HOST", "db.local")
    monkeypatch.setenv("DB_PORT", "5433")
    monkeypatch.setenv("DB_NAME", "usinagem")

    uri = config.build_database_uri()

    assert (
        uri
        == "postgresql+psycopg2://amp:senha+forte@db.local:5433/usinagem?sslmode=require"
    )


def test_build_database_uri_falls_back_to_sqlite(monkeypatch, tmp_path):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("DB_USER", raising=False)
    monkeypatch.delenv("DB_PASS", raising=False)
    monkeypatch.delenv("DB_HOST", raising=False)
    monkeypatch.delenv("DB_PORT", raising=False)
    monkeypatch.delenv("DB_NAME", raising=False)
    monkeypatch.setattr(
        config, "get_runtime_data_dir", lambda: tmp_path / "amp-runtime"
    )

    uri = config.build_database_uri()

    assert uri == f"sqlite:///{(tmp_path / 'amp-runtime' / 'app.sqlite3').as_posix()}"


def test_get_runtime_data_dir_uses_local_path_in_dev(monkeypatch, tmp_path):
    fake_config_file = tmp_path / "backend" / "config.py"
    fake_config_file.parent.mkdir(parents=True, exist_ok=True)
    fake_config_file.write_text("# test", encoding="utf-8")

    monkeypatch.setattr(config.sys, "frozen", False, raising=False)
    monkeypatch.setattr(config, "__file__", str(fake_config_file))

    runtime_dir = config.get_runtime_data_dir()

    assert runtime_dir == Path(fake_config_file).resolve().parent
    assert runtime_dir.exists()


def test_build_engine_options_matches_database_type():
    assert config.build_engine_options("sqlite:///tmp/app.sqlite3") == {}

    options = config.build_engine_options(
        "postgresql+psycopg2://user:pass@localhost/db"
    )

    assert options["pool_pre_ping"] is True
    assert options["pool_recycle"] == 300
    assert options["connect_args"]["sslmode"] == "require"
    assert options["connect_args"]["connect_timeout"] == 10
