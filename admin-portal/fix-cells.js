const fs = require('fs');
const path = require('path');

const files = ['KvkReviewQueue.tsx', 'ReviewTasks.tsx', 'TasksGrid.tsx'];

files.forEach(fileName => {
  const filePath = path.join(__dirname, 'src/components', fileName);
  let content = fs.readFileSync(filePath, 'utf8');

  // Find all instances of cells={{ data: (props...)
  const pattern = /cells=\{\{ data: \(props[^}]*\) => [^}]*\}(?!\})/g;

  // Replace by adding closing }}
  content = content.replace(pattern, (match) => {
    // Count opening braces after =>
    const afterArrow = match.split('=>')[1];
    let braceCount = 0;
    let endIndex = 0;

    for (let i = 0; i < afterArrow.length; i++) {
      if (afterArrow[i] === '{') braceCount++;
      if (afterArrow[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }

    return match + '}';
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed: ${fileName}`);
});

console.log('All files processed');
