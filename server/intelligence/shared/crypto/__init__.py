"""Cryptographic utilities and secrets management."""

from shared.crypto.secrets import SecretsError, open_sealed, seal

__all__ = ["SecretsError", "seal", "open_sealed"]
