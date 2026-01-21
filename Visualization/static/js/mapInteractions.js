// ============================================
// MAP INTERACTIONS MODULE
// ============================================

/**
 * Handle district click (show popup in 'none' mode)
 */
function handleDistrictClick(e) {
    if (window.currentViewMode !== 'none') return;
    
    const district = e.features[0];
    const props = district.properties;

    const popupHTML = `
        <div class="popup-title">${props.District || props.name}, ${props.State || props.state}</div>
        <div class="popup-row"><strong>Population:</strong> ${props['Population (k)'] || 'N/A'} k</div>
        <div class="popup-row"><strong>Income per capita:</strong> RM ${props['Income per capita'] || 'N/A'}</div>
        <div class="popup-row"><strong>Total Income:</strong> RM ${props['Income'] || 'N/A'} B</div>
    `;

    new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(popupHTML)
        .addTo(window.map);
}

/**
 * Handle store point click (show popup)
 */
function handleStorePointClick(e) {
    const feature = e.features[0];
    const props = feature.properties;

    const popupHTML = `
        <div class="popup-title">${props.Name || 'Store'}</div>
        <div class="popup-row">${props.Address || ''}</div>
        <div class="popup-row"><strong>District:</strong> ${props.District || 'N/A'}</div>
        <div class="popup-row"><strong>State:</strong> ${props.State || 'N/A'}</div>
    `;

    new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(popupHTML)
        .addTo(window.map);
}

/**
 * Handle individual marker click (show popup)
 */
function handleIndividualMarkerClick(e) {
    const feature = e.features[0];
    const props = feature.properties;

    const popupHTML = `
        <div class="popup-title">${props.Name || 'Store'}</div>
        <div class="popup-row">${props.Address || ''}</div>
        <div class="popup-row"><strong>District:</strong> ${props.District || 'N/A'}</div>
        <div class="popup-row"><strong>State:</strong> ${props.State || 'N/A'}</div>
    `;

    new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(popupHTML)
        .addTo(window.map);
}

/**
 * Handle DC marker click (show popup)
 */
function handleDCMarkerClick(e) {
    const feature = e.features[0];
    const props = feature.properties;

    const popupHTML = `
        <div class="popup-title">Distribution Center: ${props.name || props.code}</div>
        <div class="popup-row">${props.address || ''}</div>
        <div class="popup-row"><strong>Code:</strong> ${props.code || 'N/A'}</div>
        <div class="popup-row"><strong>State:</strong> ${props.state || 'N/A'}</div>
    `;

    new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(popupHTML)
        .addTo(window.map);
}

/**
 * Handle cluster click (zoom in to expand)
 */
function handleClusterClick(e) {
    const features = window.map.queryRenderedFeatures(e.point, {
        layers: ['store-clusters']
    });
    const clusterId = features[0].properties.cluster_id;
    window.map.getSource('stores').getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        window.map.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom
        });
    });
}

/**
 * Initialize all map interaction handlers
 */
function initializeMapInteractions() {
    // District click (only in 'none' mode)
    window.map.on('click', 'district-fills', handleDistrictClick);

    // District hover cursor
    window.map.on('mouseenter', 'district-fills', () => {
        if (window.currentViewMode === 'none') {
            window.map.getCanvas().style.cursor = 'pointer';
        }
    });
    window.map.on('mouseleave', 'district-fills', () => {
        window.map.getCanvas().style.cursor = '';
    });

    // Store marker clicks
    window.map.on('click', 'store-points', handleStorePointClick);
    window.map.on('click', 'store-markers-individual', handleIndividualMarkerClick);

    // DC marker click
    window.map.on('click', 'dc-markers', handleDCMarkerClick);

    // Cluster click
    window.map.on('click', 'store-clusters', handleClusterClick);

    // Cursor changes on hover
    window.map.on('mouseenter', 'store-clusters', () => {
        window.map.getCanvas().style.cursor = 'pointer';
    });
    window.map.on('mouseleave', 'store-clusters', () => {
        window.map.getCanvas().style.cursor = '';
    });

    window.map.on('mouseenter', 'store-points', () => {
        window.map.getCanvas().style.cursor = 'pointer';
    });
    window.map.on('mouseleave', 'store-points', () => {
        window.map.getCanvas().style.cursor = '';
    });

    window.map.on('mouseenter', 'store-markers-individual', () => {
        window.map.getCanvas().style.cursor = 'pointer';
    });
    window.map.on('mouseleave', 'store-markers-individual', () => {
        window.map.getCanvas().style.cursor = '';
    });

    window.map.on('mouseenter', 'dc-markers', () => {
        window.map.getCanvas().style.cursor = 'pointer';
    });
    window.map.on('mouseleave', 'dc-markers', () => {
        window.map.getCanvas().style.cursor = '';
    });

    console.log('Map interactions initialized');
}
