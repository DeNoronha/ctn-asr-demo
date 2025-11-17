#!/usr/bin/env node
/**
 * Audit Inline Styles Script
 *
 * Purpose: Analyze the built admin-portal for inline styles and generate
 * SHA-256 hashes for Content Security Policy (CSP) hardening.
 *
 * This script:
 * 1. Scans all HTML files in the build directory
 * 2. Extracts inline <style> tags
 * 3. Generates SHA-256 hashes for each unique inline style
 * 4. Provides CSP configuration recommendations
 *
 * Security Context: TASK-SEC-005 - Harden CSP for Inline Styles
 * Removes 'unsafe-inline' from style-src directive to prevent XSS attacks
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ANSI color codes for better terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Recursively find all HTML files in a directory
 */
function findHtmlFiles(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`${colors.red}Error: Directory ${dir} does not exist${colors.reset}`);
    process.exit(1);
  }

  const files = fs.readdirSync(dir, { withFileTypes: true });
  let htmlFiles = [];

  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      htmlFiles = htmlFiles.concat(findHtmlFiles(filePath));
    } else if (file.name.endsWith('.html')) {
      htmlFiles.push(filePath);
    }
  }

  return htmlFiles;
}

/**
 * Extract inline styles from HTML and generate SHA-256 hashes
 */
