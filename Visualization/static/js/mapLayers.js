// ============================================
// MAP LAYERS MODULE
// ============================================

/**
 * Enforce layer hierarchy to keep markers above choropleth
 */
function enforceLayerHierarchy() {
    console.log('Enforcing layer hierarchy...');
    
    const existingLayers = LAYER_ORDER.filter(id => window.map.getLayer(id));
    console.log('Existing layers to order:', existingLayers);

    const allLayers = window.map.getStyle().layers;

    // Force correct order by moving each layer
    for (let i = existingLayers.length - 1; i >= 0; i--) {
        const currentLayer = existingLayers[i];
        
        if (i === 0) {
            // This is the bottom layer (district-fills)
            const firstMapLayer = allLayers.find(l => 
                l.id !== currentLayer && 
                l.type !== 'background' && 
                !l.id.startsWith('mapbox-')
            );
            
            if (firstMapLayer) {
                try {
                    window.map.moveLayer(currentLayer, firstMapLayer.id);
                    console.log(`Moved ${currentLayer} to bottom (before ${firstMapLayer.id})`);
                } catch (err) {
                    console.warn('Could not move to bottom:', err);
                }
            }
        } else {
            // Place this layer after the previous layer in our order
            const previousLayer = existingLayers[i - 1];
            if (window.map.getLayer(previousLayer)) {
                try {
                    window.map.moveLayer(currentLayer, previousLayer);
                    console.log(`Moved ${currentLayer} after ${previousLayer}`);
                } catch (err) {
                    console.warn(`Could not move ${currentLayer}:`, err);
                }
            }
        }
    }

    // Ensure sonar circles are above districts but below markers
    if (window.map.getLayer('dc-sonar-circles')) {
        try {
            // Place sonar circles after district layers but before store layers
            if (window.map.getLayer('district-borders')) {
                window.map.moveLayer('dc-sonar-circles', 'district-borders');
            } else if (window.map.getLayer('district-fills')) {
                window.map.moveLayer('dc-sonar-circles', 'district-fills');
            }
        } catch (err) {
            console.warn('Could not position sonar circles:', err);
        }
    }

    // DOUBLE CHECK: Ensure store layers are absolutely on top
    const storeLayers = ['store-markers-individual', 'store-points', 'store-cluster-count', 'store-clusters', 'dc-markers'];
    storeLayers.forEach(layerId => {
        if (window.map.getLayer(layerId)) {
            try {
                const topLayers = window.map.getStyle().layers;
                const topLayerId = topLayers[topLayers.length - 1].id;
                if (topLayerId !== layerId) {
                    window.map.moveLayer(layerId);
                    console.log(`Moved ${layerId} to absolute top`);
                }
            } catch (err) {
                console.warn(`Could not move ${layerId} to top:`, err);
            }
        }
    });

    console.log('Layer hierarchy enforced');
}

/**
 * Initialize district layers (choropleth and borders)
 */
function initializeDistrictLayers() {
    if (!window.districtData) {
        console.warn('District data not loaded yet');
        return;
    }

    console.log('Initializing district layers with', window.districtData.features.length, 'features');

    // Add source if not exists
    if (!window.map.getSource('districts')) {
        window.map.addSource('districts', {
            type: 'geojson',
            data: window.districtData
        });
        console.log('Added districts source');
    } else {
        window.map.getSource('districts').setData(window.districtData);
    }

    // Add fill layer (choropleth)
    if (!window.map.getLayer('district-fills')) {
        window.map.addLayer({
            id: 'district-fills',
            type: 'fill',
            source: 'districts',
            paint: {
                'fill-color': '#ccc',
                'fill-opacity': 0.7
            }
        });
        console.log('Added district-fills layer');
    }

    // Add border layer
    if (!window.map.getLayer('district-borders')) {
        window.map.addLayer({
            id: 'district-borders',
            type: 'line',
            source: 'districts',
            paint: {
                'line-color': '#333',
                'line-width': 1.5,
                'line-opacity': 0.8
            }
        });
        console.log('Added district-borders layer');
    }

    enforceLayerHierarchy();
    updateChoropleth(window.currentMetric);
}

