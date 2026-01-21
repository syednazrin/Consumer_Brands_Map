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

    // Add cluster count layer
    window.map.addLayer({
        id: 'store-cluster-count',
        type: 'symbol',
        source: 'stores',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
            'text-size': 16,
            'text-anchor': 'center',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'symbol-sort-key': 999
        },
        paint: {
            'text-color': '#ffffff',
            'text-halo-color': 'rgba(0, 0, 0, 0.5)',
            'text-halo-width': 1
        }
    });

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
