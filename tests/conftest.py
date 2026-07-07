"""Root fixtures shared across all test modules."""
import os
import uuid

# Set required env before any app module imports config (Settings() is built at
# import time). setdefault keeps a developer's exported values if present.
os.environ.setdefault("DATABASE_URL", "postgresql://alrt:alrt@localhost:5432/alrt_test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("API_SECRET_KEY", "test-secret-key-not-for-production")
if "ENCRYPTION_KEY" not in os.environ:
    from cryptography.fernet import Fernet

    os.environ["ENCRYPTION_KEY"] = Fernet.generate_key().decode()

import pytest


TEAM_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
SUBSCRIBER_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")
USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000003")
WORKFLOW_ID = uuid.UUID("00000000-0000-0000-0000-000000000004")


@pytest.fixture
def team_id():
    return TEAM_ID


@pytest.fixture
def subscriber_id():
    return SUBSCRIBER_ID


@pytest.fixture
def user_id():
    return USER_ID


@pytest.fixture
def workflow_id():
    return WORKFLOW_ID
