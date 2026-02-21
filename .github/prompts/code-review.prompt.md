---
description: "Comprehensive security and quality review of code changes. Checks for OWASP vulnerabilities, code quality issues, and best practices violations."
---

# Code Review

Perform a comprehensive review of the current code changes.

## Process

1. **Get changed files**: `git diff --name-only HEAD`

2. **For each changed file, check:**

### Security Issues (CRITICAL)

- Hardcoded credentials, API keys, tokens
- SQL injection vulnerabilities
- XSS vulnerabilities
- Missing input validation
- Insecure dependencies
- Path traversal risks
- Missing authentication checks

### Code Quality (HIGH)

- Functions > 50 lines
- Files > 800 lines
- Nesting depth > 4 levels
- Missing error handling
- `console.log` statements
- Object/array mutations (use immutable patterns)
- Missing TypeScript types

### Best Practices (MEDIUM)

- TODO/FIXME without issue references
- Missing tests for new code
- Missing JSDoc for public APIs
- Accessibility issues

3. **Generate report** with severity, file location, issue description, and suggested fix

4. **Block** if CRITICAL issues found. **Warn** for HIGH issues.

## Output Format

```
[SEVERITY] Issue title
File: path/to/file.ts:line
Issue: Description
Fix: Suggestion

## Review Summary
| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 0     | pass   |
| HIGH     | 0     | pass   |

Verdict: APPROVE / WARNING / BLOCK
```
