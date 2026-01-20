# Mapbox Store & District Visualization System

An interactive web-based visualization system for exploring retail store locations, distribution centers, and district-level statistics across Malaysia.

## Features

- **Dynamic Category Selection**: Choose from 8 retail categories (99 SpeedMart, Convenience Stores, Department Stores, Eco Shop, Fast Fashion, Food and Beverages, Gold Shops, MR DIY + MR TOY)
- **Distribution Centers**: Automatically displays distribution centers (3× larger markers) for applicable categories
- **Multiple View Modes**:
  - **Cluster Mode**: Stores grouped by proximity for better performance
  - **Individual Mode**: Each store shown as separate marker
  - **None Mode**: Only district choropleth visible with hover interactions
- **Choropleth Overlay**: District-level metrics with dynamic color gradient (Green → Yellow → Orange → Red)
- **Interactive Map**: Click markers for details, hover districts in None mode
- **Collapsible Side Panel**: Clean, modern UI with resizable sidebar

## Technology Stack

- **Mapbox GL JS v2.15.0**: Interactive mapping
- **Turf.js**: Geospatial analysis
- **D3.js**: Color scales and data visualization
- **Flask**: Backend server for data serving
- **GeoJSON**: Standardized spatial data format

## Project Structure

```
Visualization/
├── index.html          # Main application (single-page)
├── app.py             # Flask server
└── README.md          # This file

Data Sources:
├── Finalized Data/    # Store GeoJSON files by category
│   ├── [Category]/
│   │   ├── GEOJSON Data/
│   │   │   └── *.geojson
│   │   └── DC/         # Distribution centers (99 SpeedMart, Food & Beverages, MR DIY + MR TOY only)
│   │       └── *.json
│
└── District Data/     # District boundaries and statistics
    ├── malaysia.district.geojson
    └── District Statistics.geojson
```

## Installation & Setup

### Prerequisites

- Python 3.7+
- Flask

### Install Dependencies

```bash
pip install flask
```

### Run the Application

```bash
cd "D:\Ambank Project\Consumer_Brands_Map\Visualization"
python app.py
```

The server will start on http://localhost:5001

Open your browser and navigate to the URL to access the visualization.

## Usage Guide

### 1. Select a Category

Use the **"Select Category"** dropdown to choose a retail category. The map will automatically:
- Load all store locations for that category
- Display distribution centers if available
- Update the store count statistics
- Zoom to fit all locations

### 2. Choose Display Mode

**Cluster Mode** (Default):
- Stores grouped by proximity
- Numbers indicate cluster size
- Click clusters to zoom in
- Best for overview of dense areas

**Individual Mode**:
- Every store shown separately
- Click markers for store details
- Better for detailed exploration
- Distribution centers remain visible

**None Mode**:
- All markers hidden
- Only district choropleth visible
- Hover over districts to see statistics
- Best for district-level analysis

### 3. Change District Metric

Use the **"District Metric"** dropdown to visualize different statistics:
- **Population (thousands)**: District population
- **Income per Capita**: Average income per person
- **Total Income**: Total district income in billions RM

The choropleth colors update immediately using the gradient:
- 🟢 Green: Low values
- 🟡 Yellow: Medium-low values
- 🟠 Orange: Medium-high values
- 🔴 Red: High values

### 4. Interactive Features

**Store Markers**:
- Click any store marker to view details (Name, Address, District, State)
- In Cluster mode, click clusters to zoom and expand

**Distribution Centers** (Blue markers, 3× larger):
- Automatically shown for 99 SpeedMart, Food and Beverages, MR DIY + MR TOY
- Click for DC details (Code, Name, Address, State)
- Never clustered, always visible in Cluster and Individual modes

**Districts** (None mode only):
- Hover over districts to see popup with statistics
- Choropleth colors represent selected metric intensity

## Technical Implementation

### Layer Hierarchy (Critical Order)

The system maintains strict layer ordering to ensure correct visual stacking:

```
TOP (drawn last, appears on top)
  ↓ Store Markers/Clusters
  ↓ DC Markers (3× size, blue)
  ↓ District Borders (lines)
  ↓ Choropleth Fill (colored polygons)
BOTTOM (drawn first, appears below)
```

This order is enforced after every layer operation using `enforceLayerHierarchy()`.

### Data Loading

**Store Data**:
- Loaded from `Finalized Data/{category}/GEOJSON Data/*.geojson`
- Merged into single FeatureCollection
- Coordinates in [longitude, latitude] format

**Distribution Centers**:
- Loaded from `Finalized Data/{category}/DC/*.json`
- Converted from custom JSON format to GeoJSON
- GPS coordinates parsed from "lat, lon" strings
- Tagged with `type: "distribution_center"` property

**District Data**:
- Geometry from `malaysia.district.geojson`
- Statistics from `District Statistics.geojson`
- Joined by State + District name matching

### Choropleth Color Calculation

Uses Mapbox GL expressions with linear interpolation:

```javascript
[
    'interpolate',
    ['linear'],
    ['get', metric],
    min, '#4ade80',              // Green
    min + (max - min) * 0.33, '#facc15',   // Yellow
    min + (max - min) * 0.66, '#fb923c',   // Orange
    max, '#ef4444'               // Red
]
```

## API Endpoints

The Flask server provides:

- `GET /`: Main application page
- `GET /api/categories`: List of available categories
- `GET /api/category/<name>/files`: GeoJSON files for category
- `GET /data/<path>`: Static file serving from Finalized Data
- `GET /district-data/<path>`: Static file serving from District Data

## Mapbox Configuration

**Access Token**: Embedded in index.html (reused from Template)
- Token: `pk.eyJ1IjoibXNoYW1pIiwiYSI6ImNtMGljY28zMzBqZGsycXF4MGppdmE0bWUifQ.nWArfpCw78mToZi2cN-e8w`
- Map Style: `mapbox://styles/mapbox/light-v11`
- Center: `[101.6869, 3.1390]` (Malaysia)
- Default Zoom: 6

## Browser Compatibility

- Chrome/Edge (Recommended)
- Firefox
- Safari

Requires modern browser with ES6+ support and WebGL for Mapbox rendering.

## Troubleshooting

**Map not loading?**
- Check console for errors
- Verify Mapbox token is valid
- Ensure internet connection (Mapbox requires online access)

**Data not appearing?**
- Check file paths in browser Network tab
- Verify GeoJSON files exist in correct directories
- Check Flask server console for errors

**Layer ordering issues?**
- The system automatically enforces hierarchy
- Check console for `enforceLayerHierarchy()` calls
- Refresh page to reset layer order

## Performance Notes

- Cluster mode provides best performance for categories with many stores (1000+)
- Individual mode recommended for categories with < 500 stores
- District choropleth updates instantly when changing metrics
- GeoJSON files cached by browser for faster subsequent loads

## Future Enhancements

Potential improvements:
- Search functionality for specific stores
- Export data to CSV/Excel
- Print/screenshot capabilities
- Custom color schemes
- Advanced filtering (by district, state, etc.)
- Heatmap visualization option
- Route planning between stores

## Credits

- **Mapbox GL JS**: Interactive mapping library
- **Turf.js**: Geospatial analysis
- **D3.js**: Data visualization
- **Flask**: Python web framework

## License

Internal use only for Ambank Consumer Brands Map project.
