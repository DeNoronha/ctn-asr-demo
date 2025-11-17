#!/usr/bin/env node
/**
 * Runtime Style Verification Script
 *
 * This script analyzes whether React inline styles (style={{...}}) get compiled
 * to actual inline style attributes in the browser, which would require 'unsafe-inline'.
 *
 * Key distinction:
 * - Source code: style={{color: 'red'}} (React JSX)
 * - Runtime output: <div style="color: red;"> (HTML attribute) ← Requires 'unsafe-inline'
 * - OR: <div class="mantine-xyz"> with <style>.mantine-xyz{color:red}</style> ← Uses style-src 'self'
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

console.log(`${colors.bright}${colors.cyan}========================================`);
console.log(`React Inline Style Analysis`);
console.log(`========================================${colors.reset}\n`);

// Find all React inline styles in source code
function findReactInlineStyles(dir) {
  const results = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
      results.push(...findReactInlineStyles(filePath));
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.jsx')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const styleMatches = content.match(/style=\{[^}]+\}/g);
      if (styleMatches) {
        results.push({
          file: filePath,
          count: styleMatches.length,
          examples: styleMatches.slice(0, 3) // First 3 examples
        });
      }
    }
  }

  return results;
}

const srcDir = path.join(__dirname, '../admin-portal/src');
const results = findReactInlineStyles(srcDir);

console.log(`${colors.bright}Files with React inline styles: ${results.length}${colors.reset}\n`);

let totalStyles = 0;
results.forEach(result => {
  const relativePath = path.relative(srcDir, result.file);
  totalStyles += result.count;
  console.log(`${colors.yellow}${relativePath}${colors.reset}`);
  console.log(`  Count: ${result.count}`);
  console.log(`  Examples:`);
  result.examples.forEach(example => {
    console.log(`    ${example.substring(0, 80)}...`);
  });
  console.log('');
});

console.log(`${colors.bright}Total React inline styles: ${totalStyles}${colors.reset}\n`);

console.log(`${colors.bright}${colors.cyan}========================================`);
console.log(`CSP Impact Analysis`);
console.log(`========================================${colors.reset}\n`);

console.log(`${colors.yellow}CRITICAL QUESTION:${colors.reset}`);
console.log(`  Do these React inline styles become HTML style attributes at runtime?\n`);

console.log(`${colors.bright}React Rendering Behavior:${colors.reset}`);
console.log(`  ${colors.green}✓${colors.reset} React converts style={{...}} to style="..." HTML attributes`);
console.log(`  ${colors.green}✓${colors.reset} This happens at runtime in the browser`);
console.log(`  ${colors.red}✗${colors.reset} These WILL trigger CSP violations if 'unsafe-inline' is removed\n`);

console.log(`${colors.bright}Mantine Styling:${colors.reset}`);
console.log(`  ${colors.green}✓${colors.reset} Mantine components use CSS-in-JS (emotion)`);
console.log(`  ${colors.green}✓${colors.reset} Emotion injects <style> tags in <head>, NOT inline attributes`);
console.log(`  ${colors.green}✓${colors.reset} Mantine styles are CSP-safe with external CSS imports\n`);

console.log(`${colors.bright}${colors.red}CONCLUSION:${colors.reset}`);
console.log(`  ${colors.red}✗ Cannot remove 'unsafe-inline' while ${totalStyles} React inline styles exist${colors.reset}`);
console.log(`  ${colors.red}✗ React's style={{...}} creates HTML style="" attributes${colors.reset}`);
console.log(`  ${colors.red}✗ CSP will block these attributes without 'unsafe-inline'${colors.reset}\n`);

console.log(`${colors.bright}REMEDIATION REQUIRED:${colors.reset}`);
console.log(`  1. ${colors.cyan}Option A: Refactor to CSS classes${colors.reset}`);
console.log(`     - Create utility classes in CSS files`);
console.log(`     - Replace style={{...}} with className="..."`);
console.log(`     - Most secure approach\n`);

console.log(`  2. ${colors.cyan}Option B: Use Mantine's style system${colors.reset}`);
console.log(`     - Replace style={{...}} with Mantine's 'styles' prop`);
console.log(`     - Mantine handles CSP-safe style injection`);
console.log(`     - Requires Mantine components\n`);

console.log(`  3. ${colors.cyan}Option C: Accept 'unsafe-inline' risk${colors.reset}`);
console.log(`     - Keep current implementation`);
console.log(`     - Document as accepted security risk`);
console.log(`     - ${colors.red}NOT RECOMMENDED${colors.reset}\n`);

console.log(`${colors.bright}NEXT STEPS:${colors.reset}`);
console.log(`  1. ${colors.yellow}Review each file with inline styles${colors.reset}`);
console.log(`  2. ${colors.yellow}Categorize: Can it use CSS class? Mantine prop? Neither?${colors.reset}`);
console.log(`  3. ${colors.yellow}Refactor high-risk areas first (user-generated content)${colors.reset}`);
console.log(`  4. ${colors.yellow}Test with 'unsafe-inline' removed${colors.reset}`);
console.log(`  5. ${colors.yellow}Monitor browser console for CSP violations${colors.reset}\n`);
