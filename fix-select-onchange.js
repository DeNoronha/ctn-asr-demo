#!/usr/bin/env node
/**
 * Fix Select onChange handlers
 * Mantine Select: onChange={(value) => ...} receives string|null directly
 * Kendo DropDownList: onChange={(e) => ... e.value} receives event object
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node fix-select-onchange.js <portal-path>');
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

  // Check if file has Select components
  if (!content.includes('<Select')) return;

  filesProcessed++;
  console.log(`Processing: ${filePath}`);

  // Fix pattern: onChange={(value) => setX(value.target.value)}
  // Should be: onChange={(value) => setX(value)}
  content = content.replace(/onChange=\{[^}]*value\.target\.value[^}]*\}/g, (match) => {
    return match.replace(/value\.target\.value/g, 'value');
  });

  // Fix pattern: onChange={(e) => setX(e.target.value)}
  // Should be: onChange={(value) => setX(value)}
  content = content.replace(/onChange=\{[^}]*e\.target\.value[^}]*\}/g, (match) => {
    return match.replace(/\(e\)\s*=>/g, '(value) =>').replace(/e\.target\.value/g, 'value');
  });

  // Fix pattern where value might be null: value || ''
  // Mantine Select can return null, need to handle it
  // onChange={(value) => setX(value)}  might need  onChange={(value) => setX(value || '')}

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    console.log(`  ✓ Fixed Select onChange handlers`);
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

console.log(`\n🔧 Fixing Select onChange handlers in: ${portalPath}\n`);
walkDirectory(srcPath);

console.log(`\n✅ Select onChange fixes complete!`);
console.log(`   Files processed: ${filesProcessed}`);
console.log(`   Files modified: ${filesModified}\n`);