/**
 * Initialize store layers (clusters and individual markers)
 */
function initializeStoreLayers() {
    // Add clustered source
    if (!window.map.getSource('stores')) {
        window.map.addSource('stores', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
        });
    }

    // Add cluster circle layer
    if (!window.map.getLayer('store-clusters')) {
        window.map.addLayer({
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
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff'
            }
        });
        console.log('Added store-clusters layer');
    }

    // Add cluster count layer (always centered, always visible, no collision)
    window.map.addLayer({
        id: 'store-cluster-count',
        type: 'symbol',
        source: 'stores',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': ['get', 'point_count_abbreviated'], // show count inside circle
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 16,
            'text-anchor': 'center',
            'text-offset': [0, 0],
            'text-justify': 'center',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-optional': false,
            'symbol-sort-key': 999 // render above clusters
        },
        paint: {
            'text-color': '#ffffff',
            'text-halo-color': 'rgba(0, 0, 0, 0.8)',
            'text-halo-width': 2,
            'text-halo-blur': 1
        }
    });

    // Ensure cluster counts render above cluster circles
    try {
        if (window.map.getLayer('store-clusters') && window.map.getLayer('store-cluster-count')) {
            window.map.moveLayer('store-cluster-count');
        }
    } catch (err) {
        console.warn('Could not move store-cluster-count above store-clusters:', err);
    }

    // Add unclustered point layer with brand colors
    if (!window.map.getLayer('store-points')) {
        window.map.addLayer({
            id: 'store-points',
            type: 'circle',
            source: 'stores',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': ['get', 'brandColor'], // Use brand color from properties
                'circle-radius': 6,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff'
            }
        });
    }

    // Add individual marker source and layer
    if (!window.map.getSource('stores-individual')) {
        window.map.addSource('stores-individual', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });
    }

    if (!window.map.getLayer('store-markers-individual')) {
        window.map.addLayer({
            id: 'store-markers-individual',
            type: 'circle',
            source: 'stores-individual',
            paint: {
                'circle-color': ['get', 'brandColor'], // Use brand color from properties
                'circle-radius': 6,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff'
            },
            layout: {
                'visibility': 'none'
            }
        });
    }
}

/**
 * Initialize DC layers
 */
function initializeDCLayers() {
    if (!window.map.getSource('dc-centers')) {
        window.map.addSource('dc-centers', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });
    }

    if (!window.map.getLayer('dc-markers')) {
        window.map.addLayer({
            id: 'dc-markers',
            type: 'circle',
            source: 'dc-centers',
            paint: {
                'circle-color': '#2196F3', // Official DC blue color
                'circle-radius': 18,
                'circle-stroke-width': 3,
                'circle-stroke-color': '#fff'
            }
        });
    }
}

/**
 * Update choropleth colors based on selected metric
 */
