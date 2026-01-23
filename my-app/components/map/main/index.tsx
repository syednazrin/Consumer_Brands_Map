'use client';

import { useRef } from 'react';
import { useMapbox } from '../hooks/useMapbox';
import { useMapLayers } from '../hooks/useMapLayers';
import { useMapInteractions } from '../hooks/useMapInteractions';
import { useSonarAnimation } from '../hooks/useSonarAnimation';
import { GeoJSONCollection } from '../utils/dataLoader';

interface MapProps {
  districtData: GeoJSONCollection | null;
  storeData: GeoJSONCollection | null;
  dcData: GeoJSONCollection | null;
  currentMetric: string;
  currentViewMode: string;
}

export default function Map({ districtData, storeData, dcData, currentMetric, currentViewMode }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const map = useMapbox('map');
  
  // Use the map layers hook to manage all layers
  useMapLayers(map, districtData, storeData, dcData, currentMetric, currentViewMode);
  
  // Add sonar animation when in sonar mode
  const isSonarMode = currentViewMode === 'sonar';
  useSonarAnimation(map, isSonarMode, storeData, dcData);
  
  // Add map interactions (clicks, popups)
  useMapInteractions(map, currentViewMode);

  return (
    <div 
      id="map" 
      ref={mapContainerRef}
      className="absolute top-0 left-0 w-screen h-screen m-0 p-0"
    />
  );
}
