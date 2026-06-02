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
    monkeypatch.setenv("APP_ENV", "development")
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


def test_get_runtime_data_dir_uses_user_data_dir(monkeypatch, tmp_path):
    monkeypatch.setattr(config.sys, "frozen", False, raising=False)
    monkeypatch.delenv("AMP_RUNTIME_DIR", raising=False)
    monkeypatch.setenv("XDG_DATA_HOME", str(tmp_path / "data-home"))

    runtime_dir = config.get_runtime_data_dir()

    assert runtime_dir == tmp_path / "data-home" / "amp-usinagem-erp"
    assert runtime_dir.exists()


def test_get_runtime_data_dir_honors_env(monkeypatch, tmp_path):
    monkeypatch.setenv("AMP_RUNTIME_DIR", str(tmp_path / "runtime"))

    runtime_dir = config.get_runtime_data_dir()

    assert runtime_dir == tmp_path / "runtime"
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


def test_cors_default_restrito_ao_front_local(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    origins = config.get_cors_origins()

    assert "http://localhost:5173" in origins
    assert "*" not in origins


def test_secret_padrao_apenas_em_dev(monkeypatch):
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.setenv("APP_ENV", "development")

    assert config.get_secret_config("SECRET_KEY", "dev-secret") == "dev-secret"

    monkeypatch.setenv("APP_ENV", "production")
    try:
        config.get_secret_config("SECRET_KEY", "dev-secret")
    except RuntimeError as exc:
        assert "SECRET_KEY" in str(exc)
    else:
        raise AssertionError("production sem SECRET_KEY deveria falhar")


def test_ambiente_sem_app_env_assume_producao(monkeypatch):
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("FLASK_ENV", raising=False)

    assert not config.is_development_env()


def test_sqlite_fallback_bloqueado_fora_de_dev(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("DB_USER", raising=False)
    monkeypatch.delenv("DB_PASS", raising=False)

    try:
        config.build_database_uri()
    except RuntimeError as exc:
        assert "DATABASE_URL" in str(exc)
    else:
        raise AssertionError("production sem banco configurado deveria falhar")


def test_secret_curto_bloqueado_fora_de_dev(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("SECRET_KEY", "curta")

    try:
        config.get_secret_config("SECRET_KEY", "dev-secret")
    except RuntimeError as exc:
        assert "32 caracteres" in str(exc)
    else:
        raise AssertionError("production com SECRET_KEY curta deveria falhar")


def test_cors_obrigatorio_fora_de_dev(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    try:
        config.get_cors_origins()
    except RuntimeError as exc:
        assert "CORS_ORIGINS" in str(exc)
    else:
        raise AssertionError("production sem CORS_ORIGINS deveria falhar")
