---
applyTo: "**"
---

# Git Workflow

## Commit Message Format

```
<type>: <description>

<optional body>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

## Pull Request Workflow

When creating PRs:

1. Analyze full commit history (not just latest commit)
2. Use `git diff [base-branch]...HEAD` to see all changes
3. Draft comprehensive PR summary
4. Include test plan
5. Push with `-u` flag if new branch

## Feature Implementation Workflow

1. **Plan First** — Break down into phases, identify dependencies and risks
2. **TDD Approach** — Write tests first (RED), implement to pass (GREEN), refactor (IMPROVE), verify 80%+ coverage
3. **Code Review** — Review for security, quality, and best practices. Address CRITICAL and HIGH issues.
4. **Commit & Push** — Detailed commit messages following conventional commits
