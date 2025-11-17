# Semgrep Quick Reference Guide

**Quick Links:**
- [What is Semgrep?](#what-is-semgrep)
- [When Build is Blocked](#when-build-is-blocked)
- [Running Locally](#running-locally)
- [Common Fixes](#common-fixes)
- [Suppressing False Positives](#suppressing-false-positives)

---

## What is Semgrep?

Semgrep is a static analysis security tool that detects vulnerabilities in code **before** deployment.

**What it catches:**
- SQL Injection
- Cross-Site Scripting (XSS)
- Hardcoded Secrets
- Insecure Randomness
- Command Injection
- Path Traversal

**When it runs:**
- Every push to main branch
- During API pipeline execution
- Before code is deployed to production

**Severity Levels:**
- 🔴 **ERROR** → **BLOCKS BUILD** (high-confidence vulnerabilities)
- 🟡 **WARNING** → Non-blocking (potential issues)
- 🔵 **INFO** → Informational (best practices)

---

## When Build is Blocked

### 1. You'll See This Error

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Semgrep SAST Security Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 ERROR:   2 (blocking)
🟡 WARNING: 5 (non-blocking)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚫 BUILD BLOCKED - ERROR severity vulnerabilities detected

  🔴 typescript.lang.security.audit.sql-injection
     File: api/src/functions/GetMembers.ts:45
     Message: Detected string concatenation with SQL query
```

### 2. Download Full Report

1. Go to Azure DevOps pipeline: https://dev.azure.com/ctn-demo/ASR/_build
2. Click on failed build
3. Click "Artifacts" tab
4. Download `Semgrep-Results.json`

### 3. Fix the Vulnerability

See [Common Fixes](#common-fixes) below for specific vulnerability types.

### 4. Re-Push

```bash
git add .
git commit -m "fix(security): resolve SQL injection in GetMembers"
git push origin main
```

---

## Running Locally

### Install Semgrep

```bash
pip install semgrep
```

### Scan All API Code

```bash
semgrep scan --config=auto \
  --config=.semgrep/ignore.yml \
  --severity=ERROR \
  --severity=WARNING \
  api/
```

### Scan Specific File

```bash
semgrep scan --config=auto api/src/functions/GetMembers.ts
```

### Scan Before Commit

```bash
# Only show ERROR severity (what will block build)
semgrep scan --config=auto --severity=ERROR api/
```

---

## Common Fixes

### 1. SQL Injection

**Problem:**
```typescript
// ❌ VULNERABLE - String concatenation
const query = `SELECT * FROM users WHERE id = ${userId}`;
await db.query(query);
```

**Fix:**
```typescript
// ✅ SAFE - Parameterized query
const query = 'SELECT * FROM users WHERE id = $1';
await db.query(query, [userId]);
```

**Why:** User input is treated as data, not executable code.

---

### 2. Cross-Site Scripting (XSS)

**Problem:**
```typescript
// ❌ VULNERABLE - Unescaped HTML
<div dangerouslySetInnerHTML={{__html: userInput}} />
```

**Fix:**
```typescript
// ✅ SAFE - Sanitized HTML
import DOMPurify from 'dompurify';

const sanitized = DOMPurify.sanitize(userInput);
<div dangerouslySetInnerHTML={{__html: sanitized}} />
```

**Why:** DOMPurify removes malicious JavaScript from HTML.

---

### 3. Hardcoded Secrets

**Problem:**
```typescript
// ❌ VULNERABLE - Secret hardcoded in source
const stripeKey = 'sk_live_' + 'EXAMPLE_NOT_REAL';
```

**Fix:**
```typescript
// ✅ SAFE - Load from environment variable
const stripeKey = process.env.STRIPE_API_KEY;

// In Azure: Store in Key Vault
// Local: Add to .env file (gitignored)
```

**Why:** Secrets in code can be exposed via git history or stolen source code.

---

### 4. Insecure Randomness

**Problem:**
```typescript
// ❌ VULNERABLE - Predictable randomness
const token = Math.random().toString(36);
```

**Fix:**
```typescript
// ✅ SAFE - Cryptographically secure randomness
import { randomBytes } from 'crypto';

const token = randomBytes(32).toString('hex');
```

**Why:** Math.random() is predictable and can be guessed by attackers.

---

### 5. Command Injection

**Problem:**
```typescript
// ❌ VULNERABLE - Shell command with user input
exec(`git log ${req.query.branch}`);
```

**Fix:**
```typescript
// ✅ SAFE - Array-based arguments
import { execFile } from 'child_process';

execFile('git', ['log', req.query.branch], (error, stdout) => {
  // Handle result
});
```

**Why:** exec() interprets shell metacharacters (`;`, `|`, `&&`), allowing command injection.

---

### 6. Path Traversal

**Problem:**
```typescript
// ❌ VULNERABLE - User controls file path
const filePath = `./uploads/${req.query.file}`;
fs.readFile(filePath);

// Attack: ?file=../../etc/passwd
```

**Fix:**
```typescript
// ✅ SAFE - Path validation
import path from 'path';

const safeFile = path.basename(req.query.file); // Remove '../'
const filePath = path.resolve('./uploads', safeFile);

// Verify file is in uploads directory
if (!filePath.startsWith(path.resolve('./uploads'))) {
  throw new Error('Invalid file path');
}

fs.readFile(filePath);
```

**Why:** path.basename() removes directory traversal, and we validate the final path.

---

## Suppressing False Positives

### When to Suppress

Only suppress if:
- ✅ You've confirmed it's a false positive
- ✅ Code is actually safe (e.g., uses parameterized queries)
- ✅ You have Security Team approval

**Never suppress** actual vulnerabilities just to unblock the build.

### How to Suppress

#### Step 1: Add to `.semgrep/ignore.yml`

```yaml
rules:
  - id: typescript.lang.security.audit.sql-injection
    paths:
      exclude:
        - api/src/functions/GetMembers.ts
    note: "False positive - uses pg-promise parameterized queries.
          Reviewed 2025-11-17 by Security Team.
          Ticket: SEC-12345"
```

#### Step 2: Get Approval

Email Security Team:
```
Subject: Semgrep False Positive - SQL Injection in GetMembers.ts

Hi Security Team,

Semgrep flagged a SQL injection in GetMembers.ts, but it's a false positive.

Code snippet:
  const query = 'SELECT * FROM members WHERE id = $1';
  await db.query(query, [memberId]);

This uses pg-promise parameterized queries ($1), which is safe.

Can I suppress this finding?

Thanks,
[Your Name]
```

#### Step 3: Commit with Approval Reference

```bash
git commit -m "fix(security): suppress false positive in GetMembers.ts

Suppressed: typescript.lang.security.audit.sql-injection
Justification: Uses pg-promise parameterized queries
Approved by: Security Team (email 2025-11-17)
Ticket: SEC-12345"
```

---

## Troubleshooting

### Build blocked but I don't see the error

**Check:**
1. Go to Azure DevOps: https://dev.azure.com/ctn-demo/ASR/_build
2. Click on failed build
3. Expand "Validate Semgrep Results (BLOCKING on ERROR)" step
4. Look for detailed error message

### Semgrep rule doesn't make sense

**Get details:**
1. Copy rule ID (e.g., `typescript.lang.security.audit.sql-injection`)
2. Visit https://semgrep.dev/r
3. Search for rule ID
4. Read explanation and examples

### I disagree with the finding

**Options:**
1. **Understand why:** Read rule documentation, ask Security Team
2. **Fix the code:** Apply recommended fix (usually the right choice)
3. **Suppress if false positive:** Follow suppression process above

---

## FAQ

### Q: Can I disable Semgrep for urgent hotfixes?

**A:** No. Security cannot be bypassed. If it's truly urgent:
1. Fix the vulnerability (5-10 minutes)
2. Or get Security Team emergency approval for suppression

### Q: What if Semgrep is wrong?

**A:** Semgrep ERROR findings are high-confidence. If you believe it's wrong:
1. Read the rule documentation
2. Ask Security Team to review
3. If confirmed false positive, follow suppression process

### Q: How do I learn more about secure coding?

**Resources:**
- OWASP Top 10: https://owasp.org/Top10/
- Semgrep Rules: https://semgrep.dev/r
- CTN Security Hardening: `docs/arc42/08-crosscutting/ctn-security-hardening.md`

### Q: Does Semgrep scan the entire codebase?

**A:** Currently scans `api/` only. Portal scanning coming soon.

### Q: How long does Semgrep add to build time?

**A:** ~5 seconds (negligible compared to preventing security incidents).

---

## Quick Command Reference

```bash
# Install Semgrep
pip install semgrep

# Scan API code (what pipeline does)
semgrep scan --config=auto --config=.semgrep/ignore.yml api/

# Scan specific file
semgrep scan --config=auto api/src/functions/GetMembers.ts

# Show only ERROR severity
semgrep scan --config=auto --severity=ERROR api/

# Show ERROR and WARNING
semgrep scan --config=auto --severity=ERROR --severity=WARNING api/

# JSON output (for detailed analysis)
semgrep scan --config=auto --json api/ > semgrep-results.json

# Count findings by severity
jq '.results | group_by(.extra.severity) | map({severity: .[0].extra.severity, count: length})' semgrep-results.json
```

---

## Need Help?

1. **Security questions:** Contact Security Team
2. **False positive:** Follow suppression process
3. **General questions:** Check full documentation: `docs/TASK-DG-SEC-002-SEMGREP-BLOCKING-IMPLEMENTATION.md`

---

**Last Updated:** November 17, 2025
**Pipeline:** `.azure-pipelines/asr-api.yml`
**Suppression File:** `.semgrep/ignore.yml`
