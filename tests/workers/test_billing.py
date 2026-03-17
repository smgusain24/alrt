"""Worker billing tests — Beat tasks for trial/cancel expiry and quota reset."""
from unittest.mock import patch


def test_expire_trials():
    """expire_trials calls UPDATE for trialing teams past trial_ends_at."""
    from alrt_workers.tasks.billing import expire_trials, EXPIRE_TRIALS
    with patch("alrt_workers.tasks.billing.execute_update_query") as mock_update:
        expire_trials()
        mock_update.assert_called_once_with(EXPIRE_TRIALS)


def test_expire_cancelled():
    """expire_cancelled calls UPDATE for cancelled teams past period_ends_at."""
    from alrt_workers.tasks.billing import expire_cancelled, EXPIRE_CANCELLED
    with patch("alrt_workers.tasks.billing.execute_update_query") as mock_update:
        expire_cancelled()
        mock_update.assert_called_once_with(EXPIRE_CANCELLED)


def test_reset_monthly_quotas():
    """reset_monthly_quotas deletes old month quota rows."""
    from alrt_workers.tasks.billing import reset_monthly_quotas, RESET_MONTHLY_QUOTAS
    with patch("alrt_workers.tasks.billing.execute_update_query") as mock_update:
        reset_monthly_quotas()
        mock_update.assert_called_once_with(RESET_MONTHLY_QUOTAS)
