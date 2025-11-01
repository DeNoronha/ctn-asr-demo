#!/usr/bin/env node
/**
 * Automated migration script: Kendo Button → Mantine Button
 * Usage: node migrate-buttons.js <portal-path>
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node migrate-buttons.js <portal-path>');
  process.exit(1);
}

const portalPath = args[0];
const srcPath = path.join(portalPath, 'src');

if (!fs.existsSync(srcPath)) {
  console.error(`Error: ${srcPath} does not exist`);
  process.exit(1);
}

let filesProcessed = 0;
let filesModified = 0;

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Check if file imports Kendo Button
  if (!content.includes("from '@progress/kendo-react-buttons'")) return;

  filesProcessed++;
  console.log(`Processing: ${filePath}`);

  // 1. Replace Button import (preserve other imports on same line)
  content = content.replace(
    /import\s*{\s*([^}]*Button[^}]*)\s*}\s*from\s*'@progress\/kendo-react-buttons';?/g,
    (match, imports) => {
      // Extract other imports (like DropDownButton, ButtonGroup, etc.)
      const importList = imports.split(',').map(i => i.trim());
      const otherImports = importList.filter(i => i !== 'Button');

      let result = '';
      // Add Mantine Button import
      if (importList.includes('Button')) {
        // Check if @mantine/core import already exists
        if (!content.includes("from '@mantine/core'")) {
          result = "import { Button } from '@mantine/core';\n";
        } else {
          // Add Button to existing @mantine/core import
          content = content.replace(
            /import\s*{\s*([^}]*)\s*}\s*from\s*'@mantine\/core'/g,
            (m, existingImports) => {
              if (!existingImports.includes('Button')) {
                return `import { ${existingImports}, Button } from '@mantine/core'`;
              }
              return m;
            }
          );
        }
      }

      // Keep other Kendo button imports if any
      if (otherImports.length > 0) {
        result += `import { ${otherImports.join(', ')} } from '@progress/kendo-react-buttons';`;
      }

      return result;
    }
  );

  // 2. Replace Button props
  // themeColor mappings
  content = content.replace(/themeColor="primary"/g, 'color="blue"');
  content = content.replace(/themeColor="error"/g, 'color="red"');
  content = content.replace(/themeColor="success"/g, 'color="green"');
  content = content.replace(/themeColor="warning"/g, 'color="orange"');
  content = content.replace(/themeColor="info"/g, 'color="cyan"');
  content = content.replace(/themeColor={['"]primary['"]}/g, 'color="blue"');
  content = content.replace(/themeColor={['"]error['"]}/g, 'color="red"');
  content = content.replace(/themeColor={['"]success['"]}/g, 'color="green"');
  content = content.replace(/themeColor={['"]warning['"]}/g, 'color="orange"');
  content = content.replace(/themeColor={['"]info['"]}/g, 'color="cyan"');

  // Dynamic themeColor (e.g., themeColor={variable})
  content = content.replace(
    /themeColor=\{([^}]+)\}/g,
    (match, expr) => {
      // If it's a simple ternary or variable, wrap in a mapping function
      return `color={${expr} === 'error' ? 'red' : ${expr} === 'success' ? 'green' : ${expr} === 'warning' ? 'orange' : ${expr} === 'info' ? 'cyan' : 'blue'}`;
    }
  );

  // fillMode mappings
  content = content.replace(/fillMode="flat"/g, 'variant="subtle"');
  content = content.replace(/fillMode="outline"/g, 'variant="outline"');
  content = content.replace(/fillMode="solid"/g, ''); // Default in Mantine, remove
  content = content.replace(/fillMode={["']flat["']}/g, 'variant="subtle"');
  content = content.replace(/fillMode={["']outline["']}/g, 'variant="outline"');
  content = content.replace(/fillMode={["']solid["']}/g, ''); // Default in Mantine, remove

  // size mappings
  content = content.replace(/\bsize="large"/g, 'size="lg"');
  content = content.replace(/\bsize="small"/g, 'size="sm"');
  content = content.replace(/\bsize={["']large["']}/g, 'size="lg"');
  content = content.replace(/\bsize={["']small["']}/g, 'size="sm"');

  // Remove k-button class references (Kendo-specific)
  content = content.replace(/className={[^}]*'k-button-[^']*'[^}]*}/g, (match) => {
    // Keep className but remove k-button-* classes
    return match.replace(/'k-button-[^']*'/g, '""').replace(/\s+/g, ' ');
  });

  // Check if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    console.log(`  ✓ Modified`);
  } else {
    console.log(`  - No changes needed`);
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

console.log(`\n🔄 Migrating Kendo Buttons to Mantine in: ${portalPath}\n`);
walkDirectory(srcPath);

console.log(`\n✅ Migration complete!`);
console.log(`   Files processed: ${filesProcessed}`);
console.log(`   Files modified: ${filesModified}\n`);
