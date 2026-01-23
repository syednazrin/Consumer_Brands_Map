import mapboxgl from 'mapbox-gl';
import { GeoJSONCollection } from '../utils/dataLoader';
import { enforceLayerHierarchy } from '../utils/layerUtils';

/**
 * Initialize district layers (choropleth and borders)
 */
export function initializeDistrictLayers(map: mapboxgl.Map, districtData: GeoJSONCollection | null) {
  if (!districtData) {
    console.log('initializeDistrictLayers: No district data provided');
    return;
  }

  if (!map.isStyleLoaded()) {
    console.log('initializeDistrictLayers: Style not loaded, waiting...');
    map.once('style.load', () => initializeDistrictLayers(map, districtData));
    return;
  }

  console.log('initializeDistrictLayers: Initializing with', districtData.features.length, 'features');

  try {
    // Add source
    if (!map.getSource('districts')) {
      console.log('initializeDistrictLayers: Adding districts source');
      map.addSource('districts', {
        type: 'geojson',
        data: districtData as any
      });
    } else {
      console.log('initializeDistrictLayers: Districts source already exists, updating data');
      const source = map.getSource('districts') as mapboxgl.GeoJSONSource;
      source.setData(districtData as any);
    }

    // Add fill layer (choropleth)
    if (!map.getLayer('district-fills')) {
      console.log('initializeDistrictLayers: Adding district-fills layer');
      map.addLayer({
        id: 'district-fills',
        type: 'fill',
        source: 'districts',
        paint: {
          'fill-color': '#ccc',
          'fill-opacity': 0.7
        }
      });
    } else {
      console.log('initializeDistrictLayers: district-fills layer already exists');
    }

    // Add border layer
    if (!map.getLayer('district-borders')) {
      console.log('initializeDistrictLayers: Adding district-borders layer');
      map.addLayer({
        id: 'district-borders',
        type: 'line',
        source: 'districts',
        paint: {
          'line-color': '#333',
          'line-width': 1.5,
          'line-opacity': 0.8
        }
      });
    } else {
      console.log('initializeDistrictLayers: district-borders layer already exists');
    }

    enforceLayerHierarchy(map);
    console.log('initializeDistrictLayers: Successfully initialized district layers');
  } catch (err) {
    console.error('initializeDistrictLayers: Error:', err);
  }
}

/**
 * Update district data source
 */
export function updateDistrictSource(map: mapboxgl.Map, districtData: GeoJSONCollection | null) {
  const source = map.getSource('districts');
  if (source && source.type === 'geojson') {
    source.setData(districtData as any);
  }
}

/**
 * Update choropleth colors based on metric
 */
export function updateChoropleth(map: mapboxgl.Map, districtData: GeoJSONCollection, metric: string) {
  if (!map.getLayer('district-fills')) return;

  const values = districtData.features
    .map(f => f.properties[metric])
    .filter(v => v != null && !isNaN(v) && v !== 0);

  if (values.length === 0) return;

  const min = Math.min(...values);
  const max = Math.max(...values);

  const colorExpression: any = [
    'case',
    ['==', ['get', metric], null], '#e0e0e0',
    ['==', ['get', metric], 0], '#f5f5f5',
    [
      'interpolate',
      ['linear'],
      ['get', metric],
      min, '#4ade80',
      min + (max - min) * 0.25, '#a3e635',
      min + (max - min) * 0.50, '#facc15',
      min + (max - min) * 0.75, '#fb923c',
      max, '#ef4444'
    ]
  ];

  try {
    map.setPaintProperty('district-fills', 'fill-color', colorExpression);
    map.setPaintProperty('district-fills', 'fill-opacity', 0.7);
    
    // Update legend
    const legendTitle = document.getElementById('legend-title');
    const legendMin = document.getElementById('legend-min');
    const legendMax = document.getElementById('legend-max');
    
    if (legendTitle) {
      legendTitle.textContent = metric === 'Population (k)' ? 'Population (thousands)' :
                                metric === 'Income per capita' ? 'Income per Capita' :
                                'Total Income (Billion RM)';
    }
    if (legendMin) legendMin.textContent = min.toFixed(1);
    if (legendMax) legendMax.textContent = max.toFixed(1);
  } catch (err) {
    console.error('Error updating choropleth:', err);
  }
}
