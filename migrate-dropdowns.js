#!/usr/bin/env node
/**
 * Automated migration script: Kendo DropDownList → Mantine Select
 * Usage: node migrate-dropdowns.js <portal-path>
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node migrate-dropdowns.js <portal-path>');
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
const warnings = [];

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Check if file imports Kendo dropdowns
  if (!content.includes("from '@progress/kendo-react-dropdowns'")) return;

  filesProcessed++;
  console.log(`Processing: ${filePath}`);

  // 1. Replace DropDownList import
  content = content.replace(
    /import\s*{\s*([^}]*DropDownList[^}]*)\s*}\s*from\s*'@progress\/kendo-react-dropdowns';?/g,
    (match, imports) => {
      const importList = imports.split(',').map(i => i.trim());
      const mantineImports = [];
      const keepKendoImports = [];

      importList.forEach(imp => {
        if (imp === 'DropDownList') {
          mantineImports.push('Select');
        } else {
          keepKendoImports.push(imp);
        }
      });

      let result = '';

      // Add Mantine imports
      if (mantineImports.length > 0) {
        const mantineImportRegex = /import\s*{\s*([^}]*)\s*}\s*from\s*'@mantine\/core'/g;
        const mantineMatch = content.match(mantineImportRegex);

        if (mantineMatch) {
          content = content.replace(
            mantineImportRegex,
            (m, existingImports) => {
              const existing = existingImports.split(',').map(i => i.trim());
              const newImports = [...new Set([...existing, ...mantineImports])];
              return `import { ${newImports.join(', ')} } from '@mantine/core'`;
            }
          );
        } else {
          result = `import { ${mantineImports.join(', ')} } from '@mantine/core';\n`;
        }
      }

      // Keep other Kendo imports
      if (keepKendoImports.length > 0) {
        result += `import { ${keepKendoImports.join(', ')} } from '@progress/kendo-react-dropdowns';`;
      }

      return result;
    }
  );

  // 2. Replace DropDownList component with Select
  content = content.replace(/<DropDownList\b/g, '<Select');
  content = content.replace(/\/DropDownList>/g, '/Select>');

  // 3. Replace DropDownList props
  // Kendo: data={...} → Mantine: data={...} (compatible if array of strings)
  // Kendo: textField="name" → Mantine: No direct equivalent, data needs {value, label} format
  // Kendo: dataItemKey="id" → Mantine: No direct equivalent
  // Kendo: value={...} → Mantine: value={...}
  // Kendo: onChange={(e) => setValue(e.value)} → Mantine: onChange={(value) => setValue(value)}

  // Fix onChange handlers
  // Pattern: onChange={(e) => setX(e.value)}  →  onChange={(value) => setX(value)}
  content = content.replace(/onChange=\{[^}]*e\.value[^}]*\}/g, (match) => {
    return match.replace(/\(e\)\s*=>/g, '(value) =>').replace(/e\.value/g, 'value');
  });

  // Warn about textField and dataItemKey
  if (content.includes('textField=')) {
    warnings.push(`${filePath}: textField prop needs manual conversion - Mantine Select requires {value, label} format`);
  }
  if (content.includes('dataItemKey=')) {
    warnings.push(`${filePath}: dataItemKey prop needs manual conversion - Mantine Select uses 'value' key`);
  }

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

console.log(`\n🔄 Migrating Kendo DropDownList to Mantine Select in: ${portalPath}\n`);
walkDirectory(srcPath);

console.log(`\n✅ Migration complete!`);
console.log(`   Files processed: ${filesProcessed}`);
console.log(`   Files modified: ${filesModified}\n`);

if (warnings.length > 0) {
  console.log(`\n⚠️  Manual Review Required (${warnings.length} items):\n`);
  warnings.forEach(w => console.log(`   - ${w}`));
  console.log();
}