function updateChoropleth(metric) {
    if (!window.districtData || !window.map.getSource('districts')) {
        console.warn('Cannot update choropleth - data or source missing');
        return;
    }

    if (!window.map.getLayer('district-fills')) {
        console.warn('Cannot update choropleth - layer missing');
        return;
    }

    window.currentMetric = metric;
    console.log('Updating choropleth for metric:', metric);

    // Get all values for this metric
    const values = window.districtData.features
        .map(f => f.properties[metric])
        .filter(v => v != null && !isNaN(v) && v !== 0);

    console.log(`Found ${values.length} valid values for ${metric}`);

    if (values.length === 0) {
        console.warn('No valid values for metric:', metric);
        return;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    console.log(`Range: ${min} to ${max}`);

    // Create smooth gradient color expression
    const colorExpression = [
        'case',
        ['==', ['get', metric], null], '#e0e0e0',
        ['==', ['get', metric], 0], '#f5f5f5',
        [
            'interpolate',
            ['linear'],
            ['get', metric],
            min, '#4ade80',
            min + (max - min) * 0.25, '#a3e635',
            min + (max - min) * 0.50, '#facc15',
            min + (max - min) * 0.75, '#fb923c',
            max, '#ef4444'
        ]
    ];

    try {
        window.map.setPaintProperty('district-fills', 'fill-color', colorExpression);
        window.map.setPaintProperty('district-fills', 'fill-opacity', 0.7);
        console.log('Choropleth updated successfully');
        enforceLayerHierarchy();
    } catch (err) {
        console.error('Error updating choropleth:', err);
    }

    // Update legend
    updateLegend(metric, min, max);
}

/**
 * Update legend display
 */
function updateLegend(metric, min, max) {
    document.getElementById('legend-title').textContent = metric;
    document.getElementById('legend-min').textContent = min.toFixed(1);
    document.getElementById('legend-max').textContent = max.toFixed(1);
}

/**
 * Set layer visibility
 */
function setLayerVisibility(layerId, visible) {
    if (window.map.getLayer(layerId)) {
        window.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    }
}

/**
 * Update store data source based on view mode
 */
function updateStoreSource(geojson) {
    window.storeData = geojson;
    console.log('Updating store source with', geojson.features.length, 'features');
    
    if (window.currentViewMode === 'cluster') {
        if (window.map.getSource('stores')) {
            window.map.getSource('stores').setData(geojson);
        }
        setLayerVisibility('store-markers-individual', false);
        setLayerVisibility('store-clusters', true);
        setLayerVisibility('store-cluster-count', true);
        setLayerVisibility('store-points', true);
    } else if (window.currentViewMode === 'individual') {
        if (window.map.getSource('stores-individual')) {
            window.map.getSource('stores-individual').setData(geojson);
        }
        setLayerVisibility('store-clusters', false);
        setLayerVisibility('store-cluster-count', false);
        setLayerVisibility('store-points', false);
        setLayerVisibility('store-markers-individual', true);
    } else {
        setLayerVisibility('store-clusters', false);
        setLayerVisibility('store-cluster-count', false);
        setLayerVisibility('store-points', false);
        setLayerVisibility('store-markers-individual', false);
    }

    console.log('Enforcing hierarchy after store update');
    enforceLayerHierarchy();
}

/**
 * Update DC data source
 */
function updateDCSource(geojson) {
    window.dcData = geojson;
    
    if (window.map.getSource('dc-centers')) {
        if (geojson && window.currentViewMode !== 'none') {
            console.log('Updating DC source with', geojson.features.length, 'DCs');
            window.map.getSource('dc-centers').setData(geojson);
            setLayerVisibility('dc-markers', true);
        } else {
            window.map.getSource('dc-centers').setData({ type: 'FeatureCollection', features: [] });
            setLayerVisibility('dc-markers', false);
        }
    }

    console.log('Enforcing hierarchy after DC update');
    enforceLayerHierarchy();
}

/**
 * Initialize sonar circle layers for DC reach visualization
 */
function initializeSonarLayers() {
    // Create source for sonar circles
    if (!window.map.getSource('dc-sonar-circles')) {
        window.map.addSource('dc-sonar-circles', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });
    }

    // Create sonar circle layer (animated pulsing circles)
    if (!window.map.getLayer('dc-sonar-circles')) {
        window.map.addLayer({
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

    // Initialize animation state
    if (!window.sonarAnimationState) {
        window.sonarAnimationState = {
            active: false,
            animationFrame: null,
            startTime: null,
            pulsePhase: 0
        };
    }
}

/**
 * Update sonar circles based on DC reach data
 */
function updateSonarCircles() {
    if (!window.dcData || !window.storeData || !window.map.getSource('dc-sonar-circles')) {
        return;
    }

    // Calculate DC reach for each DC
    const dcReachData = calculateDCReach(window.storeData.features, window.dcData.features);
    
    // Create circle features for each DC with its reach radius
    const sonarFeatures = window.dcData.features.map((dc, idx) => {
        const dcReach = dcReachData.dcReaches.find(r => r.dcIndex === idx);
        const maxDistance = dcReach ? dcReach.maxDistance : 0;
        
        return {
            type: 'Feature',
            geometry: dc.geometry,
            properties: {
                dcIndex: idx,
                maxDistance: maxDistance,
                currentRadiusKm: maxDistance * 0.5, // Start at 50% for animation
                currentOpacity: 0.4
            }
        };
    }).filter(f => f.properties.maxDistance > 0); // Only show circles for DCs with assigned stores

    // Update source data
    window.map.getSource('dc-sonar-circles').setData({
        type: 'FeatureCollection',
        features: sonarFeatures
    });

    console.log(`Updated ${sonarFeatures.length} sonar circles`);
}

/**
 * Start sonar animation
 */
function startSonarAnimation() {
    if (!window.map || !window.map.getLayer('dc-sonar-circles')) {
        return;
    }

    // Stop any existing animation
    stopSonarAnimation();

    window.sonarAnimationState.active = true;
    window.sonarAnimationState.startTime = Date.now();

    function animate() {
        if (!window.sonarAnimationState.active) {
            return;
        }

        const now = Date.now();
        const elapsed = (now - window.sonarAnimationState.startTime) / 1000; // seconds
        const pulseDuration = 3; // 3 seconds per pulse cycle
        const phase = (elapsed % pulseDuration) / pulseDuration; // 0 to 1

        // Get current sonar source
        const source = window.map.getSource('dc-sonar-circles');
        if (!source || !source._data || !source._data.features) {
            window.sonarAnimationState.animationFrame = requestAnimationFrame(animate);
            return;
        }

        const zoom = window.map.getZoom();
        const centerLat = window.map.getCenter().lat;
        
        // Convert km to approximate pixels at current zoom
        // Formula: meters per pixel = (40075017 * cos(lat)) / (256 * 2^zoom)
        const metersPerPixel = (40075017 * Math.cos(centerLat * Math.PI / 180)) / (256 * Math.pow(2, zoom));

        // Update each circle's radius and opacity based on pulse phase
        const updatedFeatures = source._data.features.map(feature => {
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
        source.setData({
            type: 'FeatureCollection',
            features: updatedFeatures
        });

        // Update paint properties for radius and opacity
        try {
            // Use data-driven radius
            const radiusExpression = ['get', 'radiusPixels'];
            const opacity = 0.4 - (phase * 0.3);
            
            window.map.setPaintProperty('dc-sonar-circles', 'circle-radius', radiusExpression);
            window.map.setPaintProperty('dc-sonar-circles', 'circle-opacity', opacity);
            window.map.setPaintProperty('dc-sonar-circles', 'circle-stroke-opacity', Math.min(opacity * 1.5, 0.8));
        } catch (err) {
            console.warn('Error updating sonar animation:', err);
        }

        window.sonarAnimationState.animationFrame = requestAnimationFrame(animate);
    }

    animate();
}

/**
 * Stop sonar animation
 */
function stopSonarAnimation() {
    if (window.sonarAnimationState) {
        window.sonarAnimationState.active = false;
        if (window.sonarAnimationState.animationFrame) {
            cancelAnimationFrame(window.sonarAnimationState.animationFrame);
            window.sonarAnimationState.animationFrame = null;
        }
    }
}

/**
 * Show/hide sonar circles
 */
function setSonarVisibility(visible) {
    if (window.map.getLayer('dc-sonar-circles')) {
        setLayerVisibility('dc-sonar-circles', visible);
        if (visible) {
            updateSonarCircles();
            startSonarAnimation();
        } else {
            stopSonarAnimation();
        }
    }
}
