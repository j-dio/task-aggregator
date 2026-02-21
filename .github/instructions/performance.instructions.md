---
applyTo: "**/*.{ts,tsx,js,jsx}"
---

# Performance Standards

## Algorithm Complexity

- Prefer `O(n)` or `O(n log n)` algorithms over `O(n²)`
- Use memoization for expensive computations
- Profile before optimizing — measure, don't guess

## React Performance

- Use `useMemo` for expensive computations
- Use `useCallback` for stable function references passed as props
- Use `React.memo` for components that render often with same props
- Lazy load heavy components and routes with `React.lazy` / `next/dynamic`
- Avoid unnecessary re-renders from missing dependency arrays

```tsx
// BAD: Recomputed every render
const sorted = items.sort((a, b) => a.name.localeCompare(b.name));

// GOOD: Memoized
const sorted = useMemo(
  () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
  [items],
);
```

## Database Performance

- Add proper indexes for frequently queried columns
- Use parameterized queries (also prevents SQL injection)
- Avoid N+1 query patterns — use JOINs or batch queries
- Add LIMIT to user-facing queries
- Use `SELECT` with specific columns instead of `SELECT *`

```typescript
// BAD: N+1 query
const users = await db.query("SELECT * FROM users");
for (const user of users) {
  user.posts = await db.query("SELECT * FROM posts WHERE user_id = $1", [
    user.id,
  ]);
}

// GOOD: Single query with JOIN
const usersWithPosts = await db.query(`
  SELECT u.*, json_agg(p.*) as posts
  FROM users u
  LEFT JOIN posts p ON p.user_id = u.id
  GROUP BY u.id
`);
```

## Network Performance

- Minimize network requests — batch where possible
- Add timeouts to all external HTTP calls
- Use caching strategies (Redis, CDN, HTTP cache headers)
- Implement retry logic with exponential backoff for transient failures

## Bundle Size

- Import only what you need (tree-shakeable imports)
- Use `import { specific } from 'lib'` not `import * as lib from 'lib'`
- Analyze bundle with `next/bundle-analyzer` or similar tools
- Code-split routes and heavy components
