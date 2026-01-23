import mapboxgl from 'mapbox-gl';
import { GeoJSONCollection } from '../utils/dataLoader';
import { enforceLayerHierarchy, setLayerVisibility } from '../utils/layerUtils';

/**
 * Initialize store layers (clustered and individual)
 */
export function initializeStoreLayers(map: mapboxgl.Map) {
  if (!map.isStyleLoaded()) {
    console.log('initializeStoreLayers: Style not loaded, waiting...');
    map.once('style.load', () => initializeStoreLayers(map));
    return;
  }

  console.log('initializeStoreLayers: Initializing store layers');

  try {
    // Add clustered source
    if (!map.getSource('stores')) {
      console.log('initializeStoreLayers: Adding stores source');
      map.addSource('stores', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });
    }

    // Add cluster circle layer
    if (!map.getLayer('store-clusters')) {
      console.log('initializeStoreLayers: Adding store-clusters layer');
      map.addLayer({
        id: 'store-clusters',
        type: 'circle',
        source: 'stores',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#ff9999',
            10, '#ff6666',
            30, '#ff3333',
            50, '#ff0000'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            12,
            10, 18,
            30, 24,
            50, 30
          ],
          'circle-stroke-width': 0
        }
      });
    }

    // Add cluster count layer
    if (!map.getLayer('store-cluster-count')) {
      console.log('initializeStoreLayers: Adding store-cluster-count layer');
      map.addLayer({
        id: 'store-cluster-count',
        type: 'symbol',
        source: 'stores',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 16,
          'text-anchor': 'center',
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': '#333333',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2
        }
      });
    }

    // Add unclustered point layer
    if (!map.getLayer('store-points')) {
      console.log('initializeStoreLayers: Adding store-points layer');
      map.addLayer({
        id: 'store-points',
        type: 'circle',
        source: 'stores',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'brandColor'],
          'circle-radius': 6,
          'circle-stroke-width': 0
        }
      });
    }

    // Add individual marker source and layer
    if (!map.getSource('stores-individual')) {
      console.log('initializeStoreLayers: Adding stores-individual source');
      map.addSource('stores-individual', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }

    if (!map.getLayer('store-markers-individual')) {
      console.log('initializeStoreLayers: Adding store-markers-individual layer');
      map.addLayer({
        id: 'store-markers-individual',
        type: 'circle',
        source: 'stores-individual',
        paint: {
          'circle-color': ['get', 'brandColor'],
          'circle-radius': 6,
          'circle-stroke-width': 0
        },
        layout: {
          'visibility': 'none'
        }
      });
    }

    console.log('initializeStoreLayers: Successfully initialized store layers');
  } catch (err) {
    console.error('initializeStoreLayers: Error:', err);
  }
}

/**
 * Update store data source based on view mode
 */
export function updateStoreSource(map: mapboxgl.Map, geojson: GeoJSONCollection | null, viewMode: string) {
  if (!map.isStyleLoaded()) {
    console.log('updateStoreSource: Style not loaded yet');
    return;
  }

  if (!geojson || geojson.features.length === 0) {
    console.log('updateStoreSource: Clearing store data');
    // Clear store data
    const storesSource = map.getSource('stores');
    const storesIndividualSource = map.getSource('stores-individual');
    if (storesSource && storesSource.type === 'geojson') {
      (storesSource as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] } as any);
    }
    if (storesIndividualSource && storesIndividualSource.type === 'geojson') {
      (storesIndividualSource as mapboxgl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] } as any);
    }
    setLayerVisibility(map, 'store-clusters', false);
    setLayerVisibility(map, 'store-cluster-count', false);
    setLayerVisibility(map, 'store-points', false);
    setLayerVisibility(map, 'store-markers-individual', false);
    return;
  }

  console.log('updateStoreSource: Updating with', geojson.features.length, 'features, viewMode:', viewMode);

  if (viewMode === 'cluster') {
    const storesSource = map.getSource('stores');
    if (storesSource && storesSource.type === 'geojson') {
      (storesSource as mapboxgl.GeoJSONSource).setData(geojson as any);
      console.log('updateStoreSource: Set cluster data');
    }
    setLayerVisibility(map, 'store-markers-individual', false);
    setLayerVisibility(map, 'store-clusters', true);
    setLayerVisibility(map, 'store-cluster-count', true);
    setLayerVisibility(map, 'store-points', true);
  } else if (viewMode === 'individual') {
    const storesIndividualSource = map.getSource('stores-individual');
    if (storesIndividualSource && storesIndividualSource.type === 'geojson') {
      (storesIndividualSource as mapboxgl.GeoJSONSource).setData(geojson as any);
      console.log('updateStoreSource: Set individual data');
    }
    setLayerVisibility(map, 'store-clusters', false);
    setLayerVisibility(map, 'store-cluster-count', false);
    setLayerVisibility(map, 'store-points', false);
    setLayerVisibility(map, 'store-markers-individual', true);
  } else if (viewMode === 'sonar') {
    // In sonar mode, hide all store layers - only DC markers should be visible
    console.log('updateStoreSource: Hiding stores in sonar mode');
    setLayerVisibility(map, 'store-markers-individual', false);
    setLayerVisibility(map, 'store-clusters', false);
    setLayerVisibility(map, 'store-cluster-count', false);
    setLayerVisibility(map, 'store-points', false);
  } else {
    setLayerVisibility(map, 'store-clusters', false);
    setLayerVisibility(map, 'store-cluster-count', false);
    setLayerVisibility(map, 'store-points', false);
    setLayerVisibility(map, 'store-markers-individual', false);
  }
  
  enforceLayerHierarchy(map);
}
