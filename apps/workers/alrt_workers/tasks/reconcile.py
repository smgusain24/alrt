"""Beat reconciler: self-heal orphaned executions and recover lost resume tasks.

The trigger path commits a workflow_executions row as 'running' and *then* enqueues
the Celery task (events.py), so a crash in between orphans the execution with no task
to drive it. A scheduled step claimed 'processing' by a resume task that dies never
resumes. This periodic task heals both:

  * reset stale 'processing' scheduled_steps back to 'pending' so the poller re-claims
    them (re-``resume_from`` is idempotent via the step-execution ledger); and
  * re-enqueue ``workflow.execute`` for stale 'running' executions that have nothing
    scheduled to resume them AND no in-flight ledger node. Re-driving is safe: the
    ledger's INSERT ... ON CONFLICT dedups already-completed nodes, so a pure orphan
    delivers its whole graph and an execution that merely missed its final
    ``maybe_complete`` gets finalized — while nothing already delivered is re-sent.

Deliberately NOT handled here: a node that crashed *between* dispatching its channel
task and recording the result leaves a permanently-'running' ledger row. That row is
what keeps ``maybe_complete`` from finalizing the execution (so the branch is never
silently dropped), and it also makes the orphan claim below skip the execution (no
blind re-dispatch, no double-send). Auto-recovering that node safely needs
delivery-level idempotency (a unique (execution, node) on notifications); see the
Stream 3 follow-up. Reaping the row here would remove the guard and double-send or
false-complete, so we don't.
"""

import logging
from datetime import datetime, timedelta, timezone

from alrt_workers.celery_app import celery_app
from alrt_workers.db import execute_read_query
from alrt_workers.tasks.delay import _enqueue_workflow_task

logger = logging.getLogger("alrt.workers.reconcile")

# A row is only touched once it has been stuck longer than this — long enough that a
# live worker mid-node (ledger 'running' is a fast in-and-out) is never disturbed.
STALE_AFTER = timedelta(minutes=5)

Q_RESET_STUCK_STEPS = """
    UPDATE scheduled_steps SET status = 'pending', updated_at = now()
    WHERE status = 'processing' AND updated_at < $1
    RETURNING id
"""

# Claims (bumps updated_at on, and returns) executions to re-drive: stale 'running'
# executions with nothing scheduled to resume them and no in-flight ledger node. The
# updated_at bump gives each re-drive a fresh staleness window (so one execution isn't
# re-enqueued every cycle) and makes the claim safe under concurrent reconcilers. The
# no-'running'-ledger clause excludes crash-mid-dispatch executions, which can't make
# progress on a re-drive and must not be blindly re-dispatched.
Q_CLAIM_ORPHANS = """
    UPDATE workflow_executions SET updated_at = now()
    WHERE status = 'running'
      AND updated_at < $1
      AND NOT EXISTS (
          SELECT 1 FROM scheduled_steps s
          WHERE s.workflow_execution_id = workflow_executions.id
            AND s.status IN ('pending', 'processing')
      )
      AND NOT EXISTS (
          SELECT 1 FROM step_executions e
          WHERE e.workflow_execution_id = workflow_executions.id
            AND e.status = 'running'
      )
    RETURNING id
"""


@celery_app.task
def reconcile_orphaned_executions():
    """Recover lost resume tasks and re-drive orphaned 'running' executions.

    Runs every 5 minutes via Celery Beat. Returns a per-run summary for observability.
    """
    stale = datetime.now(timezone.utc) - STALE_AFTER

    reset = execute_read_query(Q_RESET_STUCK_STEPS, [stale])
    if reset:
        logger.warning("reconcile: reset %d stuck 'processing' scheduled step(s)", len(reset))

    orphans = execute_read_query(Q_CLAIM_ORPHANS, [stale])
    for row in orphans:
        logger.warning("reconcile: re-enqueuing orphaned execution %s", row["id"])
        _enqueue_workflow_task(str(row["id"]))

    return {"reset_steps": len(reset), "reenqueued": len(orphans)}
