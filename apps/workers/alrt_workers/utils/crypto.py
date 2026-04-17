"""Fernet symmetric encryption utilities for provider credential handling."""

import os

from cryptography.fernet import Fernet


def get_fernet() -> Fernet:
    """Return a Fernet instance using the ENCRYPTION_KEY environment variable.

    Returns:
        A Fernet instance ready for encrypt/decrypt operations.

    Raises:
        RuntimeError: If ENCRYPTION_KEY is not set.
    """
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        raise RuntimeError("ENCRYPTION_KEY environment variable is not set")
    return Fernet(key.encode())
