import mapboxgl from 'mapbox-gl';
import { LAYER_ORDER } from './config';

/**
 * Enforce the correct layer hierarchy order
 */
export function enforceLayerHierarchy(map: mapboxgl.Map) {
  const existingLayers = LAYER_ORDER.filter(id => map.getLayer(id));
  
  // Move layers to correct order
  for (let i = existingLayers.length - 1; i >= 0; i--) {
    const currentLayer = existingLayers[i];
    if (i === 0) {
      // Bottom layer - find first non-background layer
      const allLayers = map.getStyle().layers;
      const firstMapLayer = allLayers.find(l => 
        l.id !== currentLayer && 
        l.type !== 'background' && 
        !l.id.startsWith('mapbox-')
      );
      if (firstMapLayer) {
        try {
          map.moveLayer(currentLayer, firstMapLayer.id);
        } catch (err) {
          // Ignore
        }
      }
    } else {
      const previousLayer = existingLayers[i - 1];
      if (map.getLayer(previousLayer)) {
        try {
          map.moveLayer(currentLayer, previousLayer);
        } catch (err) {
          // Ignore
        }
      }
    }
  }
}

/**
 * Set layer visibility
 */
export function setLayerVisibility(map: mapboxgl.Map, layerId: string, visible: boolean) {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }
}
