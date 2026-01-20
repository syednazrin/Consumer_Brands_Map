# MR DIY Locations Map

A Flask web application that displays MR DIY store locations on an interactive Mapbox map with analytics and visualization features.

## Features

- **Interactive Map**: Mapbox-powered map showing all MR DIY locations
- **Smart Side Panel**: Tabbed interface with overview, locations list, and analytics
- **Data Visualization**: Charts showing distribution by cities and states
- **Location Search**: Click on locations in the side panel to focus on the map
- **Responsive Design**: Works on desktop and mobile devices

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Make sure you have your data file (Excel or CSV) in the project directory

3. Run the application:
```bash
python app.py
```

4. Open your browser and go to `http://localhost:5000`

## Data Format

The application expects your data to have the following columns:
- `latitude` or `lat` - Location latitude
- `longitude` or `lng` - Location longitude  
- `name` - Store name
- `address` - Store address
- `city` - City name
- `state` - State name
- `postal_code` - Postal code (optional)
- `phone` - Phone number (optional)
- `website` - Website URL (optional)

## Features Overview

### Map
- Interactive Mapbox map with custom markers
- Click markers to see location details
- Smooth navigation and zoom controls

### Side Panel Tabs

#### Overview Tab
- Total location count
- Number of cities and states
- Top cities by location count

#### Locations Tab
- Complete list of all locations
- Click any location to focus on it on the map
- Shows address and contact information

#### Analytics Tab
- Bar chart of top 10 cities by location count
- Doughnut chart showing distribution by state
- Interactive charts with hover effects

## Customization

- **Map Style**: Change the map style in the JavaScript code
- **Colors**: Modify the CSS variables for different color schemes
- **Charts**: Add more chart types using Chart.js
- **Data**: Modify the data processing in `app.py` to match your data structure
