# Quick Start Guide - Mapbox Visualization System

## 🚀 Getting Started (3 Steps)

### 1. Start the Server

Open PowerShell or Command Prompt and run:

```bash
cd "D:\Ambank Project\Consumer_Brands_Map\Visualization"
python app.py
```

You should see:
```
============================================================
Mapbox Store & District Visualization System
============================================================
Server starting on http://localhost:5001
Open your browser to view the visualization
============================================================
```

### 2. Open in Browser

Navigate to: **http://localhost:5001**

### 3. Start Exploring!

## 📊 How to Use

### Select a Category
Use the dropdown to choose from:
- 99 SpeedMart
- Convenience Stores  
- Department Stores
- Eco Shop
- Fast Fashion
- Food and Beverages
- Gold Shops
- MR DIY + MR TOY

The map automatically loads all stores and distribution centers (if applicable).

### Choose Display Mode

**🔴 Cluster** (Default)
- Stores grouped together
- Click clusters to zoom in
- Best for categories with many stores

**🔴 Individual**
- Every store shown separately
- Click any marker for details
- Better for detailed exploration

**🔴 None**
- Only district choropleth visible
- Hover districts to see statistics
- Best for district-level analysis

### Change Metrics

Switch between:
- **Population** (thousands)
- **Income per Capita** (RM)
- **Total Income** (Billion RM)

The map colors update instantly:
- 🟢 Green = Low values
- 🟡 Yellow = Medium-low
- 🟠 Orange = Medium-high
- 🔴 Red = High values

## 🎯 Key Features

### Store Markers (Red)
- Small red circles (6px)
- Click for store details
- Shows: Name, Address, District, State

### Distribution Centers (Blue) 
- Large blue circles (18px - 3× stores)
- Only for: 99 SpeedMart, Food and Beverages, MR DIY + MR TOY
- Click for DC details
- Never cluster, always on top

### Districts
- Colored by selected metric
- Hover (in None mode) to see all statistics
- Border lines show boundaries

## 💡 Pro Tips

1. **Zoom quickly**: Click clusters to expand
2. **Compare regions**: Use None mode + metric selector
3. **Find specific store**: Use Individual mode for detail
4. **See big picture**: Use Cluster mode for overview
5. **Collapse sidebar**: Click ◀ button for more map space

## 🎨 Visual Guide

### Layer Stack (Bottom to Top):
```
┌─────────────────────────────┐
│   Store/DC Markers (Top)    │ ← Always visible on top
├─────────────────────────────┤
│   District Borders          │ ← Gray lines
├─────────────────────────────┤
│   Choropleth Fill (Bottom)  │ ← Colored by metric
└─────────────────────────────┘
```

### Color Meaning:
- 🔴 **Red stores**: Regular outlets
- 🔵 **Blue large circles**: Distribution centers
- 🟢🟡🟠🔴 **District colors**: Metric intensity

## ⚠️ Common Issues

**Q: Map shows but no data?**
A: Select a category from the dropdown

**Q: DC markers not showing?**
A: They only appear for 99 SpeedMart, Food and Beverages, MR DIY + MR TOY

**Q: Can't see districts?**
A: Try None mode - hides markers to show choropleth

**Q: Markers disappeared?**
A: Check which view mode is active (Cluster/Individual/None)

## 📱 Browser Support

Works best on:
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari

Requires modern browser with WebGL support.

## 🛑 Stop the Server

Press `CTRL+C` in the terminal where the server is running.

## 📁 Project Structure

```
Visualization/
├── index.html          ← Main app (open http://localhost:5001)
├── app.py             ← Server (run this)
├── README.md          ← Full documentation
├── QUICK_START.md     ← This file
└── test_features.md   ← Testing checklist

Data is loaded from:
├── ../Finalized Data/[Category]/GEOJSON Data/*.geojson
├── ../Finalized Data/[Category]/DC/*.json
└── ../District Data/malaysia.district.geojson
```

## 🎓 Learn More

See **README.md** for:
- Complete feature list
- Technical implementation details
- API endpoints
- Architecture diagrams
- Troubleshooting guide

---

**Ready to explore? Open http://localhost:5001 and start visualizing! 🗺️**
