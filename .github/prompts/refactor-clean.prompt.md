---
description: "Safely identify and remove dead code with test verification at every step. Finds unused exports, files, and dependencies."
---

# Refactor Clean

Safely identify and remove dead code with test verification at every step.

## Process

### Step 1: Detect Dead Code

Run analysis tools:

| Tool     | What It Finds                       | Command        |
| -------- | ----------------------------------- | -------------- |
| knip     | Unused exports, files, dependencies | `npx knip`     |
| depcheck | Unused npm dependencies             | `npx depcheck` |
| ts-prune | Unused TypeScript exports           | `npx ts-prune` |

If no tool is available, use search to find exports with zero imports.

### Step 2: Categorize Findings

| Tier        | Examples                                     | Action                    |
| ----------- | -------------------------------------------- | ------------------------- |
| **SAFE**    | Unused utilities, internal functions         | Delete with confidence    |
| **CAUTION** | Components, API routes, middleware           | Verify no dynamic imports |
| **DANGER**  | Config files, entry points, type definitions | Investigate first         |

### Step 3: Safe Deletion Loop

For each SAFE item:

1. **Run full test suite** — Establish green baseline
2. **Delete the dead code**
3. **Re-run tests** — Verify nothing broke
4. **If tests fail** — Immediately revert and skip this item
5. **If tests pass** — Move to next item

### Step 4: Handle CAUTION Items

Before deleting:

- Search for dynamic imports: `import()`, `require()`
- Search for string references in configs
- Check if exported from public API
- Verify no external consumers

### Step 5: Consolidate Duplicates

After removing dead code, look for:

- Near-duplicate functions (>80% similar) — merge
- Redundant type definitions — consolidate
- Wrapper functions adding no value — inline
- Re-exports serving no purpose — remove

### Step 6: Summary

```
Dead Code Cleanup
──────────────────────────────
Deleted:   N unused functions
           N unused files
           N unused dependencies
Skipped:   N items (tests failed)
Saved:     ~N lines removed
──────────────────────────────
All tests passing ✓
```

## Rules

- **Never delete without running tests first**
- **One deletion at a time** — Atomic changes make rollback easy
- **Skip if uncertain** — Better to keep dead code than break production
- **Don't refactor while cleaning** — Clean first, refactor later
