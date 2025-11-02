#!/usr/bin/env python3
"""
Script to update DataTable components to use shared configuration
"""
import re
import sys
from pathlib import Path

def update_datatable_props(file_path):
    """Update a single file to use shared DataTable props"""
    with open(file_path, 'r') as f:
        content = f.read()

    original_content = content

    # Add import if not present
    if 'from \'./shared/DataTableConfig\'' not in content and 'from \'../shared/DataTableConfig\'' not in content:
        # Determine the correct import path based on file location
        if '/users/' in str(file_path).lower():
            import_path = '../shared/DataTableConfig'
        else:
            import_path = './shared/DataTableConfig'

        # Find the last import statement
        import_pattern = r'(import .+ from .+;)\n'
        imports = list(re.finditer(import_pattern, content))
        if imports:
            last_import = imports[-1]
            insert_pos = last_import.end()
            content = content[:insert_pos] + f"import {{ defaultDataTableProps, defaultPaginationOptions }} from '{import_path}';\n" + content[insert_pos:]

    # Replace DataTable props pattern
    # Pattern: <DataTable with 4 props (withTableBorder, withColumnBorders, striped, highlightOnHover)
    pattern = r'<DataTable\s+withTableBorder\s+withColumnBorders\s+striped\s+highlightOnHover\s+'
    replacement = '<DataTable\n            {...defaultDataTableProps}\n            '
    content = re.sub(pattern, replacement, content)

    # Also handle case where props are on separate lines
    pattern2 = r'<DataTable\n\s+withTableBorder\n\s+withColumnBorders\n\s+striped\n\s+highlightOnHover\n\s+'
    replacement2 = '<DataTable\n            {...defaultDataTableProps}\n            '
    content = re.sub(pattern2, replacement2, content)

    # Replace pagination options
    content = content.replace('recordsPerPageOptions={[10, 20, 50, 100]}', 'recordsPerPageOptions={[...defaultPaginationOptions]}')

    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"✓ Updated {file_path.name}")
        return True
    else:
        print(f"- No changes needed for {file_path.name}")
        return False

def main():
    components_dir = Path(__file__).parent / 'src' / 'components'

    # List of files to update
    files_to_update = [
        'TasksGrid.tsx',
        'ContactsManager.tsx',
        'IdentifiersManager.tsx',
        'M2MClientsManager.tsx',
        'EndpointManagement.tsx',
        'ReviewTasks.tsx',
        'KvkReviewQueue.tsx',
        'audit/AuditLogViewer.tsx',
        'users/UserManagement.tsx',
    ]

    updated_count = 0
    for file_name in files_to_update:
        file_path = components_dir / file_name
        if file_path.exists():
            if update_datatable_props(file_path):
                updated_count += 1
        else:
            print(f"✗ File not found: {file_path}")

    print(f"\n✓ Updated {updated_count} files")

if __name__ == '__main__':
    main()
