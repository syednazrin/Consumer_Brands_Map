import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface SonarAnimationState {
  active: boolean;
  animationFrame: number | null;
  startTime: number | null;
}

/**
 * Hook to manage sonar animation for DC reach visualization
 */
export function useSonarAnimation(
  map: mapboxgl.Map | null,
  enabled: boolean,
  storeData: any,
  dcData: any
) {
  const animationStateRef = useRef<SonarAnimationState>({
    active: false,
    animationFrame: null,
    startTime: null
  });

  // Start/stop animation based on enabled state
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    if (enabled && storeData && dcData) {
      startAnimation();
    } else {
      stopAnimation();
    }

    return () => {
      stopAnimation();
    };
  }, [map, enabled, storeData, dcData]);

  function startAnimation() {
    if (!map || !map.getLayer('dc-sonar-circles')) {
      return;
    }

    // Stop any existing animation
    stopAnimation();

    animationStateRef.current.active = true;
    animationStateRef.current.startTime = Date.now();

    function animate() {
      if (!animationStateRef.current.active) {
        return;
      }

      const now = Date.now();
      const startTime = animationStateRef.current.startTime || now;
      const elapsed = (now - startTime) / 1000; // seconds
      const pulseDuration = 3; // 3 seconds per pulse cycle
      const phase = (elapsed % pulseDuration) / pulseDuration; // 0 to 1

      // Get current sonar source
      const source = map.getSource('dc-sonar-circles');
      if (!source || source.type !== 'geojson') {
        animationStateRef.current.animationFrame = requestAnimationFrame(animate);
        return;
      }

      const geoJsonSource = source as mapboxgl.GeoJSONSource;
      const data = geoJsonSource._data;
      
      if (!data || !data.features || data.features.length === 0) {
        animationStateRef.current.animationFrame = requestAnimationFrame(animate);
        return;
      }

      const zoom = map.getZoom();
      const centerLat = map.getCenter().lat;
      
      // Convert km to approximate pixels at current zoom
      // Formula: meters per pixel = (40075017 * cos(lat)) / (256 * 2^zoom)
      const metersPerPixel = (40075017 * Math.cos(centerLat * Math.PI / 180)) / (256 * Math.pow(2, zoom));

      // Update each circle's radius and opacity based on pulse phase
      const updatedFeatures = data.features.map((feature: any) => {
        const maxRadiusKm = feature.properties.maxDistance;
        
        // Pulse from 0.5x to 1.5x the max radius
        const radiusMultiplier = 0.5 + (phase * 1.0); // 0.5 to 1.5
        const currentRadiusKm = maxRadiusKm * radiusMultiplier;
        const radiusMeters = currentRadiusKm * 1000;
        const radiusPixels = radiusMeters / metersPerPixel;
        
        // Create a new feature with updated radius
        return {
          ...feature,
          properties: {
            ...feature.properties,
            currentRadiusKm: currentRadiusKm,
            radiusPixels: radiusPixels,
            currentOpacity: 0.4 * (1 - phase * 0.75) // Fade from 0.4 to 0.1
          }
        };
      });

      // Update source with new features
      geoJsonSource.setData({
        type: 'FeatureCollection',
        features: updatedFeatures
      } as any);

      // Update paint properties for radius and opacity
      try {
        // Use data-driven radius
        const radiusExpression: any = ['get', 'radiusPixels'];
        const opacity = 0.4 - (phase * 0.3);
        
        map.setPaintProperty('dc-sonar-circles', 'circle-radius', radiusExpression);
        map.setPaintProperty('dc-sonar-circles', 'circle-opacity', opacity);
        map.setPaintProperty('dc-sonar-circles', 'circle-stroke-opacity', Math.min(opacity * 1.5, 0.8));
      } catch (err) {
        console.warn('Error updating sonar animation:', err);
      }

      animationStateRef.current.animationFrame = requestAnimationFrame(animate);
    }

    animate();
  }

  function stopAnimation() {
    if (animationStateRef.current.animationFrame !== null) {
      cancelAnimationFrame(animationStateRef.current.animationFrame);
      animationStateRef.current.animationFrame = null;
    }
    animationStateRef.current.active = false;
  }
}
