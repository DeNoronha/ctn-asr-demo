#!/usr/bin/env node
/**
 * Fix Button icon props: icon="..." → leftSection={<Icon />}
 * Mantine Button doesn't have 'icon' prop, uses leftSection/rightSection instead
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node fix-button-icons.js <portal-path>');
  process.exit(1);
}

const portalPath = args[0];
const srcPath = path.join(portalPath, 'src');

let filesProcessed = 0;
let filesModified = 0;

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Check if file has Button components with icon prop
  if (!content.includes('icon=')) return;

  filesProcessed++;
  console.log(`Processing: ${filePath}`);

  // Pattern 1: icon="string" (emoji or simple string)
  // <Button icon="🔄" ... > → <Button leftSection="🔄" ...>
  content = content.replace(/(\<Button[^>]*)\bicon="([^"]+)"/g, '$1leftSection="$2"');
  content = content.replace(/(\<Button[^>]*)\bicon='([^']+)'/g, "$1leftSection='$2'");

  // Pattern 2: icon={variable} (JSX element)
  // <Button icon={<RefreshIcon />} ... > → <Button leftSection={<RefreshIcon />} ...>
  content = content.replace(/(\<Button[^>]*)\bicon=\{([^}]+)\}/g, '$1leftSection={$2}');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    console.log(`  ✓ Fixed icon props`);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDirectory(filePath);
    } else {
      processFile(filePath);
    }
  }
}

console.log(`\n🔧 Fixing Button icon props in: ${portalPath}\n`);
walkDirectory(srcPath);

console.log(`\n✅ Button icon fixes complete!`);
console.log(`   Files processed: ${filesProcessed}`);
console.log(`   Files modified: ${filesModified}\n`);
