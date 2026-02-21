---
description: "Incrementally fix build and type errors with minimal, safe changes. Fixes one error at a time and re-verifies after each fix."
---

# Build Fix

Incrementally fix build and type errors with minimal, safe changes.

## Process

### Step 1: Detect Build System and Run Build

| Indicator                          | Command            |
| ---------------------------------- | ------------------ |
| `package.json` with `build` script | `npm run build`    |
| `tsconfig.json` (TypeScript only)  | `npx tsc --noEmit` |

### Step 2: Parse and Group Errors

1. Capture build output
2. Group errors by file path
3. Sort by dependency order (fix imports/types before logic errors)
4. Count total errors for progress tracking

### Step 3: Fix Loop (One Error at a Time)

For each error:

1. **Read the file** — See error context (10 lines around the error)
2. **Diagnose** — Identify root cause (missing import, wrong type, syntax)
3. **Fix minimally** — Smallest change that resolves the error
4. **Re-run build** — Verify the error is gone and no new errors introduced
5. **Move to next** — Continue with remaining errors

### Step 4: Guardrails

**Stop and ask the user if:**

- A fix introduces more errors than it resolves
- The same error persists after 3 attempts
- The fix requires architectural changes
- Build errors stem from missing dependencies

### Step 5: Summary

Report:

- Errors fixed (with file paths)
- Errors remaining (if any)
- New errors introduced (should be zero)
- Suggested next steps

## Rules

- Fix **one error at a time** for safety
- Prefer **minimal diffs** over refactoring
- Never introduce new dependencies without asking
- If uncertain, ask before changing
