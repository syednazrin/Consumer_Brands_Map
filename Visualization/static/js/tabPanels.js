// ============================================
// TAB PANELS MODULE
// ============================================

/**
 * Populate the Overview panel with statistics
 */
function populateOverviewPanel() {
    const panel = document.getElementById('overview');
    
    if (!window.storeData || !window.storeData.features || window.storeData.features.length === 0) {
        panel.innerHTML = '<div class="loading">Please select a category first</div>';
        return;
    }

    // Calculate statistics
    const totalStores = window.storeData.features.length;
    const states = new Set();
    const districts = new Set();
    
    window.storeData.features.forEach(f => {
        if (f.properties.State) states.add(f.properties.State);
        if (f.properties.District) districts.add(f.properties.District);
    });

    const statesCount = states.size;
    const districtsCount = districts.size;
    const dcCount = window.dcData ? window.dcData.features.length : 0;
    const hasDC = DC_CATEGORIES.includes(window.currentCategory);
    
    // Calculate average stores per district
    const avgPerDistrict = districtsCount > 0 ? (totalStores / districtsCount).toFixed(1) : 0;
    
    // Calculate geographic coverage (out of 160 total districts)
    const coveragePercent = ((districtsCount / 160) * 100).toFixed(1);

    panel.innerHTML = `
        <div style="padding: 20px;">
            <h3 style="color: #ff0000; margin-bottom: 20px;">${window.currentCategory || 'Overview'}</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2em; font-weight: 700; color: #ff0000;">${totalStores}</div>
                    <div style="font-size: 0.9em; color: #666; margin-top: 4px;">Total Stores</div>
                </div>
                <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2em; font-weight: 700; color: #ff0000;">${statesCount}</div>
                    <div style="font-size: 0.9em; color: #666; margin-top: 4px;">States Covered</div>
                </div>
                <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2em; font-weight: 700; color: #ff0000;">${districtsCount}</div>
                    <div style="font-size: 0.9em; color: #666; margin-top: 4px;">Districts Covered</div>
                </div>
                ${hasDC ? `
                <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2em; font-weight: 700; color: #ff0000;">${dcCount}</div>
                    <div style="font-size: 0.9em; color: #666; margin-top: 4px;">Distribution Centers</div>
                </div>
                ` : ''}
            </div>
            
            <div style="background: #fff; padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h4 style="margin-bottom: 12px; color: #333;">Key Metrics</h4>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                    <span style="color: #666;">Avg stores per district:</span>
                    <span style="font-weight: 600;">${avgPerDistrict}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span style="color: #666;">Geographic coverage:</span>
                    <span style="font-weight: 600;">${coveragePercent}%</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Populate the Stores panel with searchable store list
 */
function populateStoresPanel() {
    const panel = document.getElementById('stores');
    
    if (!window.storeData || !window.storeData.features || window.storeData.features.length === 0) {
        panel.innerHTML = '<div class="loading">Please select a category first</div>';
        return;
    }

    const stores = window.storeData.features;
    const storeListHTML = stores.map(store => {
        const props = store.properties;
        return `
            <div style="padding: 12px; border-bottom: 1px solid #e0e0e0; cursor: pointer;" 
                 onmouseover="this.style.background='#f8f8f8'" 
                 onmouseout="this.style.background='white'"
                 onclick="window.map.flyTo({center: [${store.geometry.coordinates[0]}, ${store.geometry.coordinates[1]}], zoom: 14})">
                <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${props.Name || 'Unnamed Store'}</div>
                <div style="font-size: 0.85em; color: #666;">${props.Address || ''}</div>
                <div style="font-size: 0.85em; color: #999; margin-top: 4px;">
                    ${props.District || 'N/A'}, ${props.State || 'N/A'}
                </div>
            </div>
        `;
    }).join('');

    panel.innerHTML = `
        <div style="padding: 16px; border-bottom: 1px solid #e0e0e0; background: #f8f8f8;">
            <input type="text" id="store-search" placeholder="Search stores..." 
                   style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9em;"
                   oninput="filterStores(this.value)">
        </div>
        <div id="store-list" style="overflow-y: auto; max-height: calc(100vh - 450px);">
            ${storeListHTML}
        </div>
    `;
}

/**
 * Filter stores based on search text
 */
function filterStores(searchText) {
    const storeList = document.getElementById('store-list');
    const stores = window.storeData.features;
    const filtered = stores.filter(store => {
        const props = store.properties;
        const searchLower = searchText.toLowerCase();
        return (props.Name || '').toLowerCase().includes(searchLower) ||
               (props.Address || '').toLowerCase().includes(searchLower) ||
               (props.District || '').toLowerCase().includes(searchLower) ||
               (props.State || '').toLowerCase().includes(searchLower);
    });

    const storeListHTML = filtered.map(store => {
        const props = store.properties;
        return `
            <div style="padding: 12px; border-bottom: 1px solid #e0e0e0; cursor: pointer;" 
                 onmouseover="this.style.background='#f8f8f8'" 
                 onmouseout="this.style.background='white'"
                 onclick="window.map.flyTo({center: [${store.geometry.coordinates[0]}, ${store.geometry.coordinates[1]}], zoom: 14})">
                <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${props.Name || 'Unnamed Store'}</div>
                <div style="font-size: 0.85em; color: #666;">${props.Address || ''}</div>
                <div style="font-size: 0.85em; color: #999; margin-top: 4px;">
                    ${props.District || 'N/A'}, ${props.State || 'N/A'}
                </div>
            </div>
        `;
    }).join('');

    storeList.innerHTML = storeListHTML || '<div style="padding: 20px; text-align: center; color: #999;">No stores found</div>';
}

/**
 * Populate the Analytics panel with charts
 */
function populateAnalyticsPanel() {
    const panel = document.getElementById('analytics');
    
    if (!window.storeData || !window.storeData.features || window.storeData.features.length === 0) {
        panel.innerHTML = '<div class="loading">Please select a category first</div>';
        return;
    }

    // Prepare data for charts
    const districtCounts = {};
    const stateCounts = {};
    
    window.storeData.features.forEach(f => {
        const district = f.properties.District || 'Unknown';
        const state = f.properties.State || 'Unknown';
        
        districtCounts[district] = (districtCounts[district] || 0) + 1;
        stateCounts[state] = (stateCounts[state] || 0) + 1;
    });

    // Get top 10 districts
    const topDistricts = Object.entries(districtCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    panel.innerHTML = `
        <div style="padding: 20px;">
            <h3 style="color: #ff0000; margin-bottom: 20px;">Analytics Dashboard</h3>
            
            <div style="background: white; padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin-bottom: 12px; color: #333;">Top 10 Districts by Store Count</h4>
                <canvas id="district-chart" style="max-height: 300px;"></canvas>
            </div>
            
            <div style="background: white; padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h4 style="margin-bottom: 12px; color: #333;">Distribution by State</h4>
                <canvas id="state-chart" style="max-height: 300px;"></canvas>
            </div>
        </div>
    `;

    // Wait for DOM to render, then create charts
    setTimeout(() => {
        // District bar chart
        const districtCtx = document.getElementById('district-chart');
        if (districtCtx && window.Chart) {
            new Chart(districtCtx, {
                type: 'bar',
                data: {
                    labels: topDistricts.map(d => d[0]),
                    datasets: [{
                        label: 'Number of Stores',
                        data: topDistricts.map(d => d[1]),
                        backgroundColor: '#ff0000',
                        borderColor: '#cc0000',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            });
        }

        // State pie chart
        const stateCtx = document.getElementById('state-chart');
        if (stateCtx && window.Chart) {
            const stateEntries = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);
            
            new Chart(stateCtx, {
                type: 'doughnut',
                data: {
                    labels: stateEntries.map(s => s[0]),
                    datasets: [{
                        data: stateEntries.map(s => s[1]),
                        backgroundColor: [
                            '#ff0000', '#cc0000', '#ff3333', '#ff6666', 
                            '#ff9999', '#ffcccc', '#990000', '#660000',
                            '#ff4444', '#ff5555', '#ff7777', '#ff8888'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                boxWidth: 12,
                                font: {
                                    size: 11
                                }
                            }
                        }
                    }
                }
            });
        }
    }, 100);
}
