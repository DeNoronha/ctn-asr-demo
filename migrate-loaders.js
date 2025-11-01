#!/usr/bin/env node
/**
 * Automated migration script: Kendo Loader/ProgressBar → Mantine Loader/Progress
 * Usage: node migrate-loaders.js <portal-path>
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node migrate-loaders.js <portal-path>');
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

  // Check if file imports Kendo indicators
  if (!content.includes("from '@progress/kendo-react-indicators'") &&
      !content.includes("from '@progress/kendo-react-progressbars'")) return;

  filesProcessed++;
  console.log(`Processing: ${filePath}`);

  // 1. Replace Loader import
  content = content.replace(
    /import\s*{\s*([^}]*Loader[^}]*)\s*}\s*from\s*'@progress\/kendo-react-indicators';?/g,
    (match, imports) => {
      const importList = imports.split(',').map(i => i.trim());
      const otherImports = importList.filter(i => i !== 'Loader');

      let result = '';

      // Add Mantine Loader import
      if (importList.includes('Loader')) {
        // Check if @mantine/core import already exists
        const mantineImportRegex = /import\s*{\s*([^}]*)\s*}\s*from\s*'@mantine\/core'/g;
        const mantineMatch = content.match(mantineImportRegex);

        if (mantineMatch) {
          // Add to existing import
          content = content.replace(
            mantineImportRegex,
            (m, existingImports) => {
              if (!existingImports.includes('Loader')) {
                return `import { ${existingImports}, Loader } from '@mantine/core'`;
              }
              return m;
            }
          );
        } else {
          // Create new import
          result = `import { Loader } from '@mantine/core';\n`;
        }
      }

      // Keep other Kendo imports if any
      if (otherImports.length > 0) {
        result += `import { ${otherImports.join(', ')} } from '@progress/kendo-react-indicators';`;
      }

      return result;
    }
  );

  // 2. Replace ProgressBar import
  content = content.replace(
    /import\s*{\s*([^}]*ProgressBar[^}]*)\s*}\s*from\s*'@progress\/kendo-react-progressbars';?/g,
    (match, imports) => {
      const importList = imports.split(',').map(i => i.trim());

      // Check if @mantine/core import already exists
      const mantineImportRegex = /import\s*{\s*([^}]*)\s*}\s*from\s*'@mantine\/core'/g;
      const mantineMatch = content.match(mantineImportRegex);

      if (mantineMatch) {
        // Add to existing import
        content = content.replace(
          mantineImportRegex,
          (m, existingImports) => {
            if (!existingImports.includes('Progress')) {
              return `import { ${existingImports}, Progress } from '@mantine/core'`;
            }
            return m;
          }
        );
        return ''; // Remove original import
      } else {
        // Replace with Mantine import
        return `import { Progress } from '@mantine/core';`;
      }
    }
  );

  // 3. Replace Loader component usage
  // Kendo: <Loader size="large" />
  // Mantine: <Loader size="lg" />
  content = content.replace(/size="large"/g, 'size="lg"');
  content = content.replace(/size="medium"/g, 'size="md"');
  content = content.replace(/size="small"/g, 'size="sm"');

  // 4. Replace ProgressBar with Progress
  content = content.replace(/<ProgressBar\b/g, '<Progress');
  content = content.replace(/\/ProgressBar>/g, '/Progress>');

  // Kendo ProgressBar uses 'value' prop, Mantine Progress also uses 'value'
  // So no prop changes needed

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

console.log(`\n🔄 Migrating Kendo Loaders to Mantine in: ${portalPath}\n`);
walkDirectory(srcPath);

console.log(`\n✅ Migration complete!`);
console.log(`   Files processed: ${filesProcessed}`);
console.log(`   Files modified: ${filesModified}\n`);
