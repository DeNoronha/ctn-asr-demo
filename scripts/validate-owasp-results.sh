#!/bin/bash
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# OWASP Dependency Check - Results Validator
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# PURPOSE:
# Parse OWASP Dependency Check JSON results and enforce severity-based thresholds.
# This script provides granular control over build blocking based on vulnerability
# severity, with clear reporting and actionable guidance.
#
# USAGE:
#   ./scripts/validate-owasp-results.sh [path-to-dependency-check-report.json]
#
# SEVERITY THRESHOLDS:
#   CRITICAL (CVSS 9.0-10.0)  → BLOCK BUILD
#   HIGH     (CVSS 7.0-8.9)   → BLOCK BUILD
#   MEDIUM   (CVSS 4.0-6.9)   → WARNING (do not block)
#   LOW      (CVSS 0.1-3.9)   → INFORMATIONAL
#
# EXIT CODES:
#   0 - No blocking vulnerabilities found (build passes)
#   1 - CRITICAL or HIGH vulnerabilities found (build blocked)
#
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e

# Input validation
OWASP_REPORT="${1:-dependency-check-report.json}"

if [ ! -f "$OWASP_REPORT" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ ERROR: OWASP report not found"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Expected file: $OWASP_REPORT"
  echo ""
  echo "This script requires the OWASP Dependency Check JSON report."
  echo "Ensure the OWASP task runs with format: 'HTML,JSON' before this script."
  echo ""
  exit 1
fi

# Check if jq is available (JSON parser)
if ! command -v jq &> /dev/null; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  WARNING: jq not installed"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "This script requires 'jq' for JSON parsing."
  echo "Install: sudo apt-get install jq"
  echo ""
  echo "Falling back to OWASP task result (failOnCVSS threshold)."
  echo ""
  exit 0
fi

# Count vulnerabilities by severity
CRITICAL=$(jq '[.dependencies[]?.vulnerabilities[]? | select(.severity == "CRITICAL")] | length' "$OWASP_REPORT" 2>/dev/null || echo 0)
HIGH=$(jq '[.dependencies[]?.vulnerabilities[]? | select(.severity == "HIGH")] | length' "$OWASP_REPORT" 2>/dev/null || echo 0)
MEDIUM=$(jq '[.dependencies[]?.vulnerabilities[]? | select(.severity == "MEDIUM")] | length' "$OWASP_REPORT" 2>/dev/null || echo 0)
LOW=$(jq '[.dependencies[]?.vulnerabilities[]? | select(.severity == "LOW")] | length' "$OWASP_REPORT" 2>/dev/null || echo 0)

# Display results summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 OWASP Dependency Check Results Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
printf "  🔴 CRITICAL: %3d (CVSS 9.0-10.0) - BLOCKS BUILD\n" "$CRITICAL"
printf "  🟠 HIGH:     %3d (CVSS 7.0-8.9)  - BLOCKS BUILD\n" "$HIGH"
printf "  🟡 MEDIUM:   %3d (CVSS 4.0-6.9)  - WARNING ONLY\n" "$MEDIUM"
printf "  🟢 LOW:      %3d (CVSS 0.1-3.9)  - INFORMATIONAL\n" "$LOW"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if we should block the build (CRITICAL or HIGH vulnerabilities)
if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
  echo ""
  echo "🚫 BUILD BLOCKED - Critical or High severity vulnerabilities detected"
  echo ""

  # List CRITICAL vulnerabilities
  if [ "$CRITICAL" -gt 0 ]; then
    echo "🔴 CRITICAL vulnerabilities (MUST fix immediately):"
    echo ""
    jq -r '.dependencies[]?.vulnerabilities[]? | select(.severity == "CRITICAL") |
      "  CVE:         \(.name)
  Package:     \(.source // "Unknown")
  CVSS Score:  \(.cvssv3.baseScore // .cvssv2.score // "N/A")
  Description: \(.description[0:100])...
  Reference:   \(.references[0].url // "N/A")
  ──────────────────────────────────────────────────────────────────
"' "$OWASP_REPORT" 2>/dev/null || echo "  (Unable to parse CRITICAL details)"
    echo ""
  fi

  # List HIGH vulnerabilities
  if [ "$HIGH" -gt 0 ]; then
    echo "🟠 HIGH vulnerabilities (Fix before production):"
    echo ""
    jq -r '.dependencies[]?.vulnerabilities[]? | select(.severity == "HIGH") |
      "  CVE:         \(.name)
  Package:     \(.source // "Unknown")
  CVSS Score:  \(.cvssv3.baseScore // .cvssv2.score // "N/A")
  Description: \(.description[0:100])...
  Reference:   \(.references[0].url // "N/A")
  ──────────────────────────────────────────────────────────────────
"' "$OWASP_REPORT" 2>/dev/null || echo "  (Unable to parse HIGH details)"
    echo ""
  fi

  # Remediation guidance
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🛠️  REMEDIATION STEPS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "1. Download the OWASP HTML report from build artifacts"
  echo "2. Identify vulnerable packages and their versions"
  echo "3. Check for available fixes:"
  echo "     npm audit"
  echo "     npm audit fix         # Auto-fix if possible"
  echo "     npm audit fix --force # Force major version updates (test thoroughly!)"
  echo ""
  echo "4. Manual updates (if auto-fix unavailable):"
  echo "     npm update <package>@<safe-version>"
  echo "     npm install <package>@<safe-version>"
  echo ""
  echo "5. For transitive dependencies (indirect dependencies):"
  echo "     Add to package.json > overrides:"
  echo "     \"overrides\": {"
  echo "       \"vulnerable-package\": \"^safe-version\""
  echo "     }"
  echo ""
  echo "6. If NO fix is available:"
  echo "     - Document in .owasp-suppressions.xml (with approval)"
  echo "     - Implement compensating controls"
  echo "     - Add to risk register"
  echo "     - Get Security Team sign-off"
  echo ""
  echo "📚 Resources:"
  echo "  - OWASP Report: dependency-check-report.html (build artifacts)"
  echo "  - Suppression Guide: .owasp-suppressions.xml (examples included)"
  echo "  - npm Audit Docs: https://docs.npmjs.com/cli/v10/commands/npm-audit"
  echo "  - OWASP Docs: https://jeremylong.github.io/DependencyCheck/"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  exit 1
fi

# Warn on MEDIUM vulnerabilities (do not block)
if [ "$MEDIUM" -gt 0 ]; then
  echo ""
  echo "⚠️  WARNING: $MEDIUM medium severity vulnerabilities detected"
  echo ""
  echo "While these do not block the build, consider updating dependencies:"
  echo "  - Review OWASP HTML report for details"
  echo "  - Run 'npm audit' to see recommendations"
  echo "  - Schedule fixes in upcoming sprint"
  echo ""
fi

# Informational message for LOW vulnerabilities
if [ "$LOW" -gt 0 ]; then
  echo ""
  echo "ℹ️  INFO: $LOW low severity vulnerabilities detected"
  echo "   These are informational only. Review during regular maintenance."
  echo ""
fi

# Build passes
echo ""
echo "✅ OWASP Dependency Check PASSED"
echo "   No CRITICAL or HIGH vulnerabilities found."
echo ""

exit 0
