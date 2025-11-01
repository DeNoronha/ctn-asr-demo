#!/bin/bash
# Script to properly convert Kendo Grid v8 cell= to v12 cells={{ data: }}

cd /Users/ramondenoronha/Dev/DIL/ASR-full/member-portal/src/components

for file in TasksGrid.tsx KvkReviewQueue.tsx ReviewTasks.tsx; do
  echo "Processing $file..."

  # Step 1: Convert named component references
  # cell={ComponentName} -> cells={{ data: ComponentName }}
  perl -i -pe 's/\bcell=\{([A-Z][A-Za-z0-9]*)\}/cells={{ data: $1 }}/g' "$file"

  # Step 2: Convert single-line inline arrow functions
  # cell={(props) => <td>...</td>} -> cells={{ data: (props) => <td>...</td> }}
  perl -i -pe 's/\bcell=\{(\(props[^}]*\) => <td>.*?<\/td>)\}/cells={{ data: $1 }}/g' "$file"

  # Step 3: Convert multi-line arrow function starts
  # cell={(props) => ( -> cells={{ data: (props) => (
  perl -i -pe 's/\bcell=\{(\(props[^}]*\) => \()/cells={{ data: $1/g' "$file"

  # Step 4: For multi-line, find closing )} and add }}
  # This requires multi-line matching, done separately
  perl -i -0777 -pe 's/(cells=\{\{ data: \(props[^}]*\) => \([^)]*\)\))/\1 }}/gs' "$file"

  echo "Completed $file"
done

echo "All files processed successfully"
