# Coding Conventions

**Analysis Date:** 2026-02-28

## Naming Patterns

**Files:**
- Python: `snake_case.py` (e.g., `audit_log.py`, `workflow.py`, `db.py`)
- TypeScript/React: `PascalCase.tsx` for components, `camelCase.ts` for utilities (e.g., `RetroButton.tsx`, `api.ts`, `middleware.ts`)
- Query files: `snake_case.py` containing SQL constants (e.g., `users.py`, `workflows.py`)

**Functions:**
- Python: `snake_case()` for all functions and methods (e.g., `execute_read_query()`, `_hash_password()`)
- TypeScript: `camelCase()` for functions and methods (e.g., `getToken()`, `setToken()`)
- React hooks: Standard `useXxx` pattern (e.g., `useState`, `useEffect`)

**Variables:**
- Python: `snake_case` for variables, constants in `UPPER_SNAKE_CASE` (e.g., `REQUIRED_TABLES`, `SCHEMA_SQL`, `JWT_ALGORITHM`)
- TypeScript: `camelCase` for variables and constants (e.g., `API_URL`, `isLoggedIn`, `workflows`)
- SQL query constants: `UPPER_SNAKE_CASE` prefixed with `Q_` (e.g., `Q_GET_EXECUTION`, `Q_UPDATE_EXECUTION_STATUS`)

**Types:**
- Python: Type hints using `|` union syntax (e.g., `dict | None`, `list | None`, `str | None`)
- TypeScript: Explicit interfaces for complex objects (e.g., `interface WorkflowRow`, `interface RetroButtonProps`)
- UUIDs: typed as `uuid.UUID` in Python, `string` in TypeScript

## Code Style

**Formatting:**
- Python line length: 120 characters (configured in `pyproject.toml`)
- No explicit formatter/linter (Ruff configured, but minimal rules)
- Consistent spacing and indentation observed

**Linting:**
- Python: Ruff configured with `target-version = "py312"` and `line-length = 120`
- TypeScript: `next lint` (Next.js default ESLint), `strict: true` in tsconfig.json
- No external ESLint config files present—using Next.js defaults

**Spacing:**
- 4-space indentation in Python
- 2-space indentation in TypeScript/JavaScript

## Import Organization

**Order (Python):**
1. Standard library imports (e.g., `import uuid`, `from datetime import`)
2. Third-party imports (e.g., `from fastapi import`, `import bcrypt`)
3. Local application imports (e.g., `from alrt.config import`, `from alrt.db import`)
4. Blank line between groups

**Order (TypeScript):**
1. Next.js/React imports (e.g., `import type { Metadata }`, `import { useState }`)
2. Third-party library imports (e.g., `import Link from "next/link"`, `from lucide-react`)
3. Local imports from `@/` path alias (e.g., `from @/components/retro`, `from @/lib/api`)
4. Blank line between groups

**Path Aliases:**
- TypeScript: `@/*` resolves to `./src/*` (configured in `tsconfig.json`)
- No aliases in Python codebase

## Error Handling

**Patterns:**
- Python: FastAPI uses `HTTPException` with appropriate status codes (401, 403, 404, 409, 500)
  - Error detail messages use lowercase strings (e.g., `"Invalid email or password"`, `"Workflow not found"`)
  - Worker tasks use try-except with logging, returning `None` or skipping on failure
- TypeScript: Throw `Error` with string message, caught at API response level
  - API client (`api.ts`) handles 401 with auto-redirect to login
  - Fetch responses check `.ok` status before proceeding
- No custom error classes; rely on exception messages

**Logging:**
- Python: `logging.getLogger()` with module name (e.g., `"alrt.db"`, `"alrt.workers.workflow"`)
- TypeScript: Client-side only via `console.log/error` (not observed in production code)
- DEBUG and INFO level logging used; sensitive data scrubbed in audit logs

## Comments

**When to Comment:**
- SQL query constants are self-documenting with descriptive names
- Complex logic (e.g., BFS node traversal) includes line comments explaining steps
- Function docstrings present in core utilities (e.g., `db.py` function docs)
- Inline comments use `#` in Python, `//` in TypeScript
- Section dividers use `# ─── SectionName ───` in Python, `/* ─── SectionName ─── */` in React/TypeScript

**JSDoc/TSDoc:**
- Not heavily used; function signatures are self-documenting
- React props documented as inline interfaces (e.g., `interface RetroButtonProps`)
- Pydantic models self-document via field types

**Special markers:**
- `# noqa: F401` used to suppress unused import warnings (e.g., `Request` imported but used for type hints)

## Function Design

**Size:**
- Router endpoints typically 10-30 lines: validate input, query DB, transform response
- Worker tasks range 20-100 lines: include business logic (e.g., BFS traversal)
- Utility functions (helpers) typically 5-15 lines

**Parameters:**
- Python: Mix of positional and dependency-injected (via `Depends()`)
  - API routes: `(request: Request, body: Pydantic model, team_id: UUID = Depends(...))`
  - Query helpers: `(query: str, params: list | None = None)`
- TypeScript: Props as single object destructured (React pattern)
  - Async functions use `async/await`, not `.then()`

**Return Values:**
- Python: Pydantic models for API responses, dicts/None for internal functions
  - Database queries return `list[dict]`, `dict | None`, or `bool` (success flag)
- TypeScript: Type-annotated with explicit types (e.g., `Promise<T>`, `React.ReactNode`)
  - API client methods return generic `T` or throw errors

## Module Design

**Exports:**
- Python: Modules export public functions/classes directly, private with `_` prefix
  - Query modules export only SQL string constants
  - No `__all__` lists observed
- TypeScript: Named exports for components, default exports for pages
  - `components/retro/index.ts` uses barrel file pattern for design system
  - API client (`api.ts`) exports single `api` object with nested namespaces

**Barrel Files:**
- Used in `components/retro/index.ts` to re-export all design system components
- Pattern: `export { default as ComponentName } from "./ComponentName"`
- Simplifies imports: `from "@/components/retro"` instead of individual files

## Async Patterns

**Python:**
- FastAPI routes: `async def` with `await` for I/O (database, HTTP)
- Middleware: `async` dispatch with `await call_next(request)`
- Celery workers: Synchronous (blocking) task functions, no async
- Database helpers: All `async` functions using `asyncpg`

**TypeScript:**
- React: `async` Server Components for data fetching, Client Components (`"use client"`) for state
- API client: All methods are `async`, return `Promise<T>`
- No observable synchronous blocking patterns

## Type Hints & Annotations

**Python:**
- Full type hints on all function parameters and return types
- Union types: `dict | None`, `list | dict`
- Generic types: `list[WorkflowRow]` (PEP 585 style)
- Pydantic `BaseModel` for request/response schemas

**TypeScript:**
- Strict mode enabled (`strict: true` in tsconfig.json)
- Explicit types on all variables and return values
- `any` used sparingly (observed in `api.ts` for some API calls to avoid over-specification)
- Interface definitions for complex props and data shapes

---

*Convention analysis: 2026-02-28*
