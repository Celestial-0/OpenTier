"""AES-256-GCM sealing for provider API keys.

Blob layout: 12-byte nonce || ciphertext||tag (as produced by AESGCM.encrypt).
The master key comes from ENCRYPTION_MASTER_KEY (base64, 32 bytes).
"""

from __future__ import annotations

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_NONCE_LEN = 12
_NONCE_MIN = _NONCE_LEN + 16


class SecretsError(Exception):
    pass


def _master_key() -> bytes:
    raw = os.environ.get("ENCRYPTION_MASTER_KEY", "").strip()
    if not raw:
        raise SecretsError(
            "ENCRYPTION_MASTER_KEY is required to read provider credentials"
        )
    key = base64.b64decode(raw)
    if len(key) != 32:
        raise SecretsError("ENCRYPTION_MASTER_KEY must decode to 32 bytes")
    return key


def seal(plaintext: str) -> bytes:
    nonce = os.urandom(_NONCE_LEN)
    return nonce + AESGCM(_master_key()).encrypt(nonce, plaintext.encode(), None)


def open_sealed(blob: bytes) -> str:
    if len(blob) < _NONCE_MIN:
        raise SecretsError("sealed blob too short")
    nonce, ct = blob[:_NONCE_LEN], blob[_NONCE_LEN:]
    return AESGCM(_master_key()).decrypt(nonce, ct, None).decode()
