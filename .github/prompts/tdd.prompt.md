---
description: "Enforce test-driven development. Scaffold interfaces, write failing tests FIRST, then implement minimal code to pass. Ensure 80%+ coverage."
---

# TDD

Implement the requested feature using strict Test-Driven Development methodology.

## Process

### 1. Scaffold Interfaces

Define TypeScript types/interfaces for inputs and outputs before any implementation.

### 2. Write Failing Tests (RED)

Write tests that describe the expected behavior. Run them and verify they **FAIL**.

Include tests for:

- Happy path scenarios
- Edge cases (null, undefined, empty, boundary values)
- Error conditions
- Special characters and large data

### 3. Implement Minimal Code (GREEN)

Write only enough code to make the failing tests pass. No more.

### 4. Run Tests — Verify PASS

All tests must pass. If any fail, fix the implementation (not the tests).

### 5. Refactor (IMPROVE)

Improve code quality while keeping all tests green:

- Remove duplication
- Improve naming
- Optimize performance

### 6. Verify Coverage

```bash
npm run test:coverage
```

Required: 80%+ for all metrics. 100% for financial, auth, and security code.

## Test Naming Convention

```
should [expected behavior] when [condition]
```

## Rules

- **NEVER** write implementation before tests
- **ALWAYS** verify tests fail before implementing (RED phase is mandatory)
- **ALWAYS** verify tests pass after implementing
- Tests must be independent — no shared mutable state
- Mock external dependencies, not internal logic
