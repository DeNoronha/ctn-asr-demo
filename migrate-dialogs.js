#!/usr/bin/env node
/**
 * Automated migration script: Kendo Dialog → Mantine Modal
 * Note: DialogActionsBar needs manual review (converted to Group in Modal footer)
 * Usage: node migrate-dialogs.js <portal-path>
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node migrate-dialogs.js <portal-path>');
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

  // Check if file imports Kendo Dialog
  if (!content.includes("from '@progress/kendo-react-dialogs'")) return;

  filesProcessed++;
  console.log(`Processing: ${filePath}`);

  // 1. Replace Dialog import
  content = content.replace(
    /import\s*{\s*([^}]*)\s*}\s*from\s*'@progress\/kendo-react-dialogs';?/g,
    (match, imports) => {
      const importList = imports.split(',').map(i => i.trim());
      const mantineImports = [];
      const keepKendoImports = [];

      importList.forEach(imp => {
        if (imp === 'Dialog') {
          mantineImports.push('Modal');
        } else if (imp === 'DialogActionsBar') {
          mantineImports.push('Group'); // Modal uses Group for footer buttons
          warnings.push(`${filePath}: DialogActionsBar → Group (manual review needed for footer)`);
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
        result += `import { ${keepKendoImports.join(', ')} } from '@progress/kendo-react-dialogs';`;
      }

      return result;
    }
  );

  // 2. Replace Dialog component with Modal
  content = content.replace(/<Dialog\b/g, '<Modal');
  content = content.replace(/\/Dialog>/g, '/Modal>');

  // 3. Replace Dialog props
  // Kendo: title="..." → Mantine: title="..."
  // Kendo: onClose={...} → Mantine: onClose={...} (but also needs opened prop)
  // Kendo: width={...} → Mantine: size="..." or w={...}

  // Convert width to size approximations
  content = content.replace(/\bwidth=\{450\}/g, 'size="md"');
  content = content.replace(/\bwidth=\{600\}/g, 'size="lg"');
  content = content.replace(/\bwidth=\{700\}/g, 'size="xl"');
  content = content.replace(/\bwidth=\{800\}/g, 'size="xl"');
  content = content.replace(/\bwidth=\{1000\}/g, 'size="xl"');

  // 4. Add 'opened' prop (Mantine Modal requires this)
  // This is tricky - we need to find the controlling state variable
  // For now, add a comment for manual review
  if (content.includes('<Modal')) {
    warnings.push(`${filePath}: Add 'opened' prop to Modal (e.g., opened={isOpen})`);
  }

  // 5. Replace DialogActionsBar with Group
  content = content.replace(/<DialogActionsBar>/g, '<Group justify="flex-end" mt="md">');
  content = content.replace(/<\/DialogActionsBar>/g, '</Group>');

  // Check if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    console.log(`  ✓ Modified (manual review needed)`);
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

console.log(`\n🔄 Migrating Kendo Dialogs to Mantine Modals in: ${portalPath}\n`);
walkDirectory(srcPath);

console.log(`\n✅ Migration complete!`);
console.log(`   Files processed: ${filesProcessed}`);
console.log(`   Files modified: ${filesModified}\n`);

if (warnings.length > 0) {
  console.log(`\n⚠️  Manual Review Required (${warnings.length} items):\n`);
  warnings.forEach(w => console.log(`   - ${w}`));
  console.log();
}
