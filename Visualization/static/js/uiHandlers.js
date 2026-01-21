// ============================================
// UI EVENT HANDLERS MODULE
// ============================================

/**
 * Update summary statistics display
 */
function updateSummaryStats(storeCount, dcCount) {
    document.getElementById('store-count').textContent = storeCount || 0;
    document.getElementById('dc-count').textContent = dcCount || 0;
}

/**
 * Update brand legend based on current store data
 */
function updateBrandLegend() {
    console.log('updateBrandLegend() called');
    const brandLegend = document.getElementById('brand-legend');
    const brandLegendItems = document.getElementById('brand-legend-items');
    
    if (!window.storeData || !window.storeData.features || window.storeData.features.length === 0) {
        console.log('No store data available for brand legend');
        brandLegend.classList.remove('visible');
        return;
    }
    
    // Get unique brands from current store data
    const brandsMap = new Map();
    window.storeData.features.forEach(feature => {
        const brand = feature.properties.brand;
        const color = feature.properties.brandColor;
        if (brand && color && !brandsMap.has(brand)) {
            brandsMap.set(brand, color);
        }
    });
    
    console.log('Brands found:', Array.from(brandsMap.keys()));
    
    // Sort brands alphabetically
    const brands = Array.from(brandsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    // Generate legend HTML
    if (brands.length > 0) {
        brandLegendItems.innerHTML = brands.map(([brand, color]) => `
            <div class="brand-legend-item">
                <div class="brand-legend-color" style="background-color: ${color};"></div>
                <div class="brand-legend-name">${brand}</div>
            </div>
        `).join('');
        brandLegend.classList.add('visible');
        console.log('Brand legend updated with', brands.length, 'brands');
    } else {
        brandLegend.classList.remove('visible');
        console.log('No brands found, hiding legend');
    }
}

/**
 * Show/hide DC stat card based on category
 */
function updateDCVisibility(category) {
    const hasDC = DC_CATEGORIES.includes(category);
    const dcCard = document.getElementById('dc-stat-card');
    if (dcCard) {
        dcCard.style.display = hasDC ? 'block' : 'none';
    }
}

/**
 * Handle category selection change
 */
async function handleCategoryChange(e) {
    const category = e.target.value;
    if (!category) return;

    window.currentCategory = category;
    console.log('Category changed to:', category);

    // Update DC card visibility based on category
    updateDCVisibility(category);

    // Load store data
    const stores = await loadStoreGeoJSON(category);
    
    // Load DC data if applicable
    const hasDC = DC_CATEGORIES.includes(category);
    const dcs = hasDC ? await loadDistributionCenters(category) : null;

    // Update map sources
    updateStoreSource(stores);
    updateDCSource(dcs);

    // Update stats
    updateSummaryStats(
        stores.features.length,
        dcs ? dcs.features.length : 0
    );
    
    // Update brand legend
    updateBrandLegend();
    
    // Refresh overview panel if it's active
    if (document.getElementById('overview').classList.contains('active')) {
        populateOverviewPanel();
    }

    // Fit bounds to data
    if (stores.features.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        stores.features.forEach(f => {
            bounds.extend(f.geometry.coordinates);
        });
        window.map.fitBounds(bounds, { padding: 50 });
    }
}

/**
 * Handle metric selection change
 */
function handleMetricChange(e) {
    const metric = e.target.value;
    updateChoropleth(metric);
}

/**
 * Handle view mode button click
 */
function handleModeChange(e) {
    const mode = e.target.dataset.mode;
    window.currentViewMode = mode;

    // Update active button
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');

    // Update layer visibility based on mode
    if (mode === 'cluster') {
        if (window.storeData) {
            if (window.map.getSource('stores')) {
                window.map.getSource('stores').setData(window.storeData);
            }
        }
        setLayerVisibility('store-clusters', true);
        setLayerVisibility('store-cluster-count', true);
        setLayerVisibility('store-points', true);
        setLayerVisibility('store-markers-individual', false);
        if (window.dcData) setLayerVisibility('dc-markers', true);
    } else if (mode === 'individual') {
        if (window.storeData) {
            if (window.map.getSource('stores-individual')) {
                window.map.getSource('stores-individual').setData(window.storeData);
            }
        }
        setLayerVisibility('store-clusters', false);
        setLayerVisibility('store-cluster-count', false);
        setLayerVisibility('store-points', false);
        setLayerVisibility('store-markers-individual', true);
        if (window.dcData) setLayerVisibility('dc-markers', true);
    } else { // none
        setLayerVisibility('store-clusters', false);
        setLayerVisibility('store-cluster-count', false);
        setLayerVisibility('store-points', false);
        setLayerVisibility('store-markers-individual', false);
        setLayerVisibility('dc-markers', false);
    }

    enforceLayerHierarchy();
}

/**
 * Handle collapse button click
 */
function handleCollapseClick() {
    const sidebar = document.getElementById('sidebar');
    const btn = document.getElementById('collapse-btn');
    
    sidebar.classList.toggle('collapsed');
    btn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
}

/**
 * Handle tab switching
 */
function handleTabClick(e) {
    const tab = e.target;
    const tabName = tab.dataset.tab;
    
    // Update active tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Update active panel
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    
    // Populate panel content
    if (tabName === 'overview') {
        populateOverviewPanel();
    } else if (tabName === 'stores') {
        populateStoresPanel();
    } else if (tabName === 'analytics') {
        populateAnalyticsPanel();
    }
}

/**
 * Handle sidebar resize
 */
function initializeSidebarResize() {
    const sidebar = document.getElementById('sidebar');
    const resizeHandle = document.getElementById('resize-handle');
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
        sidebar.classList.add('resizing');
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        // Calculate new width (resize from left edge, so subtract the difference)
        const deltaX = startX - e.clientX;
        const newWidth = startWidth + deltaX;

        // Apply constraints
        const minWidth = 300;
        const maxWidth = 800;
        const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

        sidebar.style.width = `${constrainedWidth}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            sidebar.classList.remove('resizing');
            document.body.style.cursor = '';
        }
    });
}

/**
 * Initialize all UI event handlers
 */
function initializeUIHandlers() {
    // Category selector
    document.getElementById('category-selector').addEventListener('change', handleCategoryChange);

    // Metric selector
    document.getElementById('metric-selector').addEventListener('change', handleMetricChange);

    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', handleModeChange);
    });

    // Collapse button
    document.getElementById('collapse-btn').addEventListener('click', handleCollapseClick);

    // Tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', handleTabClick);
    });

    // Initialize sidebar resize
    initializeSidebarResize();

    console.log('UI handlers initialized');
}
