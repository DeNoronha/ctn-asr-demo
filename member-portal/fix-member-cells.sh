#!/bin/bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/member-portal

# Find all files with cell={ and fix them
find src -name "*.tsx" -exec grep -l "cell={" {} \; | while read file; do
  echo "Processing $file..."

  # Step 1: Convert named component references
  perl -i -pe 's/\bcell=\{([A-Z][A-Za-z0-9]*)\}/cells={{ data: $1 }}/g' "$file"

  # Step 2: Convert single-line inline arrow functions
  perl -i -pe 's/\bcell=\{(\(props[^}]*\) => <td>.*?<\/td>)\}/cells={{ data: $1 }}/g' "$file"

  # Step 3: Convert multi-line arrow function starts
  perl -i -pe 's/\bcell=\{(\(props[^}]*\) => \()/cells={{ data: $1/g' "$file"

  echo "Completed $file"
done

echo "All files processed"
