# Canvas Management Settings

## Overview

Add a canvas management section to the settings panel that allows users to:
- Add Canvas (and name it)
- Re-order columns inside a canvas
- Add or remove columns
- Select the contents of a column from the list of available panels

## Implementation Stages

### Stage 1: POC ✅
Settings for operations already supported in app code (e.g., dragging columns).

### Stage 2: Architecture ✅
- Basic settings (drop-downs, radios, buttons)
- Minimal settings UI
- Focus on API and fundamental canvas customization code
- `CanvasContext` updates for canvas CRUD operations

### Stage 3: Settings UI ✅
- Nice UI for canvas management in settings panel
- Canvas list with expand/collapse
- Column reordering via drag-and-drop
- Panel type selection dropdowns
- Canvas icon picker
- Canvas renaming (custom canvases only)

## Completed Features

### Canvas Management
- [x] List all canvases (presets + custom)
- [x] Add new canvas with custom name
- [x] Delete custom canvases
- [x] Rename custom canvases (click name to edit)
- [x] Select canvas icon from picker
- [x] Visual preview of canvas layout
- [x] Preset badge for built-in canvases

### Column Management
- [x] Expand/collapse canvas to show columns
- [x] Drag-and-drop column reordering
- [x] Add columns to canvas
- [x] Remove columns from canvas
- [x] Select panel type for each column
- [x] Panel options grouped by slot type (List, Viz)

### Integration
- [x] Custom canvases appear in header canvas selector
- [x] Canvas state persisted via `useCanvasPersistence`
- [x] Dynamic canvas tabs in app header

## Panel Types

### List Panels
| Type | Component | Status |
|------|-----------|--------|
| `pr-list` | PRList | ✅ |
| `branch-list` | BranchList | ✅ |
| `remote-list` | — | ❌ No component |
| `worktree-list` | WorktreeList | ✅ |
| `stash-list` | StashList | ✅ |
| `commit-list` | CommitList | ✅ |
| `sidebar` | Sidebar | ✅ |

### Viz Panels
| Type | Component | Status |
|------|-----------|--------|
| `git-graph` | GitGraph | ✅ |
| `timeline` | — | ❌ Not implemented |

### Editor Panels
Editor state is global - content determined by selection, not column config.

## Files Modified

### Core Components
- `app/components/SettingsPanel.tsx` - Canvas management UI
- `app/components/canvas/CanvasContext.tsx` - Added `UPDATE_CANVAS` action, `updateCanvas` function
- `app/app.tsx` - Dynamic canvas tabs in header

### Styles
- `app/styles/app.css` - Canvas list, column editor, icon picker styles

## Design Decisions

1. **Settings Panel Location**: Canvas management lives in settings, with potential for in-situ editing later using shared components.

2. **Presets vs Custom**: Preset canvases (Radar, Focus, Graph) cannot be deleted or renamed. Custom canvases have full editing capabilities.

3. **Editor Column**: Editor panels are global state - you can add an editor column but can't select what goes in it (determined by user selection).

4. **No Emojis in Header**: Canvas icons in header use symbols, not emojis, matching existing UI.

## Future Improvements

- [x] ~~Implement `commit-list` as proper list component (not GitGraph placeholder)~~ ✅ Done
- [ ] Implement `remote-list` component
- [ ] Implement `timeline` viz panel
- [ ] In-situ canvas editing (drag columns in main UI)
- [ ] Canvas templates/presets from custom canvases
- [ ] Export/import canvas configurations