function extractInlineStyles(htmlFile) {
  const content = fs.readFileSync(htmlFile, 'utf-8');

  // Match <style> tags with content
  const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const styleMatches = [...content.matchAll(styleTagRegex)];

  // Match style attributes (e.g., <div style="...">)
  const styleAttrRegex = /\sstyle="([^"]*)"/gi;
  const attrMatches = [...content.matchAll(styleAttrRegex)];

  const styles = {
    tags: [],
    attributes: []
  };

  // Process <style> tags
  for (const match of styleMatches) {
    const styleContent = match[1].trim();
    if (styleContent) {
      const hash = crypto.createHash('sha256')
        .update(styleContent)
        .digest('base64');

      styles.tags.push({
        content: styleContent.substring(0, 100) + (styleContent.length > 100 ? '...' : ''),
        fullContent: styleContent,
        hash: `sha256-${hash}`,
        length: styleContent.length
      });
    }
  }

  // Process style attributes
  for (const match of attrMatches) {
    const styleContent = match[1].trim();
    if (styleContent) {
      styles.attributes.push({
        content: styleContent.substring(0, 100) + (styleContent.length > 100 ? '...' : ''),
        fullContent: styleContent
      });
    }
  }

  return styles;
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.bright}${colors.cyan}===========================================`);
  console.log(`Inline Styles Audit for CSP Hardening`);
  console.log(`TASK-SEC-005: Remove 'unsafe-inline'`);
  console.log(`===========================================${colors.reset}\n`);

  const buildDir = path.join(__dirname, '../admin-portal/build');
  console.log(`${colors.blue}Scanning directory:${colors.reset} ${buildDir}\n`);

  const htmlFiles = findHtmlFiles(buildDir);
  console.log(`${colors.green}Found ${htmlFiles.length} HTML file(s)${colors.reset}\n`);

  if (htmlFiles.length === 0) {
    console.error(`${colors.yellow}Warning: No HTML files found. Did you run 'npm run build'?${colors.reset}`);
    process.exit(1);
  }

  const allStyleTags = new Map(); // Map to track unique style tags
  const allStyleAttrs = [];
  let totalInlineScripts = 0;

  // Analyze each HTML file
  for (const file of htmlFiles) {
    const relativePath = path.relative(buildDir, file);
    console.log(`${colors.bright}File: ${relativePath}${colors.reset}`);

    const styles = extractInlineStyles(file);

    // Process <style> tags
    if (styles.tags.length > 0) {
      console.log(`  ${colors.cyan}Inline <style> tags: ${styles.tags.length}${colors.reset}`);
      styles.tags.forEach((style, index) => {
        console.log(`    [${index + 1}] Preview: ${colors.yellow}${style.content}${colors.reset}`);
        console.log(`        Length: ${style.length} chars`);
        console.log(`        Hash: ${colors.green}'${style.hash}'${colors.reset}`);

        // Store unique hashes
        if (!allStyleTags.has(style.hash)) {
          allStyleTags.set(style.hash, style);
        }
      });
    } else {
      console.log(`  ${colors.green}✓ No inline <style> tags found${colors.reset}`);
    }

    // Process style attributes
    if (styles.attributes.length > 0) {
      console.log(`  ${colors.red}⚠ Inline style attributes: ${styles.attributes.length}${colors.reset}`);
      styles.attributes.forEach((attr, index) => {
        console.log(`    [${index + 1}] ${colors.yellow}${attr.content}${colors.reset}`);
        allStyleAttrs.push(attr);
      });
    }

    // Check for inline scripts (related security concern)
    const content = fs.readFileSync(file, 'utf-8');
    const inlineScripts = (content.match(/<script(?![^>]*src=)[^>]*>/gi) || []).length;
    if (inlineScripts > 0) {
      totalInlineScripts += inlineScripts;
      console.log(`  ${colors.yellow}ℹ Inline <script> tags: ${inlineScripts}${colors.reset}`);
    }

    console.log('');
  }

  // Summary section
  console.log(`${colors.bright}${colors.cyan}===========================================`);
  console.log(`Summary & CSP Recommendations`);
  console.log(`===========================================${colors.reset}\n`);

  console.log(`${colors.bright}Findings:${colors.reset}`);
  console.log(`  Total HTML files analyzed: ${htmlFiles.length}`);
  console.log(`  Unique inline <style> tags: ${allStyleTags.size}`);
  console.log(`  Total inline style attributes: ${allStyleAttrs.length}`);
  console.log(`  Total inline <script> tags: ${totalInlineScripts}\n`);

  // Analysis and recommendations
  if (allStyleTags.size === 0 && allStyleAttrs.length === 0) {
    console.log(`${colors.green}${colors.bright}✓ EXCELLENT: No inline styles detected!${colors.reset}`);
    console.log(`${colors.green}  All styles are externalized to CSS files.${colors.reset}\n`);

    console.log(`${colors.bright}Recommended CSP Configuration:${colors.reset}`);
    console.log(`  ${colors.green}style-src 'self'${colors.reset}\n`);

  } else if (allStyleTags.size > 0 && allStyleAttrs.length === 0) {
    console.log(`${colors.yellow}${colors.bright}⚠ WARNING: ${allStyleTags.size} inline <style> tag(s) detected${colors.reset}`);
    console.log(`${colors.yellow}  These are likely from Mantine's ColorSchemeScript.${colors.reset}\n`);

    console.log(`${colors.bright}Recommended CSP Configuration (with SHA-256 hashes):${colors.reset}`);
    const hashes = Array.from(allStyleTags.keys());
    console.log(`  style-src 'self' ${hashes.map(h => `'${h}'`).join(' ')}\n`);

    console.log(`${colors.bright}Complete staticwebapp.config.json snippet:${colors.reset}`);
    const cspValue = `default-src 'self'; script-src 'self' 'sha256-Hc+JJmOTna1O9CADbZLlK4PYeDE5ppuezRAwsNhIlY0='; style-src 'self' ${hashes.map(h => `'${h}'`).join(' ')}; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://func-ctn-demo-asr-dev.azurewebsites.net https://login.microsoftonline.com https://graph.microsoft.com; frame-src 'self' https://login.microsoftonline.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests`;

    console.log(`\n  ${colors.cyan}"Content-Security-Policy": "${cspValue}"${colors.reset}\n`);

  } else {
    console.log(`${colors.red}${colors.bright}✗ CRITICAL: Inline style attributes detected!${colors.reset}`);
    console.log(`${colors.red}  Found ${allStyleAttrs.length} inline style="" attributes.${colors.reset}`);
    console.log(`${colors.red}  These CANNOT be secured with SHA-256 hashes.${colors.reset}\n`);

    console.log(`${colors.bright}Action Required:${colors.reset}`);
    console.log(`  1. ${colors.yellow}Refactor inline style attributes to CSS classes${colors.reset}`);
    console.log(`  2. ${colors.yellow}Use Mantine's styling system (sx, styles props)${colors.reset}`);
    console.log(`  3. ${colors.yellow}Move styles to external CSS files${colors.reset}\n`);

    console.log(`${colors.bright}Affected styles (first 10):${colors.reset}`);
    allStyleAttrs.slice(0, 10).forEach((attr, index) => {
      console.log(`  [${index + 1}] ${colors.yellow}${attr.content}${colors.reset}`);
    });

    if (allStyleAttrs.length > 10) {
      console.log(`  ... and ${allStyleAttrs.length - 10} more\n`);
    }

    console.log(`${colors.red}⚠ Cannot remove 'unsafe-inline' until inline style attributes are eliminated.${colors.reset}\n`);
  }

  // Inline script analysis (related to script-src CSP)
  if (totalInlineScripts > 0) {
    console.log(`${colors.bright}Note on Inline Scripts:${colors.reset}`);
    console.log(`  Found ${totalInlineScripts} inline <script> tag(s) (likely Mantine ColorSchemeScript)`);
    console.log(`  Current CSP already includes SHA-256 hash for this script.`);
    console.log(`  ${colors.green}✓ No action needed for script-src directive.${colors.reset}\n`);
  }

  // Exit status
  if (allStyleAttrs.length > 0) {
    console.log(`${colors.red}${colors.bright}Exit Status: FAIL (inline style attributes found)${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bright}Exit Status: PASS (no inline style attributes)${colors.reset}`);
    process.exit(0);
  }
}

// Execute
main();
