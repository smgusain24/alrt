# Contributing to alrt-python

## Setup

```bash
cd packages/sdk-python
pip install -e ".[dev]"
```

## Development

```bash
python -m pytest tests/ -v     # Run tests
ruff check src/                # Lint
mypy src/                      # Type check
```

## Project Structure

```
src/alrt/
  __init__.py       - Public exports (Alrt, AsyncAlrt, errors)
  client.py         - Alrt (sync) + AsyncAlrt (async) classes
  types.py          - Pydantic v2 request/response models
  errors.py         - Exception hierarchy + raise_for_status
  retry.py          - is_retryable, get_retry_delay, sleep helpers
  resources/
    events.py       - EventsResource + AsyncEventsResource
    subscribers.py  - SubscribersResource + AsyncSubscribersResource
tests/
  conftest.py       - Shared mock helpers
  test_*.py         - pytest tests
```

## Adding a New Method

1. **Add Pydantic models** in `src/alrt/types.py` (request + response)
2. **Add method** in the sync resource class (`src/alrt/resources/*.py`)
3. **Add async method** in the async resource class (same file)
4. **Add tests** in `tests/test_*.py` (both sync and async)

## Conventions

- Python consumers use **snake_case** for all method names and parameters
- Wire format uses **camelCase** (handled by Pydantic alias_generator)
- Both sync (`Alrt`) and async (`AsyncAlrt`) clients share the same method surface
