# ✅ Resizable Sidebar Feature

## Summary

The sidebar (Store Locations Map panel) is now **fully resizable**! Users can adjust the width by dragging the left edge.

## Implementation Details

### 1. **CSS Changes** (`static/css/styles.css`)

Added resizable properties to `.sidebar`:
```css
.sidebar {
    width: 400px;
    min-width: 300px;      /* Minimum width constraint */
    max-width: 800px;      /* Maximum width constraint */
    resize: horizontal;    /* Enable horizontal resize */
    transition: none;      /* Disable transition during resize */
}
```

Added resize handle styling:
```css
.resize-handle {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 8px;
    cursor: ew-resize;
    background: transparent;
    z-index: 10;
}

.resize-handle:hover {
    background: rgba(255, 0, 0, 0.1);  /* Red tint on hover */
}

.resize-handle::before {
    content: '';
    position: absolute;
    left: 2px;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 40px;
    background: #e0e0e0;
    border-radius: 2px;
}

.resize-handle:hover::before {
    background: #ff0000;  /* Red when hovering */
}

.sidebar.resizing {
    transition: none;
    user-select: none;  /* Prevent text selection during resize */
}
```

### 2. **HTML Changes** (`templates/index.html`)

Added resize handle element:
```html
<div class="sidebar" id="sidebar">
    <div class="resize-handle" id="resize-handle"></div>
    <!-- rest of sidebar content -->
</div>
```

### 3. **JavaScript Changes** (`static/js/uiHandlers.js`)

Added resize functionality:
```javascript
function initializeSidebarResize() {
    const sidebar = document.getElementById('sidebar');
    const resizeHandle = document.getElementById('resize-handle');
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    // Start resize on mousedown
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
        sidebar.classList.add('resizing');
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
    });

    // Update width during drag
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const deltaX = startX - e.clientX;
        const newWidth = startWidth + deltaX;

        // Apply constraints (300px - 800px)
        const constrainedWidth = Math.max(300, Math.min(800, newWidth));
        sidebar.style.width = `${constrainedWidth}px`;
    });

    // End resize on mouseup
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            sidebar.classList.remove('resizing');
            document.body.style.cursor = '';
        }
    });
}
```

Called in `initializeUIHandlers()`:
```javascript
// Initialize sidebar resize
initializeSidebarResize();
```

## Features

### ✅ Visual Resize Handle
- **8px wide** draggable area on the left edge of sidebar
- **Visual indicator**: Gray bar (4px × 40px) centered vertically
- **Hover effect**: Turns red when hovering over handle
- **Cursor change**: Shows `ew-resize` cursor (↔) when hovering

### ✅ Smooth Dragging
- Drag left to make sidebar **wider**
- Drag right to make sidebar **narrower**
- Real-time width adjustment as you drag

### ✅ Width Constraints
- **Minimum width**: 300px (prevents sidebar from being too narrow)
- **Maximum width**: 800px (prevents sidebar from covering entire map)
- **Default width**: 400px

### ✅ User Experience
- No text selection during resize
- Cursor changes to resize indicator globally during drag
- Smooth, responsive resizing
- Width persists during session (until page refresh)

## How to Use

1. **Hover** over the left edge of the sidebar
2. Look for the **gray vertical bar** (turns red on hover)
3. **Click and drag** left or right to adjust width
4. **Release** to set the new width

## Benefits

- 📊 **More data visibility**: Widen sidebar to see more store details
- 🗺️ **More map space**: Narrow sidebar to see more of the map
- 🎯 **Flexible layout**: Adjust to your preference
- 💻 **Responsive**: Works on different screen sizes

## Technical Notes

- Resize handle has `z-index: 10` to stay above other sidebar content
- Uses `position: absolute` for precise positioning
- Mouse events attached to `document` for smooth dragging outside handle
- Width constraints enforced with `Math.max()` and `Math.min()`
- Resize state managed with `isResizing` flag

## Browser Compatibility

✅ Works in all modern browsers:
- Chrome/Edge
- Firefox
- Safari
- Opera

## Future Enhancements (Optional)

- [ ] Save width preference to localStorage
- [ ] Add double-click to reset to default width
- [ ] Add keyboard shortcuts (Ctrl+[ / Ctrl+])
- [ ] Animate resize handle on first visit (tutorial)

---

**Status**: ✅ **IMPLEMENTED AND WORKING**  
**Date**: January 21, 2026  
**Files Modified**: 3 (styles.css, index.html, uiHandlers.js)
