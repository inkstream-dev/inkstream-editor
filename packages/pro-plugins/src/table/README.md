# Table Plugin - Pro Feature

Full-featured table support for Inkstream editor with custom dialog-based insertion, row/column management, and rich formatting options.

## Features

### ✅ Implemented Features

#### 1. **Table Insertion with Custom Dialog**
- Custom React-based dialog for table configuration
- Configure number of rows (1-20)
- Configure number of columns (1-20)
- Optional header row toggle
- Clean, user-friendly interface

#### 2. **Table Structure Management**
- **Add Row Above**: Insert a new row above the current cursor position
- **Add Row Below**: Insert a new row below the current cursor position
- **Delete Row**: Remove the current row
- **Add Column Before**: Insert a new column before the current cursor position
- **Add Column After**: Insert a new column after the current cursor position
- **Delete Column**: Remove the current column
- **Delete Table**: Remove the entire table

#### 3. **Header Row Support**
- Toggle header row on/off
- Distinct styling for header cells (bold, light background)
- Automatic header cell type conversion

#### 4. **Column Resizing**
- Drag-to-resize column handles
- Visual feedback during resize
- Persistent column widths
- Hover effects on resize handles

#### 5. **Keyboard Navigation**
- **Tab**: Move to next cell (creates new row if at end)
- **Shift+Tab**: Move to previous cell
- **Arrow keys**: Navigate between cells
- Standard text editing within cells

#### 6. **Cell Selection**
- Click and drag to select multiple cells
- Visual feedback for selected cells (blue overlay)
- Supports operations on selected cell ranges

#### 7. **Rich Content in Cells**
- Full block-level content support in cells
- Paragraphs, lists, code blocks, and more
- All standard editor formatting (bold, italic, etc.)

#### 8. **Table Styling**
- Professional borders and spacing
- Responsive table wrapper with horizontal scroll
- Fixed table layout for consistent column widths
- Header row highlighting
- Cell padding and alignment

#### 9. **Undo/Redo Support**
- Full transaction support for all table operations
- History tracking for insertions, deletions, and modifications

### 🚧 Planned Features (Not Yet Implemented)

1. **Merge Cells** - Combine adjacent cells into a single cell
2. **Split Cells** - Split merged cells back into individual cells
3. **Cell Alignment** - Configure text alignment within cells (left, center, right)
4. **Cell Background Colors** - Apply custom background colors to individual cells

## Usage

### Installation

The table plugin is part of the `@inkstream/pro-plugins` package and requires a **Pro** license tier.

```typescript
import { EditorWithTableDialog } from '@inkstream/react-editor';
import { proPlugins } from '@inkstream/pro-plugins';

// Use EditorWithTableDialog instead of RichTextEditor to get dialog support
<EditorWithTableDialog
  initialContent="<p>Start editing...</p>"
  plugins={[
    // ... other plugins
    proPlugins.table,
  ]}
  licenseKey="INKSTREAM-PRO-XXXXX"
/>
```

### Injecting Table Styles

Table styles must be injected into the document head:

```typescript
import { injectTableStyles } from '@inkstream/pro-plugins';

// In your component
useEffect(() => {
  injectTableStyles();
}, []);
```

Or dynamically:

```typescript
useEffect(() => {
  import('@inkstream/pro-plugins').then((module) => {
    if (module.injectTableStyles) {
      module.injectTableStyles();
    }
  });
}, []);
```

### Using the Table Dialog

The table plugin integrates with `EditorWithTableDialog` component which provides a custom dialog interface:

1. Click the **Insert Table** button (⊞) in the toolbar
2. Configure table dimensions (rows/columns)
3. Toggle header row option if needed
4. Click **Insert** to add the table

### Toolbar Buttons

When **not** in a table:
- **Insert Table (⊞)**: Opens dialog to insert a new table

When **inside** a table:
- **Table Actions (≡)**: Dropdown menu with:
  - ↑ Row - Add Row Above
  - ↓ Row - Add Row Below
  - ✕ Row - Delete Row
  - ← Col - Add Column Before
  - → Col - Add Column After
  - ✕ Col - Delete Column
  - ⌃ Header - Toggle Header Row
  - ✕ Table - Delete Table

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Move to next cell |
| `Shift+Tab` | Move to previous cell |
| `Arrow keys` | Navigate between cells |

## Technical Details

### Architecture

The table plugin consists of several key components:

1. **table-plugin.ts** - Main plugin definition and ProseMirror integration
2. **table-schema.ts** - Table node definitions and CSS styling
3. **table-commands.ts** - Command functions for table operations
4. **table-toolbar.ts** - Toolbar button definitions and dialog handler
5. **TableInsertDialog.tsx** - React component for table insertion dialog
6. **EditorWithTableDialog.tsx** - Wrapper component that integrates dialog with editor

