import mapboxgl from 'mapbox-gl';
import { GeoJSONCollection } from '../utils/dataLoader';
import { enforceLayerHierarchy, setLayerVisibility } from '../utils/layerUtils';

/**
 * Initialize distribution center layers
 */
export function initializeDCLayers(map: mapboxgl.Map) {
  if (!map.isStyleLoaded()) {
    console.log('initializeDCLayers: Style not loaded, waiting...');
    map.once('style.load', () => initializeDCLayers(map));
    return;
  }

  console.log('initializeDCLayers: Initializing DC layers');

  try {
    if (!map.getSource('dc-centers')) {
      console.log('initializeDCLayers: Adding dc-centers source');
      map.addSource('dc-centers', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }

    if (!map.getLayer('dc-markers')) {
      console.log('initializeDCLayers: Adding dc-markers layer');
      try {
        map.addLayer({
          id: 'dc-markers',
          type: 'circle',
          source: 'dc-centers',
          paint: {
            'circle-color': '#2196F3', // Blue color
            'circle-radius': 16, // Bigger than store markers (6px) and small clusters (12px)
            'circle-stroke-width': 3,
            'circle-stroke-color': '#FFFFFF', // White border for visibility
            'circle-opacity': 1.0
          },
          layout: {
            'visibility': 'visible'
          }
        });
        console.log('initializeDCLayers: Successfully added dc-markers layer');
      } catch (err) {
        console.error('initializeDCLayers: Error adding layer:', err);
      }
    } else {
      console.log('initializeDCLayers: dc-markers layer already exists');
    }

    console.log('initializeDCLayers: Successfully initialized DC layers');
  } catch (err) {
    console.error('initializeDCLayers: Error:', err);
  }
}

/**
 * Update distribution center data source
 */
export function updateDCSource(map: mapboxgl.Map, geojson: GeoJSONCollection | null, viewMode: string) {
  if (!map.isStyleLoaded()) {
    console.log('updateDCSource: Style not loaded yet');
    return;
  }

  const dcSource = map.getSource('dc-centers');
  const dcLayer = map.getLayer('dc-markers');
  
  if (!dcSource) {
    console.error('updateDCSource: DC source not found!');
    return;
  }
  
  if (!dcLayer) {
    console.error('updateDCSource: DC layer not found!');
    return;
  }

  // Show DC markers in cluster, individual, and sonar modes
  const shouldShowDC = (viewMode === 'cluster' || viewMode === 'individual' || viewMode === 'sonar');
  
  if (geojson && geojson.features.length > 0 && shouldShowDC) {
    console.log('updateDCSource: Setting DC data with', geojson.features.length, 'features, viewMode:', viewMode);
    console.log('updateDCSource: Sample DC feature:', JSON.stringify(geojson.features[0], null, 2));
    
    (dcSource as mapboxgl.GeoJSONSource).setData(geojson as any);
    
    // Force visibility
    try {
      map.setLayoutProperty('dc-markers', 'visibility', 'visible');
      console.log('updateDCSource: DC markers set to visible');
    } catch (err) {
      console.error('updateDCSource: Error setting visibility:', err);
    }
    
    // Verify the data was set
    const sourceData = (dcSource as mapboxgl.GeoJSONSource)._data;
    if (sourceData && sourceData.features) {
      console.log('updateDCSource: Verified DC source has', sourceData.features.length, 'features');
    }
  } else {
    console.log('updateDCSource: Hiding DC markers, viewMode:', viewMode, 'hasData:', !!geojson?.features?.length);
    (dcSource as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] } as any);
    map.setLayoutProperty('dc-markers', 'visibility', 'none');
  }
  
  enforceLayerHierarchy(map);
}
