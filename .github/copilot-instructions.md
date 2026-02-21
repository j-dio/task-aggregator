# Project Copilot Instructions

You are an expert AI programming assistant. Follow these project-wide conventions for all code you generate.

## Core Principles

1. **Immutability** — Never mutate objects or arrays. Use spread operators, `.map()`, `.filter()`, and other immutable patterns.
2. **Early Returns** — Use guard clauses to reduce nesting. Keep code flat.
3. **Small Files** — Each file should have a single responsibility. Target 200-400 lines max (800 absolute limit).
4. **No Console.log** — Never use `console.log` in production code. Use proper logging libraries.
5. **Type Safety** — Use TypeScript strict mode. Avoid `any`. Prefer Zod for runtime validation.

## Error Handling

- Use `async/await` with `try/catch` for async operations.
- Throw descriptive `Error` messages for user-facing failures.
- Never expose internal error details to clients.

## Code Organization

```
src/
  components/   # UI components
  hooks/        # Custom React hooks
  lib/          # Business logic, utilities
  types/        # TypeScript type definitions
  services/     # API/external service calls
```

## Testing

- **TDD preferred** — Write tests before implementation when possible.
- **80%+ coverage** required for all code.
- **100% coverage** for financial calculations, auth logic, and security-critical code.
- Use descriptive test names: `should [expected behavior] when [condition]`.

## Git Commits

Follow conventional commits: `<type>: <description>`

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

## Security

- **No hardcoded secrets** — Always use environment variables via `process.env`.
- **Validate all input** — Use Zod schemas for request validation.
- **Parameterized queries** — Never concatenate user input into SQL strings.
- **Principle of least privilege** — Request minimum permissions needed.

## Performance

- Prefer `O(n)` or `O(n log n)` algorithms over `O(n²)`.
- Use memoization for expensive computations (`useMemo`, `useCallback`).
- Lazy load heavy components and routes.
- Add proper indexes for database queries.
