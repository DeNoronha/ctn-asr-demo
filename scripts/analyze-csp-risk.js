#!/usr/bin/env node
/**
 * CSP Risk Analysis Script
 *
 * Analyzes inline styles by security risk level to prioritize remediation.
 * High-risk: User input, dynamic content, external data
 * Medium-risk: Common patterns (colors, spacing)
 * Low-risk: Static layouts, internal components
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

// Define risk patterns
const riskPatterns = {
  HIGH: [
    // User input or dynamic content
    { pattern: /getStatusColor|getVerificationColor|getContactTypeColor|getMembershipColor/, reason: 'Dynamic color based on user data (IDOR risk)' },
    { pattern: /member\.|contact\.|identifier\.|record\./, reason: 'Rendering user/member data (XSS vector)' },
  ],
  MEDIUM: [
    // Common patterns that can be refactored to utilities
    { pattern: /color:\s*['"]#[0-9a-f]{3,6}['"]/, reason: 'Hardcoded color (can use CSS variable or class)' },
    { pattern: /fontSize:\s*['"]/, reason: 'Font size (can use text utility class)' },
    { pattern: /margin|padding/, reason: 'Spacing (can use utility class)' },
    { pattern: /backgroundColor/, reason: 'Background color (can use CSS class)' },
  ],
  LOW: [
    // Static layout properties
    { pattern: /display:\s*['"]flex['"]/, reason: 'Flex layout (static, low risk)' },
    { pattern: /width:\s*['"]/, reason: 'Width (static sizing)' },
    { pattern: /minWidth|maxWidth/, reason: 'Width constraints (static)' },
  ]
};

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results = {
    HIGH: [],
    MEDIUM: [],
    LOW: [],
    UNKNOWN: []
  };

  lines.forEach((line, index) => {
    const styleMatch = line.match(/style=\{[^}]+\}/);
    if (styleMatch) {
      const lineNumber = index + 1;
      const styleContent = styleMatch[0];

      let categorized = false;

      // Check HIGH risk first
      for (const { pattern, reason } of riskPatterns.HIGH) {
        if (pattern.test(styleContent) || pattern.test(content)) {
          results.HIGH.push({ line: lineNumber, content: styleContent.substring(0, 80), reason });
          categorized = true;
          break;
        }
      }

      if (!categorized) {
        // Check MEDIUM risk
        for (const { pattern, reason } of riskPatterns.MEDIUM) {
          if (pattern.test(styleContent)) {
            results.MEDIUM.push({ line: lineNumber, content: styleContent.substring(0, 80), reason });
            categorized = true;
            break;
          }
        }
      }

      if (!categorized) {
        // Check LOW risk
        for (const { pattern, reason } of riskPatterns.LOW) {
          if (pattern.test(styleContent)) {
            results.LOW.push({ line: lineNumber, content: styleContent.substring(0, 80), reason });
            categorized = true;
            break;
          }
        }
      }

      if (!categorized) {
        results.UNKNOWN.push({ line: lineNumber, content: styleContent.substring(0, 80) });
      }
    }
  });

  return results;
}

function findReactFiles(dir) {
  const results = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
      results.push(...findReactFiles(filePath));
    } else if ((file.name.endsWith('.tsx') || file.name.endsWith('.jsx')) && !file.name.includes('.test.')) {
      results.push(filePath);
    }
  }

  return results;
}

console.log(`${colors.bright}${colors.cyan}========================================`);
console.log(`CSP Security Risk Analysis`);
console.log(`TASK-SEC-005: Inline Style Risk Assessment`);
console.log(`========================================${colors.reset}\n`);

const srcDir = path.join(__dirname, '../admin-portal/src');
const files = findReactFiles(srcDir);

const aggregated = {
  HIGH: {},
  MEDIUM: {},
  LOW: {},
  UNKNOWN: {}
};

let totalHigh = 0;
let totalMedium = 0;
let totalLow = 0;
let totalUnknown = 0;

files.forEach(file => {
  const relativePath = path.relative(srcDir, file);
  const analysis = analyzeFile(file);

  if (analysis.HIGH.length > 0) {
    aggregated.HIGH[relativePath] = analysis.HIGH;
    totalHigh += analysis.HIGH.length;
  }
  if (analysis.MEDIUM.length > 0) {
    aggregated.MEDIUM[relativePath] = analysis.MEDIUM;
    totalMedium += analysis.MEDIUM.length;
  }
  if (analysis.LOW.length > 0) {
    aggregated.LOW[relativePath] = analysis.LOW;
    totalLow += analysis.LOW.length;
  }
  if (analysis.UNKNOWN.length > 0) {
    aggregated.UNKNOWN[relativePath] = analysis.UNKNOWN;
    totalUnknown += analysis.UNKNOWN.length;
  }
});

console.log(`${colors.bright}SUMMARY:${colors.reset}`);
console.log(`  ${colors.red}HIGH Risk:${colors.reset} ${totalHigh} inline styles (user data, dynamic content)`);
console.log(`  ${colors.yellow}MEDIUM Risk:${colors.reset} ${totalMedium} inline styles (refactorable to utilities)`);
console.log(`  ${colors.green}LOW Risk:${colors.reset} ${totalLow} inline styles (static layout)`);
console.log(`  ${colors.cyan}UNKNOWN:${colors.reset} ${totalUnknown} inline styles (needs manual review)\n`);

// HIGH RISK FILES
if (totalHigh > 0) {
  console.log(`${colors.bright}${colors.red}========================================`);
  console.log(`HIGH RISK FILES (Priority 1)`);
  console.log(`========================================${colors.reset}\n`);

  for (const [file, styles] of Object.entries(aggregated.HIGH)) {
    console.log(`${colors.red}${file}${colors.reset}`);
    console.log(`  Count: ${styles.length}`);
    console.log(`  Risk: ${styles[0].reason}`);
    console.log(`  Lines: ${styles.map(s => s.line).join(', ')}`);
    console.log('');
  }
}

// MEDIUM RISK FILES (top 10)
if (totalMedium > 0) {
  console.log(`${colors.bright}${colors.yellow}========================================`);
  console.log(`MEDIUM RISK FILES (Priority 2) - Top 10`);
  console.log(`========================================${colors.reset}\n`);

  const mediumFiles = Object.entries(aggregated.MEDIUM)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);

  for (const [file, styles] of mediumFiles) {
    console.log(`${colors.yellow}${file}${colors.reset}`);
    console.log(`  Count: ${styles.length}`);
    console.log(`  Common patterns: ${styles[0].reason}`);
    console.log('');
  }
}

console.log(`${colors.bright}${colors.cyan}========================================`);
console.log(`REMEDIATION STRATEGY`);
console.log(`========================================${colors.reset}\n`);

console.log(`${colors.bright}Phase 1: HIGH RISK (CRITICAL - Do First)${colors.reset}`);
console.log(`  Files: ${Object.keys(aggregated.HIGH).length}`);
console.log(`  Inline styles: ${totalHigh}`);
console.log(`  ${colors.red}WHY CRITICAL:${colors.reset} These styles use user-controlled data`);
console.log(`  ${colors.red}XSS RISK:${colors.reset} If attacker controls color/status, they control CSS`);
console.log(`  ${colors.red}IDOR RISK:${colors.reset} Status colors may leak authorization state`);
console.log(`  ${colors.green}SOLUTION:${colors.reset} Validate user data, use CSS classes, sanitize inputs\n`);

console.log(`${colors.bright}Phase 2: MEDIUM RISK (High Impact, Easy Wins)${colors.reset}`);
console.log(`  Files: ${Object.keys(aggregated.MEDIUM).length}`);
console.log(`  Inline styles: ${totalMedium}`);
console.log(`  ${colors.yellow}WHY IMPORTANT:${colors.reset} Most can be replaced with utility classes`);
console.log(`  ${colors.green}SOLUTION:${colors.reset} Extend security-utilities.css, bulk refactor\n`);

console.log(`${colors.bright}Phase 3: LOW RISK (Can defer or accept)${colors.reset}`);
console.log(`  Files: ${Object.keys(aggregated.LOW).length}`);
console.log(`  Inline styles: ${totalLow}`);
console.log(`  ${colors.green}WHY LOW:${colors.reset} Static layout properties, no user data`);
console.log(`  ${colors.green}SOLUTION:${colors.reset} Accept risk OR refactor over time\n`);

console.log(`${colors.bright}RECOMMENDED ACTION:${colors.reset}`);
console.log(`  ${colors.red}1. BLOCK MERGE${colors.reset} until HIGH risk files are refactored`);
console.log(`  ${colors.yellow}2. APPROVE WITH CONDITIONS${colors.reset} if MEDIUM risk addressed`);
console.log(`  ${colors.green}3. Document${colors.reset} LOW risk as accepted technical debt\n`);

console.log(`${colors.bright}ESTIMATED EFFORT:${colors.reset}`);
console.log(`  Phase 1 (HIGH): ${Math.ceil(totalHigh / 10)} hours (10 styles/hour)`);
console.log(`  Phase 2 (MEDIUM): ${Math.ceil(totalMedium / 20)} hours (20 styles/hour, bulk refactor)`);
console.log(`  Phase 3 (LOW): ${Math.ceil(totalLow / 30)} hours (30 styles/hour, optional)`);
console.log(`  ${colors.bright}Total: ~${Math.ceil(totalHigh / 10 + totalMedium / 20 + totalLow / 30)} hours${colors.reset}\n`);

// Generate report file
const reportPath = path.join(__dirname, '../docs/SEC-005-CSP-RISK-ANALYSIS.md');
let report = `# TASK-SEC-005: CSP Inline Style Risk Analysis

**Generated:** ${new Date().toISOString()}
**Total Files Analyzed:** ${files.length}
**Total Inline Styles:** ${totalHigh + totalMedium + totalLow + totalUnknown}

## Risk Summary

| Risk Level | Count | Priority | Impact |
|------------|-------|----------|--------|
| HIGH       | ${totalHigh} | P1 (Critical) | User data in styles = XSS/IDOR risk |
| MEDIUM     | ${totalMedium} | P2 (High) | Refactorable to utilities |
| LOW        | ${totalLow} | P3 (Low) | Static layout, minimal risk |
| UNKNOWN    | ${totalUnknown} | P2 (High) | Needs manual review |

## HIGH RISK FILES (Priority 1)

`;

for (const [file, styles] of Object.entries(aggregated.HIGH)) {
  report += `### ${file}\n\n`;
  report += `- **Count:** ${styles.length}\n`;
  report += `- **Risk:** ${styles[0].reason}\n`;
  report += `- **Lines:** ${styles.map(s => s.line).join(', ')}\n`;
  report += `- **Action Required:** Refactor before removing 'unsafe-inline'\n\n`;
}

report += `## MEDIUM RISK FILES (Priority 2 - Top 20)\n\n`;

const mediumFiles = Object.entries(aggregated.MEDIUM)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 20);

for (const [file, styles] of mediumFiles) {
  report += `### ${file}\n\n`;
  report += `- **Count:** ${styles.length}\n`;
  report += `- **Common Pattern:** ${styles[0].reason}\n`;
  report += `- **Recommendation:** Extend security-utilities.css\n\n`;
}

report += `## Remediation Plan

### Phase 1: HIGH RISK (Critical)
- **Files:** ${Object.keys(aggregated.HIGH).length}
- **Effort:** ${Math.ceil(totalHigh / 10)} hours
- **Action:** Refactor all files with user-controlled data in styles
- **Blocker:** Cannot remove 'unsafe-inline' until complete

### Phase 2: MEDIUM RISK (High Impact)
- **Files:** ${Object.keys(aggregated.MEDIUM).length}
- **Effort:** ${Math.ceil(totalMedium / 20)} hours
- **Action:** Create utility classes, bulk refactor
- **Nice-to-have:** Improves CSP posture significantly

### Phase 3: LOW RISK (Optional)
- **Files:** ${Object.keys(aggregated.LOW).length}
- **Effort:** ${Math.ceil(totalLow / 30)} hours
- **Action:** Defer or document as accepted risk
- **Note:** Static layouts pose minimal XSS risk

## Security Impact

### Current CSP (with 'unsafe-inline'):
\`\`\`
style-src 'self' 'unsafe-inline'
\`\`\`

**Risk:** Any XSS vulnerability allows attacker to inject malicious styles:
- Data exfiltration via CSS injection
- UI redressing attacks
- Phishing overlays

### Target CSP (without 'unsafe-inline'):
\`\`\`
style-src 'self'
\`\`\`

**Benefit:** Blocks ALL inline styles, including malicious ones
**Requirement:** Zero inline style attributes in DOM

## Merge Gate Recommendation

**Status:** 🛑 BLOCK

**Rationale:**
- ${totalHigh} HIGH risk inline styles with user data
- Cannot safely remove 'unsafe-inline' in current state
- XSS risk if attacker controls member status, verification status, etc.

**Conditions for APPROVE:**
1. Refactor all HIGH risk files (${Object.keys(aggregated.HIGH).length} files)
2. Validate and sanitize all user data used in dynamic styles
3. Test with CSP 'unsafe-inline' removed
4. No console CSP violations

**Post-Merge Actions:**
1. Create tracking issue for MEDIUM risk refactoring
2. Document LOW risk as accepted technical debt
3. Add CSP monitoring to detect new violations
`;

fs.writeFileSync(reportPath, report);
console.log(`${colors.green}✓ Report saved to: docs/SEC-005-CSP-RISK-ANALYSIS.md${colors.reset}\n`);
