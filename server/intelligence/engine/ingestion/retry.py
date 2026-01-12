"""Production-grade retry utilities with exponential backoff."""

import asyncio
import random
from functools import wraps
from typing import Callable, TypeVar, ParamSpec

from core.logging import get_logger

logger = get_logger(__name__)

P = ParamSpec('P')
T = TypeVar('T')


class RetryError(Exception):
    """Raised when all retry attempts are exhausted."""
    pass


def is_retriable_error(error: Exception) -> bool:
    """
    Determine if an error is retriable.
    
    Args:
        error: Exception to check
        
    Returns:
        True if error is retriable
    """
    import httpx

    # Network errors are retriable
    if isinstance(error, (
        httpx.ConnectError,
        httpx.TimeoutException,
        httpx.NetworkError,
        ConnectionError,
        TimeoutError,
    )):
        return True

    # HTTP 5xx errors and 429 (rate limit) are retriable
    if isinstance(error, httpx.HTTPStatusError):
        status_code = error.response.status_code
        return (500 <= status_code < 600) or (status_code == 429)

    return False


async def retry_async(
    func: Callable[P, T],
    *args: P.args,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
    **kwargs: P.kwargs,
) -> T:
    """
    Retry an async function with exponential backoff.
    
    Args:
        func: Async function to retry
        *args: Positional arguments for func
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        exponential_base: Base for exponential backoff
        jitter: Add random jitter to delay
        **kwargs: Keyword arguments for func
        
    Returns:
        Result from successful function call
        
    Raises:
        RetryError: If all retries are exhausted
    """
    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            last_exception = e

            # Don't retry if error is not retriable
            if not is_retriable_error(e):
                logger.warning(f"Non-retriable error in {func.__name__}: {e}")
                raise

            # Don't retry on last attempt
            if attempt == max_retries:
                break

            # Calculate delay with exponential backoff
            delay = min(base_delay * (exponential_base ** attempt), max_delay)

            # Add jitter to prevent thundering herd
            if jitter:
                delay = delay * (0.5 + random.random())

            logger.warning(
                f"Retry {attempt + 1}/{max_retries} for {func.__name__} "
                f"after {delay:.2f}s due to: {e}"
            )

            await asyncio.sleep(delay)

    # All retries exhausted
    raise RetryError(
        f"Failed after {max_retries} retries: {last_exception}"
    ) from last_exception


def with_retry(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
):
    """
    Decorator to add retry logic to async functions.
    
    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        exponential_base: Base for exponential backoff
        jitter: Add random jitter to delay
        
    Returns:
        Decorated function with retry logic
        
    Example:
        @with_retry(max_retries=3, base_delay=1.0)
        async def fetch_data(url: str):
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.json()
    """
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            return await retry_async(
                func,
                *args,
                max_retries=max_retries,
                base_delay=base_delay,
                max_delay=max_delay,
                exponential_base=exponential_base,
                jitter=jitter,
                **kwargs,
            )
        return wrapper
    return decorator
