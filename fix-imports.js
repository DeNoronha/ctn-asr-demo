#!/usr/bin/env node
/**
 * Fix missing Mantine imports after automated migration
 * This script ensures all Mantine components are properly imported
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node fix-imports.js <portal-path>');
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

  // Components that should be imported from @mantine/core
  const mantineComponents = ['Button', 'TextInput', 'Textarea', 'Checkbox', 'Select', 'Loader', 'Progress', 'Modal', 'Group'];

  // Check which Mantine components are used but not imported
  const usedComponents = [];
  mantineComponents.forEach(comp => {
    // Check if component is used (not just in import)
    const usageRegex = new RegExp(`<${comp}\\b`, 'g');
    if (usageRegex.test(content)) {
      usedComponents.push(comp);
    }
  });

  if (usedComponents.length === 0) return;

  filesProcessed++;
  console.log(`Processing: ${filePath}`);

  // Check if @mantine/core import exists
  const mantineImportRegex = /import\s*{\s*([^}]*)\s*}\s*from\s*'@mantine\/core'/;
  const mantineMatch = content.match(mantineImportRegex);

  if (mantineMatch) {
    // Import exists, merge components
    const existingImports = mantineMatch[1].split(',').map(i => i.trim());
    const newImports = [...new Set([...existingImports, ...usedComponents])];

    content = content.replace(
      mantineImportRegex,
      `import { ${newImports.join(', ')} } from '@mantine/core'`
    );
  } else {
    // No import exists, add it after other imports
    const importLines = content.split('\n').filter(line => line.startsWith('import'));
    const lastImportLine = importLines[importLines.length - 1];

    if (lastImportLine) {
      content = content.replace(
        lastImportLine,
        `${lastImportLine}\nimport { ${usedComponents.join(', ')} } from '@mantine/core';`
      );
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    console.log(`  ✓ Fixed imports: ${usedComponents.join(', ')}`);
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

console.log(`\n🔧 Fixing missing Mantine imports in: ${portalPath}\n`);
walkDirectory(srcPath);

console.log(`\n✅ Import fixes complete!`);
console.log(`   Files processed: ${filesProcessed}`);
console.log(`   Files modified: ${filesModified}\n`);
