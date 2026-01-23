import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { GeoJSONCollection } from '../utils/dataLoader';
import {
  initializeDistrictLayers,
  updateDistrictSource,
  updateChoropleth
} from '../layers/districtLayer';
import {
  initializeStoreLayers,
  updateStoreSource
} from '../layers/storeLayer';
import {
  initializeDCLayers,
  updateDCSource
} from '../layers/dcLayer';
import {
  initializeSonarLayers,
  updateSonarCircles,
  setSonarVisibility
} from '../layers/sonarLayer';

export function useMapLayers(
  map: mapboxgl.Map | null,
  districtData: GeoJSONCollection | null,
  storeData: GeoJSONCollection | null,
  dcData: GeoJSONCollection | null,
  currentMetric: string,
  currentViewMode: string
) {
  const layersInitialized = useRef(false);

  // Initialize all layers when map is ready
  useEffect(() => {
    if (!map) {
      console.log('useMapLayers: Map not available yet');
      return;
    }

    const initLayers = () => {
      if (!map.isStyleLoaded()) {
        console.log('useMapLayers: Waiting for style to load...');
        map.once('style.load', initLayers);
        return;
      }

      console.log('useMapLayers: Style loaded, initializing layers...');

      if (!layersInitialized.current) {
        console.log('useMapLayers: Initializing store, DC, and sonar layers');
        try {
          initializeStoreLayers(map);
          initializeDCLayers(map);
          initializeSonarLayers(map);
          layersInitialized.current = true;
          console.log('useMapLayers: All layers initialized');
        } catch (err) {
          console.error('useMapLayers: Error initializing layers:', err);
        }
      }
      
      // Initialize district layers when data is available
      if (districtData) {
        console.log('useMapLayers: Initializing district layers with', districtData.features.length, 'features');
        try {
          initializeDistrictLayers(map, districtData);
          console.log('useMapLayers: District layers initialized');
        } catch (err) {
          console.error('useMapLayers: Error initializing district layers:', err);
        }
      } else {
        console.log('useMapLayers: No district data available yet');
      }
    };

    // Wait for map to be ready
    if (map.loaded()) {
      initLayers();
    } else {
      map.once('load', initLayers);
    }
  }, [map, districtData]);

  // Update district data when it changes
  useEffect(() => {
    if (!map || !map.isStyleLoaded() || !districtData) {
      if (!map) console.log('updateDistrict: Map not available');
      else if (!map.isStyleLoaded()) console.log('updateDistrict: Style not loaded');
      else if (!districtData) console.log('updateDistrict: No district data');
      return;
    }
    
    console.log('updateDistrict: Updating district source and choropleth');
    try {
      updateDistrictSource(map, districtData);
      updateChoropleth(map, districtData, currentMetric);
    } catch (err) {
      console.error('updateDistrict: Error updating:', err);
    }
  }, [map, districtData, currentMetric]);

  // Update store data when it changes
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) {
      if (!map) console.log('updateStore: Map not available');
      else if (!map.isStyleLoaded()) console.log('updateStore: Style not loaded');
      return;
    }
    
    console.log('updateStore: Updating store source, viewMode:', currentViewMode, 'features:', storeData?.features.length || 0);
    try {
      updateStoreSource(map, storeData, currentViewMode);
    } catch (err) {
      console.error('updateStore: Error updating:', err);
    }
  }, [map, storeData, currentViewMode]);

  // Update DC data when it changes
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) {
      if (!map) console.log('updateDC: Map not available');
      else if (!map.isStyleLoaded()) console.log('updateDC: Style not loaded');
      return;
    }
    
    console.log('updateDC: Updating DC source, features:', dcData?.features.length || 0);
    try {
      updateDCSource(map, dcData, currentViewMode);
    } catch (err) {
      console.error('updateDC: Error updating:', err);
    }
  }, [map, dcData, currentViewMode]);

  // Update sonar circles when view mode is 'sonar' or data changes
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) {
      return;
    }

    const isSonarMode = currentViewMode === 'sonar';
    
    if (isSonarMode && storeData && dcData) {
      console.log('updateSonar: Updating sonar circles');
      try {
        updateSonarCircles(map, storeData, dcData);
        setSonarVisibility(map, true);
      } catch (err) {
        console.error('updateSonar: Error updating:', err);
      }
    } else {
      setSonarVisibility(map, false);
    }
  }, [map, storeData, dcData, currentViewMode]);
}
