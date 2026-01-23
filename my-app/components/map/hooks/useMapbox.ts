import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, MAP_CONFIG } from '../utils/config';

export function useMapbox(containerId: string = 'map') {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (mapRef.current || initializedRef.current) return; // Map already initialized

    // Wait for DOM to be ready
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Map container with id "${containerId}" not found`);
      return;
    }

    // Ensure container is empty
    if (container.children.length > 0) {
      console.warn('Map container should be empty. Clearing it...');
      container.innerHTML = '';
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    console.log('useMapbox: Creating map instance');
    const mapInstance = new mapboxgl.Map({
      container: containerId,
      style: MAP_CONFIG.style,
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom
    });

    mapRef.current = mapInstance;
    initializedRef.current = true;

    // Wait for map to load before setting state
    mapInstance.once('load', () => {
      console.log('useMapbox: Map loaded');
      setMap(mapInstance);
    });

    // Also set map immediately if already loaded
    if (mapInstance.loaded()) {
      console.log('useMapbox: Map already loaded');
      setMap(mapInstance);
    }

    // Hide unnecessary base map layers when style loads
    const hideBaseLayers = () => {
      if (!mapInstance.isStyleLoaded()) {
        mapInstance.once('style.load', hideBaseLayers);
        return;
      }
      
      const style = mapInstance.getStyle();
      if (style && style.layers) {
        let hiddenCount = 0;
        style.layers.forEach(layer => {
          const layerId = layer.id.toLowerCase();
          // Hide all road, transportation, and infrastructure layers
          if (
            layerId.includes('road') ||
            layerId.includes('bridge') ||
            layerId.includes('tunnel') ||
            layerId.includes('ferry') ||
            layerId.includes('path') ||
            layerId.includes('track') ||
            layerId.includes('service') ||
            layerId.includes('street') ||
            layerId.includes('highway') ||
            layerId.includes('motorway') ||
            layerId.includes('trunk') ||
            layerId.includes('primary') ||
            layerId.includes('secondary') ||
            layerId.includes('tertiary') ||
            layerId.includes('link') ||
            layerId.includes('rail') ||
            layerId.includes('transit') ||
            layerId.includes('transportation') ||
            layerId.includes('admin') ||
            layerId.includes('boundary') ||
            layerId.includes('water') ||
            layerId.includes('waterway') ||
            layerId.includes('ocean') ||
            layerId.includes('river') ||
            layerId.includes('lake') ||
            layerId.includes('park') ||
            layerId.includes('landuse') ||
            layerId.includes('land-use') ||
            layerId.includes('national-park') ||
            layerId.includes('natural') ||
            layerId.includes('hillshade') ||
            layerId.includes('landcover') ||
            layerId.includes('label') ||
            layerId.includes('place') ||
            layerId.includes('poi') ||
            layerId.includes('building')
          ) {
            try {
              mapInstance.setLayoutProperty(layer.id, 'visibility', 'none');
              hiddenCount++;
            } catch (err) {
              // Some layers might not support visibility property, try paint opacity instead
              try {
                if (layer.type === 'line' || layer.type === 'fill') {
                  mapInstance.setPaintProperty(layer.id, `${layer.type}-opacity`, 0);
                }
              } catch (paintErr) {
                // Ignore if paint property can't be set
              }
            }
          }
        });
        console.log(`useMapbox: Hidden ${hiddenCount} base map layers`);
      }
    };
    
    // Hide layers when style loads and also on style data changes
    if (mapInstance.isStyleLoaded()) {
      hideBaseLayers();
    } else {
      mapInstance.on('style.load', hideBaseLayers);
    }
    
    // Also hide layers when style data changes (some layers load dynamically)
    mapInstance.on('data', (e) => {
      if (e.dataType === 'style') {
        hideBaseLayers();
      }
    });

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
      mapRef.current = null;
      initializedRef.current = false;
    };
  }, [containerId]);

  return map;
}
