# Advanced Grid Features - Guide

## Features Implemented

### 1. Column Visibility Toggle
- **Columns** dropdown in toolbar
- Show/hide any column
- Settings persist across sessions (localStorage)

### 2. Column Resizing
- Drag column borders to resize
- Grid automatically adjusts

### 3. Row Selection
- Checkbox in first column
- Select individual rows or all rows
- Selected count shows in toolbar

### 4. Bulk Actions
- "Bulk Actions" button appears when rows selected
- Export selected members
- Issue tokens for multiple members
- Delete multiple members (UI ready, needs backend)

### 5. Grid State Persistence
- Column visibility saved
- Sort order saved
- Survives page refresh

### 6. Advanced Sorting
- Multi-column sort (Shift+Click)
- Column menu with sort options
- Ascending/descending

### 7. Column Filtering
- Per-column filters via column menu
- Date filtering for "Joined" column
- Text filtering for other columns

### 8. Reset Layout
- "Reset Layout" button
- Restores default column order and visibility
- Clears saved preferences

## How to Use

### Column Management
1. Click **Columns** dropdown
2. Check/uncheck columns to show/hide
3. Changes save automatically

### Selecting Rows
1. Click checkbox in first column
2. Or click header checkbox to select all
3. Use **Bulk Actions** for operations

### Sorting
- Click column header to sort
- Click again to reverse
- Hold Shift + click for multi-column sort

### Filtering
- Click column menu (⋮ icon in header)
- Choose filter options
- Combine multiple filters

### Resizing Columns
- Hover between column headers
- Cursor changes to resize icon
- Drag to adjust width

### Reset
- Click **Reset Layout** to restore defaults
- Clears all saved preferences

## Testing Checklist

- [ ] Toggle column visibility
- [ ] Resize columns
- [ ] Select individual rows
- [ ] Select all rows
- [ ] Use bulk export
- [ ] Sort by different columns
- [ ] Multi-column sort (Shift+Click)
- [ ] Filter by status
- [ ] Filter by date range
- [ ] Reset layout
- [ ] Refresh page (settings persist)
- [ ] Test on mobile view

## Status

✅ Phase 2.2 - Advanced Grid Features: COMPLETE
