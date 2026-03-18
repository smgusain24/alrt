# Contributing to @alrt/node

## Setup

```bash
cd packages/sdk-node
pnpm install
```

## Development

```bash
pnpm test          # Run tests once
pnpm test:watch    # Watch mode
pnpm lint          # TypeScript type check
pnpm build         # Build ESM + CJS
```

## Project Structure

```
src/
  index.ts          - Public exports
  client.ts         - Alrt class (constructor, _request with retry)
  types.ts          - All TypeScript interfaces + zod response schemas
  errors.ts         - Error class hierarchy + throwForStatus
  retry.ts          - isRetryable, getRetryDelay, sleep
  resources/
    events.ts       - EventsResource (trigger, triggerBulk)
    subscribers.ts  - SubscribersResource (CRUD, preferences, push tokens)
tests/
  *.test.ts         - Vitest tests with mocked fetch
```

## Adding a New Method

1. **Add types** in `src/types.ts`:
   - Request interface (camelCase)
   - Response interface (camelCase)
   - Zod schema for response (snake_case matching API)
   - Converter function (snake_case -> camelCase)

2. **Add method** in the appropriate resource file (`src/resources/*.ts`)

3. **Export type** from `src/index.ts`

4. **Add tests** in `tests/*.test.ts`

## Type Conventions

- SDK consumer-facing types use **camelCase** (TypeScript convention)
- API wire format uses **snake_case** (Python convention)
- `toSnakeCaseBody()` converts request bodies before sending
- Zod schemas validate snake_case responses, converter functions transform to camelCase
