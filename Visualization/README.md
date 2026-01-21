# Store & District Analytics - Mapbox Visualization

A modular, interactive Mapbox-based visualization system for exploring store locations, distribution centers, and district-level metrics across Malaysia.

## 🚀 Quick Start

1. **Start the server:**
   ```bash
   cd "D:\Ambank Project\Consumer_Brands_Map\Visualization"
   python app.py
   ```

2. **Open your browser:**
   ```
   http://localhost:5001
   ```

3. **Use the visualization:**
   - Select a category from the dropdown (e.g., "99 SpeedMart")
   - View stores on the map (clusters or individual markers)
   - Change choropleth metrics (Population, Income per capita, Total Income)
   - Switch between Overview, Stores, and Analytics tabs

## 📁 Project Structure

```
Visualization/
├── templates/
│   ├── index.html              # Main HTML template
│   └── index_backup.html       # Original monolithic file (backup)
├── static/
│   ├── css/
│   │   └── styles.css          # All styling
│   └── js/
│       ├── config.js           # Configuration and constants
│       ├── dataLoader.js       # Data loading functions
│       ├── mapLayers.js        # Map layer management
│       ├── uiHandlers.js       # UI event handlers
│       ├── tabPanels.js        # Tab panel population
│       ├── mapInteractions.js  # Map click/hover handlers
│       └── app.js              # Main application initialization
├── app.py                      # Flask web server
└── README.md                   # This file
```

## ✨ Features

### Map Visualization
- **Choropleth Layer**: District-level metrics with gradient coloring (green → yellow → orange → red)
- **Store Markers**: Clustered or individual display with counts
- **Distribution Centers**: Special markers for DC locations (category-specific)
- **Clean Base Map**: Roads, water, and parks hidden for clarity

### Interactive Controls
- **Category Selector**: Choose from 8 retail categories
- **Metric Selector**: Switch between Population, Income per capita, Total Income
- **Display Modes**:
  - **Cluster**: Group nearby stores with counts
  - **Individual**: Show each store separately
  - **None**: Hide stores, show only choropleth

### Information Panels
- **Overview Tab**: Summary statistics and key metrics
- **Stores Tab**: Searchable list of all stores (click to fly to location)
- **Analytics Tab**: Chart.js visualizations (bar chart + doughnut chart)

### Map Interactions
- **District Click** (in None mode): View all metrics for a district
- **Store Click**: View store details
- **DC Click**: View distribution center information
- **Cluster Click**: Zoom in to expand cluster

## 🎨 Available Categories

1. 99 SpeedMart (with DCs)
2. Convenience Stores (711, Family Mart, KK Mart, MyNews)
3. Department Stores (Aeon, Parkson)
4. Eco Shop
5. Fast Fashion (H&M, HLA, Padini, Uniqlo)
6. Food and Beverages (with DCs)
7. Gold Shops (Habib, Poh Kong, Tomei, Wah Chan)
8. MR DIY + MR TOY (with DCs)

## 📊 District Metrics

- **Population (k)**: Population in thousands
- **Income per capita**: Average income per person (RM)
- **Income**: Total income in billions (RM)

## 🔧 Technical Details

### Technologies
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: Mapbox GL JS v2.15.0
- **Charts**: Chart.js
- **Backend**: Flask (Python)
- **Data Format**: GeoJSON

### Module Responsibilities

| Module | Purpose |
|--------|---------|
| `config.js` | Configuration, constants, file mappings |
| `dataLoader.js` | Load store, DC, and district data |
| `mapLayers.js` | Manage map layers and hierarchy |
| `uiHandlers.js` | Handle UI events (selectors, buttons) |
| `tabPanels.js` | Populate Overview/Stores/Analytics tabs |
| `mapInteractions.js` | Handle map clicks and hovers |
| `app.js` | Initialize and orchestrate all modules |
| `styles.css` | All visual styling |

### Global State Variables

```javascript
window.map                 // Mapbox instance
window.currentCategory     // Selected category
window.currentMetric       // Selected choropleth metric
window.currentViewMode     // Display mode (cluster/individual/none)
window.districtData        // District GeoJSON data
window.storeData           // Store GeoJSON data
window.dcData              // DC GeoJSON data
```

### Layer Hierarchy (Bottom to Top)

1. District fills (choropleth - BOTTOM)
2. District borders
3. DC markers
4. Store clusters
5. Store cluster counts
6. Store points
7. Store individual markers (TOP)

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if Python is installed
python --version

# Check if port 5001 is available
netstat -ano | findstr :5001

# Install Flask if missing
pip install flask
```

### Categories not loading
- Hard refresh browser (Ctrl+Shift+R)
- Check browser console for errors (F12)
- Verify data files exist in `../Finalized Data/`

### Map not displaying
- Check Mapbox access token in `config.js`
- Verify internet connection (Mapbox requires online access)
- Check browser console for errors

### Stores not appearing
- Verify GeoJSON files exist for the category
- Check browser console for fetch errors
- Ensure layer hierarchy is correct

## 📝 Development Guide

### Adding a New Category

1. Add Excel files to `../Finalized Data/[Category Name]/`
2. Run conversion script:
   ```bash
   python "../Finalized Data/Additional Scripts/excel_to_geojson.py"
   ```
3. Add category to `CATEGORIES` array in `config.js`
4. Add file mapping to `CATEGORY_FILE_MAP` in `config.js`
5. If category has DCs, add to `DC_CATEGORIES` and `DC_FILE_PATHS`

### Modifying Styles

Edit `static/css/styles.css`:
- Sidebar styling starts at line ~35
- Map controls at line ~175
- Legend styling at line ~263

### Adding New Map Interactions

Edit `static/js/mapInteractions.js`:
1. Create handler function (e.g., `handleNewClick`)
2. Add event listener in `initializeMapInteractions()`

### Debugging

Enable verbose console logging:
```javascript
// All modules already have console.log() statements
// Check browser console (F12) for detailed logs
```

## 📚 Documentation Files

- **REFACTORING_GUIDE.md** - Overview of refactoring process
- **REFACTORING_COMPLETE.md** - Detailed module documentation
- **REFACTORING_SUCCESS.md** - Test results and success summary
- **TROUBLESHOOTING.md** - Common issues and solutions

## 🔄 Rollback to Original

If you need to revert to the monolithic version:

```bash
cd templates
copy index_backup.html index.html
```

## 📄 License

Internal project for Ambank.

## 🙋 Support

For issues or questions, check:
1. Browser console (F12) for errors
2. Flask server logs in terminal
3. Documentation files (MD files in this directory)

---

**Version**: 2.0 (Refactored)  
**Last Updated**: January 20, 2026  
**Status**: ✅ Production Ready
