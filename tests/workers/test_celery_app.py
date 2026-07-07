"""Guards against Beat/task name drift.

Celery itself is stubbed in the test venv (see tests/workers/conftest.py), so the live
task registry can't be inspected here. Instead we statically assert that every
Beat-scheduled task name — including the Stream 3 reconciler — resolves to a real
callable at its ``module.function`` path. A typo in a beat entry (a task that silently
never runs) fails this test. Keep this list in sync with celery_app.beat_schedule.
"""
import importlib

BEAT_TASK_TARGETS = [
    "alrt_workers.tasks.delay.poll_scheduled_steps",
    "alrt_workers.tasks.retention.purge_old_notifications",
    "alrt_workers.tasks.retention.purge_old_event_logs",
    "alrt_workers.tasks.reconcile.reconcile_orphaned_executions",
]

# Tasks dispatched by name/`.delay()` rather than the beat schedule.
DISPATCHED_TASK_TARGETS = [
    "alrt_workers.tasks.delay.resume_scheduled_step",
    "alrt_workers.tasks.bulk.process_bulk_batch",
    "alrt_workers.tasks.workflow.execute",
]


def _assert_callable(dotted):
    module_path, _, func = dotted.rpartition(".")
    mod = importlib.import_module(module_path)
    assert callable(getattr(mod, func, None)), f"{dotted} is not a callable task target"


def test_beat_task_targets_exist():
    for dotted in BEAT_TASK_TARGETS:
        _assert_callable(dotted)


def test_dispatched_task_targets_exist():
    for dotted in DISPATCHED_TASK_TARGETS:
        _assert_callable(dotted)
