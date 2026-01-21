# Refactoring Troubleshooting

## Issue
The refactored application loads the map and CSS/JS files correctly, but the initialization function `initializeApp()` is not being called. The category selector remains stuck at "Loading categories..."

## Observations

1. ✅ All JavaScript files load successfully (200/304 status)
2. ✅ All CSS loads successfully  
3. ✅ Mapbox map initializes and renders
4. ✅ Map 'style.load' event fires (confirmed in console)
5. ❌ Map 'load' event does NOT fire
6. ❌ Map 'idle' event does NOT fire (or fires before listener is attached)
7. ❌ `initializeApp()` never executes

## Root Cause

The Mapbox map is initializing and loading **before** the `app.js` script finishes executing and attaches the event listeners. By the time `map.on('load', initializeApp)` is called, the 'load' event has already fired and won't fire again.

## Solutions to Try

### Option 1: Check map.isStyleLoaded()
Instead of relying on events, check if the map is already ready:

```javascript
// After map creation
setTimeout(() => {
    if (map.isStyleLoaded() && !window.appInitialized) {
        window.appInitialized = true;
        initializeApp();
    }
}, 100);
```

### Option 2: Immediate initialization
Since 'style.load' fires reliably, initialize there:

```javascript
map.on('style.load', () => {
    console.log('Map style loaded');
    hideBaseMapLayers();
    
    // Initialize app here
    if (!window.appInitialized) {
        window.appInitialized = true;
        initializeApp();
    }
});
```

### Option 3: Use setInterval to poll
```javascript
const initCheck = setInterval(() => {
    if (map.loaded() && map.isStyleLoaded() && !window.appInitialized) {
        window.appInitialized = true;
        clearInterval(initCheck);
        initializeApp();
    }
}, 100);
```

## Recommended Fix

Use Option 2 - initialize in the 'style.load' event since it fires reliably and the map is ready at that point.

## Testing Steps

After applying fix:
1. Hard refresh browser (Ctrl+Shift+R)
2. Check console for "Map loaded, initializing application..."
3. Verify category selector populates with categories
4. Select a category and verify stores load
5. Test all functionality
