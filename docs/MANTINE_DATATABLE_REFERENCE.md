# Mantine DataTable Reference

**Package:** `mantine-datatable`
**Official Documentation:** https://icflorescu.github.io/mantine-datatable/
**Version:** v7.3+ (column toggling feature added)

---

## Column Toggling Feature

### Overview

Users can hide/show columns via right-click context menu on table headers. Column visibility preferences are persisted to localStorage.

### Implementation Requirements

1. **storeColumnsKey prop** - Unique key for localStorage persistence
2. **toggleable: true** - Mark columns as toggleable
3. **useDataTableColumns hook** - Manages column state

### Complete Example

```tsx
import { Button, Group, Stack } from '@mantine/core';
import { DataTable, useDataTableColumns } from 'mantine-datatable';

export function MyDataGrid() {
  const storageKey = 'my-grid-columns'; // Unique key per grid

  const { effectiveColumns, resetColumnsToggle } = useDataTableColumns({
    key: storageKey,
    columns: [
      {
        accessor: 'id',
        title: 'ID',
        width: 80,
        // No toggleable - always visible
      },
      {
        accessor: 'companyName',
        title: 'Company Name',
        width: '40%',
        toggleable: true, // Can be hidden/shown
        defaultToggle: true, // Visible by default (default)
      },
      {
        accessor: 'email',
        title: 'Email',
        width: '30%',
        toggleable: true,
        defaultToggle: false, // Hidden by default
      },
      {
        accessor: 'status',
        title: 'Status',
        width: 120,
        toggleable: true,
      },
      {
        accessor: 'actions',
        title: 'Actions',
        width: 100,
        textAlign: 'right',
        // No toggleable - always visible
      },
    ],
  });

  return (
    <Stack>
      <DataTable
        withTableBorder
        withColumnBorders
        storeColumnsKey={storageKey} // Must match key in useDataTableColumns
        records={data}
        columns={effectiveColumns} // Use effectiveColumns from hook
      />

      {/* Optional reset button */}
      <Group justify="right">
        <Button onClick={resetColumnsToggle} size="xs" variant="light">
          Reset Columns
        </Button>
      </Group>
    </Stack>
  );
}
```

### Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `storeColumnsKey` | string | DataTable prop - unique key for localStorage |
| `toggleable` | boolean | Column prop - makes column toggleable |
| `defaultToggle` | boolean | Column prop - initial visibility (default: true) |
| `effectiveColumns` | array | Hook return - computed columns with visibility applied |
| `resetColumnsToggle` | function | Hook return - resets to default visibility |

### User Interaction

- **Toggle columns:** Right-click on any table header → Check/uncheck columns
- **Persistence:** Preferences saved to localStorage automatically
- **Reset:** Call `resetColumnsToggle()` to restore default visibility

---

## Column Dragging (Optional)

Combine with column reordering by adding `draggable: true` to columns:

```tsx
{
  accessor: 'name',
  title: 'Name',
  toggleable: true,
  draggable: true, // Enable drag-and-drop reordering
}
```

---

## Column Resizing (Optional)

Enable column width adjustment with `resizable: true`:

```tsx
{
  accessor: 'description',
  title: 'Description',
  toggleable: true,
  resizable: true, // Enable width resizing
}
```

All three features (toggle, drag, resize) can be combined on the same column.

---

## Common Patterns

### Pattern 1: Always-Visible Key Columns

Don't add `toggleable` to ID, actions, or critical columns:

```tsx
{ accessor: 'id', title: 'ID' }, // Always visible
{ accessor: 'name', title: 'Name', toggleable: true },
{ accessor: 'actions', title: '', textAlign: 'right' }, // Always visible
```

### Pattern 2: Hide Less Important Columns by Default

Use `defaultToggle: false` for optional details:

```tsx
{ accessor: 'name', toggleable: true }, // Visible
{ accessor: 'email', toggleable: true, defaultToggle: false }, // Hidden
{ accessor: 'phone', toggleable: true, defaultToggle: false }, // Hidden
```

### Pattern 3: Unique Keys for Multiple Grids

Use descriptive storage keys to avoid conflicts:

```tsx
// MembersGrid.tsx
const { effectiveColumns } = useDataTableColumns({
  key: 'admin-members-grid',
  columns: [...],
});

// TasksGrid.tsx
const { effectiveColumns } = useDataTableColumns({
  key: 'admin-tasks-grid',
  columns: [...],
});
```

---

## Integration Notes

### TypeScript Support

The hook is fully typed - use your data type for type safety:

```tsx
interface Member {
  id: string;
  companyName: string;
  email: string;
  status: string;
}

const { effectiveColumns } = useDataTableColumns<Member>({
  key: 'members-grid',
  columns: [...],
});
```

### LocalStorage Keys

Storage format: `mantine-datatable-${storeColumnsKey}`

Example: `storeColumnsKey: 'members-grid'` → localStorage key: `mantine-datatable-members-grid`

### Clearing User Preferences

```tsx
// Programmatically clear saved preferences
localStorage.removeItem('mantine-datatable-members-grid');
```

---

## Troubleshooting

### Issue: Columns not persisting

**Solution:** Ensure `storeColumnsKey` matches between `useDataTableColumns` and `<DataTable>`

```tsx
const key = 'my-grid'; // Define once

const { effectiveColumns } = useDataTableColumns({ key, columns: [...] });

<DataTable storeColumnsKey={key} columns={effectiveColumns} />
```

### Issue: Reset button not working

**Solution:** Use the `resetColumnsToggle` function from the hook, not a custom implementation

```tsx
const { resetColumnsToggle } = useDataTableColumns({ ... });

<Button onClick={resetColumnsToggle}>Reset</Button> // Correct
<Button onClick={() => {}}>Reset</Button> // Wrong
```

### Issue: Column toggle menu not appearing

**Solution:** Ensure at least one column has `toggleable: true`. Non-toggleable grids won't show the menu.

---

## Additional Resources

- **Official Docs:** https://icflorescu.github.io/mantine-datatable/examples/column-dragging-and-toggling/
- **Component Props:** https://icflorescu.github.io/mantine-datatable/component-properties
- **GitHub:** https://github.com/icflorescu/mantine-datatable
- **NPM:** https://www.npmjs.com/package/mantine-datatable

---

**Last Updated:** November 2, 2025
