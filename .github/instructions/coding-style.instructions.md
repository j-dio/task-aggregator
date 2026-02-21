---
applyTo: "**/*.{ts,tsx,js,jsx}"
---

# Coding Style

## Immutability

Use spread operator for immutable updates. Never mutate objects or arrays directly.

```typescript
// WRONG: Mutation
function updateUser(user, name) {
  user.name = name; // MUTATION!
  return user;
}

// CORRECT: Immutability
function updateUser(user, name) {
  return { ...user, name };
}
```

## Early Returns & Flat Code

Use guard clauses to reduce nesting. Keep code flat and readable.

```typescript
// BAD: Deep nesting + mutation
function processUsers(users) {
  if (users) {
    for (const user of users) {
      if (user.active) {
        if (user.email) {
          user.verified = true;
          results.push(user);
        }
      }
    }
  }
  return results;
}

// GOOD: Early returns + immutability + flat
function processUsers(users) {
  if (!users) return [];
  return users
    .filter((user) => user.active && user.email)
    .map((user) => ({ ...user, verified: true }));
}
```

## File Organization

- **Single responsibility** per file
- **200-400 lines** target, 800 absolute max
- Group by feature, not by type
- Index files only for re-exports

## Input Validation

Use Zod for schema-based validation:

```typescript
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});

const validated = schema.parse(input);
```

## Error Handling

Use async/await with try-catch:

```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error("Operation failed:", error);
  throw new Error("Detailed user-friendly message");
}
```

## Naming Conventions

- **Variables/functions**: `camelCase`
- **Types/interfaces/classes**: `PascalCase`
- **Constants**: `SCREAMING_SNAKE_CASE` for true constants, `camelCase` for config
- **Files**: `kebab-case.ts` for utilities, `PascalCase.tsx` for React components
- **Boolean variables**: prefix with `is`, `has`, `should`, `can`

## No Console.log

Never use `console.log` in production code. Use proper logging libraries instead.
