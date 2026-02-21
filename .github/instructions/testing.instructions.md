---
applyTo: "**/*.{test,spec}.{ts,tsx,js,jsx}"
---

# Testing Standards

## TDD Methodology

Follow Red-Green-Refactor cycle:

1. **RED** — Write a failing test that describes expected behavior
2. **GREEN** — Write minimal code to make the test pass
3. **REFACTOR** — Improve code while keeping tests green

## Coverage Requirements

- **80% minimum** for all code (branches, functions, lines, statements)
- **100% required** for:
  - Financial calculations
  - Authentication logic
  - Security-critical code
  - Core business logic

## Test Types

| Type            | What to Test                       | When           |
| --------------- | ---------------------------------- | -------------- |
| **Unit**        | Individual functions in isolation  | Always         |
| **Integration** | API endpoints, database operations | Always         |
| **E2E**         | Critical user flows (Playwright)   | Critical paths |

## Edge Cases You MUST Test

1. Null/Undefined input
2. Empty arrays/strings
3. Invalid types passed
4. Boundary values (min/max)
5. Error paths (network failures, DB errors)
6. Race conditions (concurrent operations)
7. Large data (performance with 10k+ items)
8. Special characters (Unicode, emojis, SQL chars)

## Test Naming

Use descriptive test names: `should [expected behavior] when [condition]`

```typescript
describe('calculateLiquidityScore', () => {
  it('should return high score for liquid market', () => { ... })
  it('should return zero when volume is zero', () => { ... })
  it('should throw when input is null', () => { ... })
})
```

## Test Anti-Patterns to Avoid

- Testing implementation details (internal state) instead of behavior
- Tests depending on each other (shared state)
- Asserting too little (passing tests that don't verify anything)
- Not mocking external dependencies
- Using array index as key assertion

## Quality Checklist

- [ ] All public functions have unit tests
- [ ] All API endpoints have integration tests
- [ ] Critical user flows have E2E tests
- [ ] Edge cases covered (null, empty, invalid)
- [ ] Error paths tested (not just happy path)
- [ ] Mocks used for external dependencies
- [ ] Tests are independent (no shared state)
- [ ] Assertions are specific and meaningful
