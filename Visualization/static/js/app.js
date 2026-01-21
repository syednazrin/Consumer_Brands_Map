// ============================================
// MAIN APPLICATION
// ============================================

// Initialize Mapbox
mapboxgl.accessToken = MAPBOX_TOKEN;

// Create map instance
const map = new mapboxgl.Map({
    container: 'map',
    style: MAP_CONFIG.style,
    center: MAP_CONFIG.center,
    zoom: MAP_CONFIG.zoom
});

// Make map globally accessible
window.map = map;

// Global state variables
window.currentCategory = null;
window.currentMetric = 'Population (k)';
window.currentViewMode = 'cluster';
window.districtData = null;
window.storeData = null;
window.dcData = null;
window.selectedBrand = 'All';
window.selectedState = 'All';
window.districtAssignmentsCache = null; // Cache for spatial district assignments

/**
 * Hide unnecessary base map layers (roads, water, parks, etc.)
 */
function hideBaseMapLayers() {
    const style = map.getStyle();
    if (style && style.layers) {
        style.layers.forEach(layer => {
            // Hide roads, bridges, tunnels, paths
            if (layer.id.includes('road') || 
                layer.id.includes('bridge') || 
                layer.id.includes('tunnel') ||
                layer.id.includes('ferry') ||
                layer.id.includes('path') ||
                layer.id.includes('track') ||
                layer.id.includes('service') ||
                layer.id.includes('street') ||
                layer.id.includes('highway') ||
                // Hide water bodies
                layer.id.includes('water') ||
                layer.id.includes('waterway') ||
                layer.id.includes('ocean') ||
                layer.id.includes('river') ||
                layer.id.includes('lake') ||
                // Hide parks and land use
                layer.id.includes('park') ||
                layer.id.includes('landuse') ||
                layer.id.includes('land-use') ||
                layer.id.includes('national-park') ||
                layer.id.includes('natural') ||
                layer.id.includes('hillshade') ||
                layer.id.includes('landcover')) {
                map.setLayoutProperty(layer.id, 'visibility', 'none');
            }
        });
    }
    console.log('Base map layers hidden');
}

/**
 * Load categories and populate selector
 */
async function loadCategories() {
    try {
        const categorySelector = document.getElementById('category-selector');
        categorySelector.innerHTML = '<option value="">-- Select a category --</option>';
        
        CATEGORIES.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelector.appendChild(option);
        });

        console.log('Categories loaded:', CATEGORIES);
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

/**
 * Initialize the application
 */
async function initializeApp() {
    console.log('Map loaded, initializing application...');

    // Load district data
    window.districtData = await loadDistrictData();
    
    // Initialize all layers in correct order
    initializeDistrictLayers();
    initializeStoreLayers();
    initializeDCLayers();
    initializeSonarLayers();

    // Enforce layer hierarchy
    console.log('Initial hierarchy enforcement');
    enforceLayerHierarchy();

    // Load categories
    await loadCategories();

    // Initialize UI handlers
    initializeUIHandlers();

    // Initialize map interactions
    initializeMapInteractions();

    // Final hierarchy enforcement
    console.log('Post-load hierarchy enforcement');
    enforceLayerHierarchy();

    console.log('✓ Application initialization complete');
}

// Hide base map layers and initialize app when style loads
map.on('style.load', () => {
    console.log('Map style loaded');
    hideBaseMapLayers();
    
    // Initialize app here since style is loaded and map is ready
    if (!window.appInitialized) {
        window.appInitialized = true;
        initializeApp();
    }
});
