# Sona Studio

## Current State

A professional self-studio photo frame compositing app with 4-cut, 4R, and combo layouts. Features include film date stamps, text/sticker overlays, frame patterns, logo customization, and project save/load. Desktop and mobile UIs are both implemented.

## Requested Changes (Diff)

### Add
- **Mobile film date stamp UI**: Add film date toggle + date input to mobile edit drawer panel (was only in desktop sidebar)
- **Auto photo date**: When a photo is loaded, auto-populate `filmDateStr` with the file's `lastModified` date (formatted as YYYY.MM.DD)
- **Project save name dialog**: When saving project, show a dialog with an Input for custom filename before downloading
- **Photo save option in layout change dialog**: Add a 3rd action button "Save Photo" (saves current canvas as image) in the layout change AlertDialog, alongside existing "Save Project" and "Don't Save"

### Modify
- **Text list items** (both desktop overlay panel and mobile text drawer): Clicking a text item in the list opens an inline color picker (small color swatch button next to the text). Clicking that swatch allows color change of that text overlay directly from the list.
- **Layout change dialog**: Currently has Cancel | Don't Save | Save & Switch. Add "Save Photo" option.

### Remove
- Nothing removed

## Implementation Plan

1. Add `saveNameDialogOpen` (boolean) and `saveNameInput` (string) state variables
2. Modify `handleProjectSave` to accept an optional name param; add a wrapper that opens the save name dialog, and confirms save with chosen name
3. In the layout change dialog, add a 4th button: "Save Photo" that calls `handleSaveImage()` then `applyLayoutSwitch`
4. In mobile drawer edit tab (mobileTab === 'edit'), after the adjustments section, add film date toggle + date input (same as desktop)
5. In `handleFileChange` / `openUpload` / wherever image URL is set: auto-set `filmDateStr` from `file.lastModified` when uploading
6. In the text overlay list items (both desktop and mobile), add a small color swatch `<label><input type='color'></label>` button. Clicking the swatch lets user change that text's color inline
