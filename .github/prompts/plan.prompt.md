---
description: "Create a comprehensive implementation plan before writing any code. Restates requirements, identifies risks, breaks work into phases, and waits for confirmation."
---

# Plan

Create a comprehensive implementation plan for the requested feature or change.

## Steps

1. **Restate Requirements** — Translate the request into clear, specific requirements. Identify implicit assumptions.

2. **Assess Codebase** — Read relevant existing files to understand current architecture, patterns, and conventions.

3. **Break Down into Phases** — Create ordered implementation phases. Each phase should be independently testable and take 1-3 hours max.

4. **Identify Risks** — For each risk, estimate severity (HIGH/MEDIUM/LOW) and propose mitigation.

5. **Present the Plan** — Use this format:

```markdown
# Implementation Plan: [Feature Name]

## Requirements Restatement

- [Requirement 1]
- [Requirement 2]

## Implementation Phases

### Phase 1: [Name] (Size: S/M/L)

- Step 1: ...
- Files affected: ...

### Phase 2: [Name] (Size: S/M/L)

- ...

## Dependencies

- [Dependency 1]

## Risks

- HIGH: [Risk and mitigation]
- MEDIUM: [Risk and mitigation]

## Estimated Complexity: [HIGH/MEDIUM/LOW]
```

6. **WAIT for user confirmation** before writing any code.

## Important

- **NEVER** write code until the user confirms the plan
- If the user says "modify", adjust and re-present
- Match existing codebase patterns
- Identify the smallest useful increment
