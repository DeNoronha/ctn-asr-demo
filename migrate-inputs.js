#!/usr/bin/env node
/**
 * Automated migration script: Kendo Inputs → Mantine Inputs
 * Migrates: Input → TextInput, TextArea → Textarea, Checkbox → Checkbox
 * Usage: node migrate-inputs.js <portal-path>
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node migrate-inputs.js <portal-path>');
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

  // Check if file imports Kendo inputs
  if (!content.includes("from '@progress/kendo-react-inputs'")) return;

  filesProcessed++;
  console.log(`Processing: ${filePath}`);

  // 1. Replace Input/TextArea/Checkbox imports
  content = content.replace(
    /import\s*{\s*([^}]*)\s*}\s*from\s*'@progress\/kendo-react-inputs';?/g,
    (match, imports) => {
      const importList = imports.split(',').map(i => i.trim());
      const mantineImports = [];
      const keepKendoImports = [];

      importList.forEach(imp => {
        if (imp === 'Input') {
          mantineImports.push('TextInput');
        } else if (imp === 'TextArea') {
          mantineImports.push('Textarea');
        } else if (imp === 'Checkbox') {
          mantineImports.push('Checkbox');
        } else {
          // Keep other Kendo imports (MaskedTextBox, etc.)
          keepKendoImports.push(imp);
        }
      });

      let result = '';

      // Add Mantine imports
      if (mantineImports.length > 0) {
        // Check if @mantine/core import already exists
        const mantineImportRegex = /import\s*{\s*([^}]*)\s*}\s*from\s*'@mantine\/core'/g;
        const mantineMatch = content.match(mantineImportRegex);

        if (mantineMatch) {
          // Add to existing import
          content = content.replace(
            mantineImportRegex,
            (m, existingImports) => {
              const existing = existingImports.split(',').map(i => i.trim());
              const newImports = [...new Set([...existing, ...mantineImports])];
              return `import { ${newImports.join(', ')} } from '@mantine/core'`;
            }
          );
        } else {
          // Create new import
          result = `import { ${mantineImports.join(', ')} } from '@mantine/core';\n`;
        }
      }

      // Keep Kendo imports for other components
      if (keepKendoImports.length > 0) {
        result += `import { ${keepKendoImports.join(', ')} } from '@progress/kendo-react-inputs';`;
      }

      return result;
    }
  );

  // 2. Replace Input component usage
  // Kendo: <Input value={x} onChange={e => setValue(e.value)} />
  // Mantine: <TextInput value={x} onChange={e => setValue(e.target.value)} />

  // Replace Input with TextInput
  content = content.replace(/<Input\b/g, '<TextInput');
  content = content.replace(/\/Input>/g, '/TextInput>');

  // Replace TextArea with Textarea
  content = content.replace(/<TextArea\b/g, '<Textarea');
  content = content.replace(/\/TextArea>/g, '/Textarea>');

  // 3. Fix onChange handlers for TextInput and Textarea
  // This is tricky - we need to change e.value to e.target.value or e.currentTarget.value
  // Pattern: onChange={(e) => setX(e.value)}  →  onChange={(e) => setX(e.target.value)}
  content = content.replace(/onChange=\{[^}]*e\.value[^}]*\}/g, (match) => {
    return match.replace(/e\.value/g, 'e.target.value');
  });

  // Pattern: onChange={e => setX(e.value)}  →  onChange={e => setX(e.target.value)}
  content = content.replace(/onChange=\{[^}]*e\.value[^}]*\}/g, (match) => {
    return match.replace(/e\.value/g, 'e.target.value');
  });

  // 4. Fix Checkbox onChange (Kendo and Mantine both use e.target.checked)
  // No changes needed for Checkbox onChange

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

console.log(`\n🔄 Migrating Kendo Inputs to Mantine in: ${portalPath}\n`);
walkDirectory(srcPath);

console.log(`\n✅ Migration complete!`);
console.log(`   Files processed: ${filesProcessed}`);
console.log(`   Files modified: ${filesModified}\n`);
