# Testing Patterns

**Analysis Date:** 2026-02-28

## Test Framework & Status

**Current State:** Tests not implemented

- Empty test directory exists: `apps/api/tests/` (only `__pycache__`)
- No test files found in dashboard app
- No pytest.ini or vitest.config.* files
- `.pytest_cache` exists, indicating pytest was explored but not used

**Runner (if implemented):**
- Python: Would use pytest (implied by `.pytest_cache` directory)
- TypeScript: Would use Jest or Vitest (via `next test`)

**Run Commands (expected, not yet configured):**
```bash
# Python (not yet configured)
pytest                         # Run all tests
pytest -v                      # Verbose
pytest --cov=alrt             # Coverage

# TypeScript (not yet configured)
npm test                       # Run tests
npm test -- --watch          # Watch mode
npm test -- --coverage       # Coverage
```

## Test File Organization

**Location (pattern not yet established):**
- Likely co-located with source: `apps/api/alrt/__tests__/` or `tests/unit/`
- Dashboard likely: `apps/dashboard/src/__tests__/` or `tests/`

**Naming (recommended pattern):**
- Python: `test_<module>.py` (e.g., `test_auth.py`, `test_workflows.py`)
- TypeScript: `<component>.test.tsx` or `<module>.test.ts`

**Structure (expected, not yet implemented):**
```
apps/api/tests/
├── unit/
│   ├── test_auth.py
│   ├── test_workflows.py
│   └── test_db.py
├── integration/
│   ├── test_auth_flow.py
│   └── test_workflow_execution.py
└── conftest.py              # Fixtures
```

## Testing Strategy (Not Yet Implemented)

**Unit Tests:**
- Would focus on: Authentication helpers (`_hash_password`, `_verify_password`, JWT creation)
- Database layer: query execution functions in `db.py`
- Schema validation: Pydantic models in `schemas/`

**Integration Tests:**
- Auth flow: signup → login → token refresh
- Workflow execution: trigger → step runner → channel delivery
- API key validation and team authorization

**E2E Tests (Recommended):**
- Not detected; would benefit from workflow builder interaction tests
- Subscriber event → notification delivery flow

## What Should Be Tested (Based on Code Analysis)

**Critical Paths:**
1. **Authentication** (`apps/api/alrt/routes/auth.py`):
   - Signup with duplicate email handling (line 41-42)
   - Password hashing and verification
   - JWT token creation and validation
   - Login with inactive account rejection (line 69-70)

2. **Database Layer** (`apps/api/alrt/db.py`):
   - Schema initialization (`ensure_schema()`)
   - Connection pooling
   - Query execution helpers (read, insert, update, delete)
   - Error handling and recovery

3. **Workflow Execution** (`apps/workers/alrt_workers/tasks/workflow.py`):
   - BFS node traversal with branching
   - Pause handling (line 87-89)
   - Skip condition nodes (line 91-92)
   - Visited node tracking for diamond patterns (line 65-67)

4. **Authorization** (`apps/api/alrt/deps.py`):
   - JWT decoding and validation
   - API key lookup and hashing (line 30-31)
   - Team-scoped access control

5. **Middleware** (`apps/api/alrt/middleware/audit_log.py`):
   - Request/response logging
   - Sensitive field scrubbing (line 104-106)
   - Team ID extraction from JWT and API key (line 141-146)

## Test Fixtures & Mocking (Not Yet Implemented)

**Fixtures (recommended pattern):**
```python
# tests/conftest.py
import pytest
from uuid import uuid4

@pytest.fixture
async def test_team():
    return {"id": uuid4(), "name": "Test Team"}

@pytest.fixture
async def test_user(test_team):
    return {
        "id": uuid4(),
        "email": "test@example.com",
        "password_hash": "...",
        "team_id": test_team["id"],
    }

@pytest.fixture
async def test_db(monkeypatch):
    """Mock asyncpg pool"""
    # Mock get_pool() to return test pool
    pass
```

**Mocking Strategy:**
- Mock `asyncpg.Pool` for database tests
- Mock `celery_app` for worker task tests
- Mock external services (Slack API, SendGrid) for channel delivery
- Mock Redis for Pub/Sub tests

**What NOT to Mock:**
- Pydantic validation (test with real models)
- FastAPI dependency injection (test with TestClient)
- Business logic in routes/workers (test real logic)

## API Testing

**Framework (recommended):**
```python
# FastAPI has built-in TestClient
from fastapi.testclient import TestClient
from alrt.main import app

client = TestClient(app)

def test_signup():
    response = client.post("/auth/signup", json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User",
        "team_name": "Test Team",
    })
    assert response.status_code == 201
    assert response.json()["user"]["email"] == "test@example.com"
```

## Coverage

**Requirements:** None currently enforced

**View Coverage (when implemented):**
```bash
# Python
pytest --cov=alrt --cov-report=html

# TypeScript
npm test -- --coverage
```

## Async Testing Patterns

**Python (asyncio):**
- Use `pytest-asyncio` for async test support
- Mark async tests with `@pytest.mark.asyncio`

```python
@pytest.mark.asyncio
async def test_read_query():
    result = await execute_read_query("SELECT 1")
    assert result == [{"1": 1}]
```

**TypeScript:**
- React Testing Library with async utilities (`waitFor`, `findBy`)
- Use `async/await` in test functions (Jest supports natively)

```typescript
test("loads workflows", async () => {
  const { findByText } = render(<WorkflowsPage />);
  const element = await findByText(/No Workflows Yet/i);
  expect(element).toBeInTheDocument();
});
```

## Error Testing (Recommended Pattern)

**Python:**
```python
def test_invalid_password():
    with pytest.raises(HTTPException) as exc:
        await login(LoginRequest(email="user@example.com", password="wrong"))
    assert exc.value.status_code == 401
    assert "Invalid" in exc.value.detail
```

**TypeScript:**
```typescript
test("handles API error gracefully", async () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ detail: "Unauthorized" }) })
  );
  await expect(api.auth.login({...})).rejects.toThrow("Unauthorized");
});
```

## Missing Test Infrastructure

**What's needed before testing begins:**

1. **Test Database Setup**
   - Separate test PostgreSQL instance or in-memory DB
   - `conftest.py` with fixtures for connection

2. **Test Data Factories**
   - Create realistic user, team, workflow, subscriber data
   - Currently: raw SQL in tests would be fragile

3. **Async Testing Framework**
   - Install `pytest-asyncio` for Python
   - Configure `pytest.ini` or `pyproject.toml`

4. **Mocking Strategy**
   - Define mock Celery app for worker tests
   - Mock Redis Pub/Sub for real-time tests
   - Mock external APIs (Slack, SendGrid)

5. **CI/CD Integration**
   - Add test step to GitHub Actions or similar
   - Enforce coverage thresholds

## Recommended Next Steps

**Priority 1 - Unit Tests:**
1. Auth helpers and JWT validation (`apps/api/alrt/routes/auth.py`)
2. Database layer basics (`apps/api/alrt/db.py`)
3. Pydantic schema validation

**Priority 2 - Integration Tests:**
1. End-to-end auth flow (signup → login → logout)
2. Workflow CRUD operations
3. Subscriber management

**Priority 3 - E2E/Worker Tests:**
1. Complete workflow execution with mock tasks
2. Audit logging with different auth methods
3. Channel delivery (in-app, email, Slack mocking)

---

*Testing analysis: 2026-02-28*
