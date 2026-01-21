# Code Refactoring Guide

## Overview
The monolithic `index.html` file has been broken down into modular components for better organization and maintainability.

## New File Structure

```
Visualization/
├── templates/
│   └── index.html              # Main HTML (simplified, references external files)
├── static/
│   ├── css/
│   │   └── styles.css          # All CSS styles
│   └── js/
│       ├── config.js           # Configuration and constants
│       ├── dataLoader.js       # Data loading functions
│       ├── mapLayers.js        # Map layer management
│       ├── uiHandlers.js       # UI event handlers (TO BE CREATED)
│       ├── tabPanels.js        # Tab panel population (TO BE CREATED)
│       ├── mapInteractions.js  # Map click/hover handlers (TO BE CREATED)
│       └── app.js              # Main application initialization (TO BE CREATED)
└── app.py                      # Flask server (needs update for static files)
```

## Files Created

### ✅ 1. `static/css/styles.css`
- Contains all CSS styling
- Organized into logical sections:
  - Global styles
  - Layout (container, map)
  - Sidebar
  - Tabs
  - Form controls
  - Stats
  - Legend
  - Popups
  - Utility classes
  - Scrollbar styling

### ✅ 2. `static/js/config.js`
- Mapbox access token
- Map configuration
- Categories list
- DC categories
- File mappings
- Layer hierarchy order

### ✅ 3. `static/js/dataLoader.js`
- `loadStoreGeoJSON(category)` - Load store data
- `loadDistributionCenters(category)` - Load DC data
- `loadDistrictData()` - Load district geometry and statistics

### ✅ 4. `static/js/mapLayers.js`
- `enforceLayerHierarchy()` - Maintain layer order
- `initializeDistrictLayers()` - Setup choropleth
- `initializeStoreLayers()` - Setup store markers/clusters
- `initializeDCLayers()` - Setup DC markers
- `updateChoropleth(metric)` - Update choropleth colors
- `updateLegend(metric, min, max)` - Update legend
- `setLayerVisibility(layerId, visible)` - Show/hide layers
- `updateStoreSource(geojson)` - Update store data
- `updateDCSource(geojson)` - Update DC data

## Files Still To Create

### 5. `static/js/uiHandlers.js`
```javascript
// Event handlers for:
// - Category selector change
// - Metric selector change
// - Mode buttons (cluster/individual/none)
// - Collapse button
// - Tab switching
// - Store search/filter
```

### 6. `static/js/tabPanels.js`
```javascript
// Functions for populating tab panels:
// - populateOverviewPanel()
// - populateStoresPanel()
// - populateAnalyticsPanel()
// - filterStores(searchText)
```

### 7. `static/js/mapInteractions.js`
```javascript
// Map interaction handlers:
// - District click (for popups in 'none' mode)
// - Store marker clicks
// - DC marker clicks
// - Cluster clicks (zoom in)
// - Hover effects (cursor changes)
```

### 8. `static/js/app.js`
```javascript
// Main application:
// - Initialize Mapbox
// - Setup global state
// - Hide base map layers (roads, water, etc.)
// - Initialize all components on map load
// - Attach all event listeners
```

### 9. Update `templates/index.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Store & District Analytics</title>
    
    <!-- External Libraries -->
    <script src='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js'></script>
    <link href='https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css' rel='stylesheet' />
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@turf/turf@6.5.0/turf.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <!-- Custom Styles -->
    <link rel="stylesheet" href="{{ url_for('static', filename='css/styles.css') }}">
</head>
<body>
    <!-- HTML content remains the same -->
    
    <!-- Custom Scripts (load in order) -->
    <script src="{{ url_for('static', filename='js/config.js') }}"></script>
    <script src="{{ url_for('static', filename='js/dataLoader.js') }}"></script>
    <script src="{{ url_for('static', filename='js/mapLayers.js') }}"></script>
    <script src="{{ url_for('static', filename='js/uiHandlers.js') }}"></script>
    <script src="{{ url_for('static', filename='js/tabPanels.js') }}"></script>
    <script src="{{ url_for('static', filename='js/mapInteractions.js') }}"></script>
    <script src="{{ url_for('static', filename='js/app.js') }}"></script>
</body>
</html>
```

### 10. Update `app.py`
```python
from flask import Flask, render_template, send_from_directory
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/data/<path:filename>')
def serve_data(filename):
    data_root = os.path.join(app.root_path, '..', 'Finalized Data')
    return send_from_directory(data_root, filename)

@app.route('/district-data/<path:filename>')
def serve_district_data(filename):
    district_root = os.path.join(app.root_path, '..', 'District Data')
    return send_from_directory(district_root, filename)

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0')
```

## Benefits of Refactoring

1. **Modularity**: Each file has a single responsibility
2. **Maintainability**: Easier to find and update specific functionality
3. **Reusability**: Functions can be reused across different parts of the app
4. **Debugging**: Easier to isolate and fix bugs
5. **Performance**: Browser can cache static files
6. **Collaboration**: Multiple developers can work on different modules
7. **Testing**: Individual modules can be tested in isolation

## Migration Status

- ✅ CSS extracted to separate file
- ✅ Configuration extracted
- ✅ Data loading logic extracted
- ✅ Map layers logic extracted
- ⏳ UI handlers (pending)
- ⏳ Tab panels (pending)
- ⏳ Map interactions (pending)
- ⏳ Main app initialization (pending)
- ⏳ HTML template update (pending)
- ⏳ Flask app update (pending)

## Next Steps

1. Complete remaining JavaScript modules
2. Update `index.html` to reference external files
3. Update `app.py` to serve static files
4. Test the refactored application
5. Remove the old monolithic `index.html` (keep as backup initially)

## Notes

- All global variables are prefixed with `window.` for clarity
- Functions maintain the same signatures for compatibility
- Console logging preserved for debugging
- Layer hierarchy enforcement remains critical for proper rendering
