"""Shared pytest fixtures.

DB strategy
-----------
- CI / explicit opt-in (USE_POSTGRES_TESTS=true or CI=true) → real Postgres
- Otherwise → SQLite in-memory (no Postgres needed for local dev)

Auth strategy
-------------
Fixtures create real users in the DB (admin / user / read) and sign JWTs
with the production code path (core.security), so the actual auth dependency
chain runs end-to-end — no monkeypatching of get_current_user.
"""
import os
from typing import Generator

import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from core.security import creer_access_token, hacher_mot_de_passe
from db.db import Base
from db.models.user import User
from db.session import get_db
from main import app

load_dotenv()


# ─────────────────────────────────────────────────────────────
# DB engine
# ─────────────────────────────────────────────────────────────

def get_test_database_url() -> str:
    if os.getenv("USE_POSTGRES_TESTS") == "true" or os.getenv("CI") == "true":
        user = os.environ["POSTGRES_USER"]
        password = os.environ["POSTGRES_PASSWORD"]
        host = os.environ["POSTGRES_HOST"]
        port = os.environ.get("POSTGRES_PORT", "5432")
        name = os.environ["POSTGRES_DB"]
        return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"
    return "sqlite:///:memory:"


@pytest.fixture(scope="session")
def db_engine():
    url = get_test_database_url()
    if url.startswith("sqlite"):
        engine = create_engine(
            url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    else:
        engine = create_engine(url)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture
def db_session(db_engine) -> Generator[Session, None, None]:
    """Per-test transactional session. Rolled back on teardown — no leaks."""
    connection = db_engine.connect()
    transaction = connection.begin()
    Session_ = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = Session_()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


# ─────────────────────────────────────────────────────────────
# Users + tokens
# ─────────────────────────────────────────────────────────────

def _make_user(db_session: Session, email: str, role: str) -> User:
    user = User(
        nom=f"Test {role}",
        email=email,
        mot_de_passe_hash=hacher_mot_de_passe("test-password"),
        role=role,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session: Session) -> User:
    return _make_user(db_session, "admin_test@mairie.fr", "admin")


@pytest.fixture
def standard_user(db_session: Session) -> User:
    return _make_user(db_session, "user_test@mairie.fr", "user")


@pytest.fixture
def read_user(db_session: Session) -> User:
    return _make_user(db_session, "read_test@mairie.fr", "read")


def _token_for(user: User) -> str:
    return creer_access_token({"sub": user.email, "role": user.role})


# ─────────────────────────────────────────────────────────────
# HTTP clients
# ─────────────────────────────────────────────────────────────

def _override_db(session: Session):
    def _get_db():
        yield session
    return _get_db


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Unauthenticated client. Use for endpoints that should reject without auth."""
    app.dependency_overrides[get_db] = _override_db(db_session)
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_client(
    db_session: Session, admin_user: User
) -> Generator[TestClient, None, None]:
    app.dependency_overrides[get_db] = _override_db(db_session)
    with TestClient(app) as c:
        c.headers["Authorization"] = f"Bearer {_token_for(admin_user)}"
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def user_client(
    db_session: Session, standard_user: User
) -> Generator[TestClient, None, None]:
    app.dependency_overrides[get_db] = _override_db(db_session)
    with TestClient(app) as c:
        c.headers["Authorization"] = f"Bearer {_token_for(standard_user)}"
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def read_client(
    db_session: Session, read_user: User
) -> Generator[TestClient, None, None]:
    app.dependency_overrides[get_db] = _override_db(db_session)
    with TestClient(app) as c:
        c.headers["Authorization"] = f"Bearer {_token_for(read_user)}"
        yield c
    app.dependency_overrides.clear()
