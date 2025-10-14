# Quick Start - Playwright Testing with MFA ✅

## Step 1: Capture Your Authentication Session

Run this command and log in manually:

```bash
node scripts/capture-auth-final.js
```

**What happens:**
1. Browser opens automatically to the admin portal
2. You complete Microsoft login + MFA
3. Script automatically detects when dashboard loads
4. Captures sessionStorage (where MSAL stores tokens) + cookies
5. Saves to `playwright/.auth/user.json`
6. Browser closes

**This only needs to be done once** (or when session expires after ~1-2 weeks)

## Step 2: Run Tests

Now run tests normally - they'll use your saved session:

```bash
# Run all tests (headless)
npm run test:e2e

# Watch tests run (with browser visible)
npm run test:e2e:headed

# Interactive mode
npm run test:e2e:ui
```

## Step 3: View Results

```bash
npm run test:e2e:report
```

## Troubleshooting

### "401 Unauthorized" errors?

Your session expired. Repeat Step 1 to capture a fresh session.

### Tests timing out?

Try running in headed mode to see what's happening:

```bash
npm run test:e2e:headed
```

### Need to debug?

```bash
npm run test:e2e:debug
```

---

**That's it!** Tests will now work despite MFA being enabled.
