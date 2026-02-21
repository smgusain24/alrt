import os

from cryptography.fernet import Fernet


def get_fernet() -> Fernet:
    """Return a Fernet instance using ENCRYPTION_KEY from environment"""
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        raise RuntimeError("ENCRYPTION_KEY environment variable is not set")
    return Fernet(key.encode())
