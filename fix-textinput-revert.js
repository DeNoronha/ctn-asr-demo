#!/usr/bin/env node
/**
 * Revert TextInput onChange from (value) back to (e)
 *
 * Mantine TextInput works like standard React inputs:
 * onChange={(e) => setX(e.target.value)}
 *
 * The previous migration script incorrectly changed it to (value)
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node fix-textinput-revert.js <portal-path>');
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

  // Fix pattern: onChange={(value) => setX(value)}
  // Should be: onChange={(e) => setX(e.target.value)}
  //
  // Match TextInput or Textarea with onChange={(value) => ...}
  content = content.replace(
    /(<(?:TextInput|Textarea)[^>]*onChange=\{)\(value\)\s*=>\s*([^(]+)\(\{\s*\.\.\.([^,}]+),\s*([^:]+):\s*value\s*\}\)/g,
    (match, prefix, setter, spread, field) => {
      return `${prefix}(e) => ${setter}({ ...${spread}, ${field}: e.target.value })`;
    }
  );

  // Simpler pattern: onChange={(value) => setX(value)}
  content = content.replace(
    /(<(?:TextInput|Textarea)[^>]*onChange=\{)\(value\)\s*=>\s*([^(]+)\(value\)/g,
    (match, prefix, setter) => {
      return `${prefix}(e) => ${setter}(e.target.value)`;
    }
  );

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    console.log(`  ✓ Fixed TextInput/Textarea onChange handlers`);
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

console.log(`\n🔧 Fixing TextInput/Textarea onChange handlers in: ${portalPath}\n`);
walkDirectory(srcPath);

console.log(`\n✅ TextInput/Textarea onChange fixes complete!`);
console.log(`   Files processed: ${filesProcessed}`);
console.log(`   Files modified: ${filesModified}\n`);
