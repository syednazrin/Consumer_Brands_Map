import mapboxgl from 'mapbox-gl';
import { GeoJSONCollection, GeoJSONFeature } from '../utils/dataLoader';
import { calculateDCReach } from '../utils/analyticsUtils';
import { enforceLayerHierarchy, setLayerVisibility } from '../utils/layerUtils';

/**
 * Initialize sonar circle layers for DC reach visualization
 */
export function initializeSonarLayers(map: mapboxgl.Map) {
  if (!map.isStyleLoaded()) {
    console.log('initializeSonarLayers: Style not loaded, waiting...');
    map.once('style.load', () => initializeSonarLayers(map));
    return;
  }

  console.log('initializeSonarLayers: Initializing sonar layers');

  try {
    // Create source for sonar circles
    if (!map.getSource('dc-sonar-circles')) {
      console.log('initializeSonarLayers: Adding dc-sonar-circles source');
      map.addSource('dc-sonar-circles', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }

    // Create sonar circle layer (animated pulsing circles)
    if (!map.getLayer('dc-sonar-circles')) {
      console.log('initializeSonarLayers: Adding dc-sonar-circles layer');
      map.addLayer({
        id: 'dc-sonar-circles',
        type: 'circle',
        source: 'dc-sonar-circles',
        paint: {
          'circle-color': '#2196F3',
          'circle-opacity': 0.3,
          'circle-radius': 0,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#2196F3',
          'circle-stroke-opacity': 0.6
        }
      });
    }

    enforceLayerHierarchy(map);
    console.log('initializeSonarLayers: Successfully initialized sonar layers');
  } catch (err) {
    console.error('initializeSonarLayers: Error:', err);
  }
}

/**
 * Update sonar circles based on DC reach data
 */
export function updateSonarCircles(
  map: mapboxgl.Map,
  storeData: GeoJSONCollection | null,
  dcData: GeoJSONCollection | null
) {
  if (!map.isStyleLoaded()) {
    console.log('updateSonarCircles: Style not loaded yet');
    return;
  }

  const source = map.getSource('dc-sonar-circles');
  if (!source || source.type !== 'geojson') {
    console.log('updateSonarCircles: Sonar source not found');
    return;
  }

  if (!storeData || !dcData || !storeData.features || !dcData.features || dcData.features.length === 0) {
    console.log('updateSonarCircles: No data available, clearing circles');
    (source as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] } as any);
    return;
  }

  // Calculate DC reach for each DC (finds furthest store distance for each DC)
  const dcReachData = calculateDCReach(storeData.features, dcData.features);
  
  console.log(`updateSonarCircles: DC reach calculation complete. Total DCs: ${dcData.features.length}, DCs with assigned stores: ${dcReachData.dcReaches.filter(r => r.maxDistance > 0).length}`);
  
  // Log each DC's reach for verification
  dcReachData.dcReaches.forEach((reach, idx) => {
    if (reach.maxDistance > 0) {
      console.log(`updateSonarCircles: DC ${idx} (${reach.dcName}) - Max distance to assigned stores: ${reach.maxDistance.toFixed(2)} km`);
    }
  });
  
  // Create circle features for each DC with its reach radius (furthest store distance)
  const sonarFeatures = dcData.features
    .map((dc, idx) => {
      const dcReach = dcReachData.dcReaches.find(r => r.dcIndex === idx);
      const maxDistance = dcReach ? dcReach.maxDistance : 0;
      
      return {
        type: 'Feature' as const,
        geometry: dc.geometry,
        properties: {
          dcIndex: idx,
          maxDistance: maxDistance,
          currentRadiusKm: maxDistance * 0.5, // Start at 50% for animation
          currentOpacity: 0.4
        }
      };
    })
    .filter(f => f.properties.maxDistance > 0); // Only show circles for DCs with assigned stores

  // Update source data
  (source as mapboxgl.GeoJSONSource).setData({
    type: 'FeatureCollection',
    features: sonarFeatures
  } as any);

  console.log(`updateSonarCircles: Updated ${sonarFeatures.length} sonar circles with maxDistance values`);
}

/**
 * Show/hide sonar circles
 */
export function setSonarVisibility(map: mapboxgl.Map, visible: boolean) {
  if (!map.isStyleLoaded()) {
    return;
  }

  if (map.getLayer('dc-sonar-circles')) {
    setLayerVisibility(map, 'dc-sonar-circles', visible);
    console.log(`setSonarVisibility: ${visible ? 'Showing' : 'Hiding'} sonar circles`);
  }
}
