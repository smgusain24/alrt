"""Worker test fixtures — patches sync DB wrappers."""
import sys
from unittest.mock import patch, MagicMock

import pytest

# ---------------------------------------------------------------------------
# Celery is not installed in the test venv.  Stub the celery package so that
# importing worker modules (which do `from celery import Celery` and use
# `@celery_app.task`) works without the real dependency.
# ---------------------------------------------------------------------------
if "celery" not in sys.modules:
    _celery_mod = MagicMock()
    # Make @celery_app.task / @celery_app.task(bind=True, ...) act as a no-op
    # decorator that returns the original function.
    def _task_decorator(*args, **kwargs):
        """Simulate @celery_app.task — works with and without parentheses."""
        if args and callable(args[0]):
            # @celery_app.task  (no parentheses)
            return args[0]
        # @celery_app.task(bind=True, ...)  (with parentheses)
        def wrapper(fn):
            return fn
        return wrapper

    _celery_app_instance = MagicMock()
    _celery_app_instance.task = _task_decorator
    _celery_app_instance.on_after_configure = MagicMock()

    _celery_mod.Celery.return_value = _celery_app_instance
    sys.modules["celery"] = _celery_mod
    sys.modules["celery.signals"] = MagicMock()

    # Now create the alrt_workers.celery_app module with our mock app
    import types
    _capp_mod = types.ModuleType("alrt_workers.celery_app")
    _capp_mod.celery_app = _celery_app_instance
    sys.modules["alrt_workers.celery_app"] = _capp_mod


@pytest.fixture
def mock_worker_db():
    """Patch all alrt_workers.db sync wrappers."""
    with patch("alrt_workers.db.execute_read_query") as mock_read, \
         patch("alrt_workers.db.execute_read_one_query") as mock_read_one, \
         patch("alrt_workers.db.execute_insert_query") as mock_insert, \
         patch("alrt_workers.db.execute_update_query") as mock_update:
        yield {
            "read": mock_read,
            "read_one": mock_read_one,
            "insert": mock_insert,
            "update": mock_update,
        }
