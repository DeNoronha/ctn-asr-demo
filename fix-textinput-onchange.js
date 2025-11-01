#!/usr/bin/env node
/**
 * Fix TextInput onChange handlers
 * Mantine TextInput: onChange={(e) => ...} receives standard React event
 * But when used with form.getInputProps(), it might be passed value directly
 *
 * This fixes cases where onChange expects event but receives value
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node fix-textinput-onchange.js <portal-path>');
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

  // Check if file has TextInput or Textarea components
  if (!content.includes('TextInput') && !content.includes('Textarea')) return;

  filesProcessed++;
  console.log(`Processing: ${filePath}`);

  // Fix pattern: onChange={(value) => setX(value.target.value)}
  // This happens when migration script changed (e) to (value) but left .target.value
  content = content.replace(/onChange=\{[^}]*value\.target\.value[^}]*\}/g, (match) => {
    // If it's already (e) => e.target.value, leave it alone
    if (match.includes('(e)') || match.includes('(event)')) {
      return match;
    }
    // If it's (value) => value.target.value, fix it
    return match.replace(/value\.target\.value/g, 'value');
  });

  // Fix pattern: value prop using ChangeEvent when it should be string
  // onChange={(value: ChangeEvent<...>) => ...} should be onChange={(e: ChangeEvent<...>) => ...}
  content = content.replace(/onChange=\{\s*\(value:\s*ChangeEvent/g, 'onChange={(e: ChangeEvent');

  // And update the handler body to use e.target.value
  content = content.replace(/onChange=\{\s*\(e:\s*ChangeEvent[^)]+\)\s*=>\s*([^(]+)\(value\)/g,
    (match, setter) => match.replace(/\(value\)/, '(e.target.value)'));

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    console.log(`  ✓ Fixed TextInput onChange handlers`);
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

console.log(`\n🔧 Fixing TextInput onChange handlers in: ${portalPath}\n`);
walkDirectory(srcPath);

console.log(`\n✅ TextInput onChange fixes complete!`);
console.log(`   Files processed: ${filesProcessed}`);
console.log(`   Files modified: ${filesModified}\n`);
