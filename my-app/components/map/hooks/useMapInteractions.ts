import { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

export function useMapInteractions(map: mapboxgl.Map | null, currentViewMode: string) {
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    // Handle district click (show popup in 'none' mode)
    const handleDistrictClick = (e: mapboxgl.MapLayerMouseEvent) => {
      if (currentViewMode !== 'none') return;
      if (!e.features || e.features.length === 0) return;
      
      const district = e.features[0];
      const props = district.properties || {};

      const popupHTML = `
        <div class="popup-title">${props.District || props.name || 'District'}, ${props.State || props.state || ''}</div>
        <div class="popup-row"><strong>Population:</strong> ${props['Population (k)'] || 'N/A'} k</div>
        <div class="popup-row"><strong>Income per capita:</strong> RM ${props['Income per capita'] || 'N/A'}</div>
        <div class="popup-row"><strong>Total Income:</strong> RM ${props['Income'] || 'N/A'} B</div>
      `;

      new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(popupHTML)
        .addTo(map);
    };

    // Handle store point click
    const handleStorePointClick = (e: mapboxgl.MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const props = feature.properties || {};

      const popupHTML = `
        <div class="popup-title">${props.Name || 'Store'}</div>
        <div class="popup-row">${props.Address || ''}</div>
        <div class="popup-row"><strong>District:</strong> ${props.District || 'N/A'}</div>
        <div class="popup-row"><strong>State:</strong> ${props.State || 'N/A'}</div>
      `;

      new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(popupHTML)
        .addTo(map);
    };

    // Handle individual marker click
    const handleIndividualMarkerClick = (e: mapboxgl.MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const props = feature.properties || {};

      const popupHTML = `
        <div class="popup-title">${props.Name || 'Store'}</div>
        <div class="popup-row">${props.Address || ''}</div>
        <div class="popup-row"><strong>District:</strong> ${props.District || 'N/A'}</div>
        <div class="popup-row"><strong>State:</strong> ${props.State || 'N/A'}</div>
      `;

      new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(popupHTML)
        .addTo(map);
    };

    // Handle DC marker click
    const handleDCMarkerClick = (e: mapboxgl.MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const props = feature.properties || {};

      const popupHTML = `
        <div class="popup-title">Distribution Center: ${props.name || props.code || 'DC'}</div>
        <div class="popup-row">${props.address || ''}</div>
        <div class="popup-row"><strong>Code:</strong> ${props.code || 'N/A'}</div>
        <div class="popup-row"><strong>State:</strong> ${props.state || 'N/A'}</div>
      `;

      new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(popupHTML)
        .addTo(map);
    };

    // Handle cluster click (zoom in)
    const handleClusterClick = (e: mapboxgl.MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return;
      
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['store-clusters']
      });
      if (features.length === 0) return;
      
      const clusterId = features[0].properties?.cluster_id;
      if (clusterId === undefined) return;
      
      const source = map.getSource('stores') as mapboxgl.GeoJSONSource;
      if (!source) return;
      
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom === undefined || zoom === null) return;
        map.easeTo({
          center: (features[0].geometry as any).coordinates,
          zoom: zoom as number
        });
      });
    };

    // Add click event listeners
    map.on('click', 'district-fills', handleDistrictClick);
    map.on('click', 'store-points', handleStorePointClick);
    map.on('click', 'store-markers-individual', handleIndividualMarkerClick);
    map.on('click', 'dc-markers', handleDCMarkerClick);
    map.on('click', 'store-clusters', handleClusterClick);

    // Store handlers for cleanup
    const districtEnterHandler = () => {
      if (currentViewMode === 'none') {
        map.getCanvas().style.cursor = 'pointer';
      }
    };
    const districtLeaveHandler = () => {
      map.getCanvas().style.cursor = '';
    };
    const pointerEnterHandler = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const pointerLeaveHandler = () => {
      map.getCanvas().style.cursor = '';
    };

    // Add hover handlers
    map.on('mouseenter', 'district-fills', districtEnterHandler);
    map.on('mouseleave', 'district-fills', districtLeaveHandler);
    map.on('mouseenter', 'store-points', pointerEnterHandler);
    map.on('mouseleave', 'store-points', pointerLeaveHandler);
    map.on('mouseenter', 'store-markers-individual', pointerEnterHandler);
    map.on('mouseleave', 'store-markers-individual', pointerLeaveHandler);
    map.on('mouseenter', 'dc-markers', pointerEnterHandler);
    map.on('mouseleave', 'dc-markers', pointerLeaveHandler);
    map.on('mouseenter', 'store-clusters', pointerEnterHandler);
    map.on('mouseleave', 'store-clusters', pointerLeaveHandler);

    return () => {
      // Cleanup event listeners
      map.off('click', 'district-fills', handleDistrictClick);
      map.off('click', 'store-points', handleStorePointClick);
      map.off('click', 'store-markers-individual', handleIndividualMarkerClick);
      map.off('click', 'dc-markers', handleDCMarkerClick);
      map.off('click', 'store-clusters', handleClusterClick);
      map.off('mouseenter', 'district-fills', districtEnterHandler);
      map.off('mouseleave', 'district-fills', districtLeaveHandler);
      map.off('mouseenter', 'store-points', pointerEnterHandler);
      map.off('mouseleave', 'store-points', pointerLeaveHandler);
      map.off('mouseenter', 'store-markers-individual', pointerEnterHandler);
      map.off('mouseleave', 'store-markers-individual', pointerLeaveHandler);
      map.off('mouseenter', 'dc-markers', pointerEnterHandler);
      map.off('mouseleave', 'dc-markers', pointerLeaveHandler);
      map.off('mouseenter', 'store-clusters', pointerEnterHandler);
      map.off('mouseleave', 'store-clusters', pointerLeaveHandler);
    };
  }, [map, currentViewMode]);
}
