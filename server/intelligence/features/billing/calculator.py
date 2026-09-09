"""Cost calculations for LLM inference."""

from __future__ import annotations

from decimal import Decimal


def compute_cost(
    input_cost_per_mtok: float,
    output_cost_per_mtok: float,
    tokens_in: int,
    tokens_out: int,
) -> Decimal:
    """Computes total credit cost based on input/output per-million-token rates."""
    return (
        Decimal(str(input_cost_per_mtok)) * Decimal(tokens_in)
        + Decimal(str(output_cost_per_mtok)) * Decimal(tokens_out)
    ) / Decimal(1_000_000)


__all__ = ["compute_cost"]
