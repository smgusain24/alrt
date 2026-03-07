"""Root fixtures shared across all test modules."""
import uuid

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