### ProseMirror Integration

The plugin uses `prosemirror-tables` library for core table functionality:
- `tableEditing()` - Cell selection and keyboard navigation
- `columnResizing()` - Drag-to-resize columns
- `fixTables()` - Ensures table validity after transactions

### Node Types

- **table** - The table container node
- **table_row** - A row within the table
- **table_cell** - A standard table cell
- **table_header** - A header cell (first row when header row is enabled)

### CSS Classes

- `.inkstream-table` - Applied to table elements
- `.inkstream-table-wrapper` - Applied to table wrapper divs
- `.inkstream-table-cell` - Applied to table cells (td)
- `.inkstream-table-header-cell` - Applied to header cells (th)
- `.selectedCell` - Applied to selected cells

### Global Registry

The plugin uses a global registry (`window.__inkstreamTableDialogRegistry__`) to connect the toolbar button with the dialog component:

```typescript
// Set by table plugin when it loads
window.__inkstreamTableDialogRegistry__ = {
  setHandler: (handler) => { /* ... */ },
  insertTable: (rows, cols, withHeaderRow) => { /* ... */ }
};
```

This allows the dialog to be defined in `react-editor` package while the commands are in `pro-plugins`.

## Styling

The plugin includes comprehensive CSS styling for tables:

```css
/* Table borders and layout */
.ProseMirror .tableWrapper > table {
  border-collapse: collapse;
  border: 2px solid #ddd;
  width: 100%;
}

/* Cell styling */
.ProseMirror .tableWrapper > table td,
.ProseMirror .tableWrapper > table th {
  border: 1px solid #ddd;
  padding: 8px 12px;
  vertical-align: top;
}

/* Header styling */
.ProseMirror .tableWrapper > table th {
  font-weight: bold;
  background-color: #f5f5f5;
}

/* Selected cells */
.ProseMirror .tableWrapper > table .selectedCell:after {
  background: rgba(200, 200, 255, 0.4);
}
```

## License Requirements

This plugin requires a **Pro** tier license:

```typescript
licenseKey="INKSTREAM-PRO-XXXXX"
```

Without a valid Pro license, the table plugin will not load and the Insert Table button will not appear in the toolbar.

## Examples

### Basic Usage

```typescript
import { EditorWithTableDialog, useLazyPlugins } from '@inkstream/react-editor';
import { proPlugins } from '@inkstream/pro-plugins';

function MyEditor() {
  const plugins = [
    // ... base plugins
    proPlugins.table,
  ];

  return (
    <EditorWithTableDialog
      initialContent="<p>Click the table button to insert a table!</p>"
      plugins={plugins}
      licenseKey="INKSTREAM-PRO-XXXXX"
    />
  );
}
```

### Lazy Loading

```typescript
const lazyPluginsConfig = [
  {
    loader: () => import('@inkstream/pro-plugins').then(m => ({ 
      table: m.proPlugins.table 
    })),
    requiredTier: 'pro' as const,
    pluginKey: 'table',
  },
];

const { loadedPlugins } = useLazyPlugins({
  licenseKey,
  lazyPlugins: lazyPluginsConfig,
});

const allPlugins = [...basePlugins, ...loadedPlugins];
```

## Browser Support

The table plugin supports all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Known Limitations

1. Cell merging/splitting is not yet implemented
2. Cell alignment customization is not yet implemented
3. Cell background color customization is not yet implemented
4. Table captions are not supported
5. Nested tables are not supported

## Troubleshooting

### Table borders not visible

Make sure `injectTableStyles()` is called:

```typescript
import { injectTableStyles } from '@inkstream/pro-plugins';

useEffect(() => {
  injectTableStyles();
}, []);
```

### Dialog not opening

Ensure you're using `EditorWithTableDialog` instead of `RichTextEditor`:

```typescript
import { EditorWithTableDialog } from '@inkstream/react-editor';

<EditorWithTableDialog {...props} />
```

### Table button not appearing

Check that:
1. You have a valid Pro license key
2. The table plugin is included in the plugins array
3. The plugin loaded successfully (check console for errors)

## Contributing

To add new table features:

1. Add command functions in `table-commands.ts`
2. Add toolbar items in `table-toolbar.ts`
3. Update CSS in `table-schema.ts` if needed
4. Update this README with the new features

## Changelog

### v1.0.0 (December 2025)
- Initial release
- Table insertion with custom dialog
- Row/column management
- Header row support
- Column resizing
- Keyboard navigation
- Cell selection
- Professional styling
