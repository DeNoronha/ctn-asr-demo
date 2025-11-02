# Grid Standardization TODO

**Status**: 3/12 Complete
**Updated**: November 2, 2025

## Completed ✅

1. **MembersGrid.tsx** (Commit c34b019)
   - Removed custom column management
   - Removed custom export menu
   - Removed custom search input
   - Enabled all standard features

2. **common/DataGrid.tsx** (Commit 4fc331b)
   - Enhanced wrapper with standard features
   - Added enableHiding, renderTopToolbarCustomActions
   - Standardized positioning

3. **CSS Fixes** (Commit e910ed7)
   - Fixed vertical scrolling
   - Standardized widths

## Standard Configuration Pattern

Apply this configuration to ALL grids:

```typescript
const table = useMantineReactTable({
  columns: mantineColumns,
  data: gridData,

  // Row Selection
  enableRowSelection: true,

  // Column Features
  enableColumnResizing: true,
  enableColumnOrdering: true,
  enableHiding: true,
  enableColumnFilters: true,

  // Sorting & Filtering
  enableSorting: true,
  enableGlobalFilter: true,
  enableFilters: true,

  // Pagination
  enablePagination: true,

  // Table styling
  mantineTableProps: {
    striped: true,
    withColumnBorders: true,
    withTableBorder: true,
  },

  // Toolbar positioning
  positionGlobalFilter: 'left',
  positionToolbarAlertBanner: 'bottom',
  positionActionsColumn: 'last',
});
```

## To Remove From Each Grid

1. **Custom Column Management**
   - Remove `columns` state array
   - Remove `toggleColumn()` function
   - Remove `resetColumns()` function
   - Remove custom column menu buttons

2. **Custom Toolbar Buttons**
   - Remove custom "Columns" dropdown
   - Remove custom "Export" dropdown
   - Remove custom search input
   - Remove "Advanced Filter" custom panel

3. **Custom localStorage**
   - Remove `localStorage.getItem('gridColumns')`
   - Remove `localStorage.setItem('gridColumns')`
   - Built-in persistence handles this

## Remaining Grids (10)

### 1. TasksGrid.tsx
- **Priority**: High
- **Complexity**: Medium
- **Features**: Task management, dual tabs (my tasks / review tasks)
- **Changes Needed**:
  - Standardize both table configurations
  - Remove custom column management if present
  - Add standard features

### 2. EndpointManagement.tsx
- **Priority**: Medium
- **Complexity**: Low
- **Features**: API endpoint configuration
- **Changes Needed**:
  - Apply standard configuration
  - Enable column resizing, hiding

### 3. ContactsManager.tsx
- **Priority**: Medium
- **Complexity**: Low
- **Features**: Contact management
- **Changes Needed**:
  - Apply standard configuration
  - Remove custom toolbar if present

### 4. IdentifiersManager.tsx
- **Priority**: Medium
- **Complexity**: Medium
- **Features**: Legal entity identifier management
- **Changes Needed**:
  - Apply standard configuration
  - Standardize column definitions

### 5. IdentifierVerificationManager.tsx
- **Priority**: Medium
- **Complexity**: Medium
- **Features**: Identifier verification workflow
- **Changes Needed**:
  - Apply standard configuration
  - Remove custom column toggles

### 6. KvkReviewQueue.tsx
- **Priority**: High
- **Complexity**: High
- **Features**: KvK document review, flagged entities
- **Changes Needed**:
  - Apply standard configuration
  - Remove custom column management
  - Standardize review workflow UI

### 7. M2MClientsManager.tsx
- **Priority**: Low
- **Complexity**: Low
- **Features**: Machine-to-machine client management
- **Changes Needed**:
  - Apply standard configuration

### 8. ReviewTasks.tsx
- **Priority**: High
- **Complexity**: Medium
- **Features**: Task review workflow
- **Changes Needed**:
  - Apply standard configuration
  - Standardize task actions

### 9. users/UserManagement.tsx
- **Priority**: High
- **Complexity**: Medium
- **Features**: User administration
- **Changes Needed**:
  - Apply standard configuration
  - Remove custom user management toolbar

### 10. audit/AuditLogViewer.tsx
- **Priority**: Low
- **Complexity**: Low
- **Features**: Audit log viewing (read-only)
- **Changes Needed**:
  - Apply standard configuration
  - Enable search/filter only (no row selection)

## Testing Checklist

After standardization, verify each grid has:

- ✅ Column resizing (visible separators)
- ✅ Column show/hide (via header menu)
- ✅ Column reordering (drag-and-drop)
- ✅ Global search (left side of toolbar)
- ✅ Per-column filtering
- ✅ Row selection (if applicable)
- ✅ Consistent toolbar layout
- ✅ No console errors
- ✅ Responsive on mobile

## Deployment Strategy

1. Standardize all 10 grids
2. Run `npm run typecheck`
3. Fix any TypeScript errors
4. Commit all changes in one batch
5. Push to main
6. Monitor Azure pipeline
7. Test on Azure after deployment

## Estimated Effort

- **Per Grid**: 10-15 minutes
- **Total**: ~2 hours
- **Testing**: 30 minutes
- **Total**: ~2.5 hours
