---
applyTo: "**/*.{ts,tsx,js,jsx}"
---

# Security Standards

## Secret Management

```typescript
// NEVER: Hardcoded secrets
const apiKey = "sk-proj-xxxxx";

// ALWAYS: Environment variables
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY not configured");
}
```

## OWASP Top 10 Checklist

1. **Injection** — Parameterize all queries. Never concatenate user input into SQL strings.
2. **Broken Auth** — Hash passwords with bcrypt/argon2. Validate JWTs. Secure sessions.
3. **Sensitive Data** — Enforce HTTPS. Keep secrets in env vars. Encrypt PII. Sanitize logs.
4. **XXE** — Configure XML parsers securely. Disable external entities.
5. **Broken Access** — Check auth on every route. Configure CORS properly.
6. **Misconfiguration** — Change default creds. Disable debug mode in prod. Set security headers.
7. **XSS** — Escape output. Set CSP headers. Use framework auto-escaping.
8. **Insecure Deserialization** — Deserialize user input safely. Validate schemas.
9. **Known Vulnerabilities** — Keep dependencies up to date. Run `npm audit` regularly.
10. **Insufficient Logging** — Log security events. Configure alerts.

## Critical Patterns to Flag

| Pattern                       | Severity | Fix                            |
| ----------------------------- | -------- | ------------------------------ |
| Hardcoded secrets             | CRITICAL | Use `process.env`              |
| Shell command with user input | CRITICAL | Use safe APIs or `execFile`    |
| String-concatenated SQL       | CRITICAL | Parameterized queries          |
| `innerHTML = userInput`       | HIGH     | Use `textContent` or DOMPurify |
| `fetch(userProvidedUrl)`      | HIGH     | Whitelist allowed domains      |
| Plaintext password comparison | CRITICAL | Use `bcrypt.compare()`         |
| No auth check on route        | CRITICAL | Add authentication middleware  |
| No rate limiting              | HIGH     | Add `express-rate-limit`       |
| Logging passwords/secrets     | MEDIUM   | Sanitize log output            |

## Key Principles

1. **Defense in Depth** — Multiple layers of security
2. **Least Privilege** — Minimum permissions required
3. **Fail Securely** — Errors should not expose data
4. **Don't Trust Input** — Validate and sanitize everything
5. **Update Regularly** — Keep dependencies current
