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

    const stores = window.storeData.features;
    const hasDC = DC_CATEGORIES.includes(window.currentCategory);
    
    // Calculate basic statistics
    const totalStores = stores.length;
    const states = new Set();
    const districts = new Set();
    
    stores.forEach(f => {
        if (f.properties.State) states.add(f.properties.State);
        if (f.properties.District) districts.add(f.properties.District);
    });

    const statesCount = states.size;
    const districtsCount = districts.size;
    
    // Brand composition
    const brandComposition = getBrandComposition(stores);
    const brandCount = Object.keys(brandComposition).length;
    const hasMultipleBrands = brandCount > 1;
    
    // State distribution
    const stateCounts = groupByGeography(stores, 'State');
    const topStates = Object.entries(stateCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    // DC analytics
    let dcAnalytics = null;
    if (hasDC && window.dcData && window.dcData.features.length > 0) {
        const dcCatchment = analyzeDCCatchment(stores, window.dcData.features);
        const avgStoresPerDC = dcCatchment.reduce((sum, dc) => sum + dc.storesServed, 0) / dcCatchment.length;
        const maxStores = Math.max(...dcCatchment.map(dc => dc.storesServed));
        const minStores = Math.min(...dcCatchment.map(dc => dc.storesServed));
        
        dcAnalytics = {
            count: window.dcData.features.length,
            avgStoresPerDC: avgStoresPerDC.toFixed(1),
            maxStores,
            minStores,
            catchment: dcCatchment
        };
    }
    
    // Calculate metrics
    const avgPerDistrict = districtsCount > 0 ? (totalStores / districtsCount).toFixed(1) : 0;
    const coveragePercent = ((districtsCount / 160) * 100).toFixed(1);
    
    // Market concentration
    const top3States = topStates.slice(0, 3).reduce((sum, [, count]) => sum + count, 0);
    const concentrationPercent = ((top3States / totalStores) * 100).toFixed(0);

    // Build HTML
    panel.innerHTML = `
        <div style="padding: 20px; overflow-y: auto; max-height: calc(100vh - 450px);">
            <h3 style="color: #ff0000; margin-bottom: 20px;">${window.currentCategory || 'Overview'}</h3>
            
            <!-- KPI Cards -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2em; font-weight: 700; color: #ff0000;">${totalStores}</div>
                    <div style="font-size: 0.85em; color: #666; margin-top: 4px;">Total Stores</div>
                </div>
                ${hasMultipleBrands ? `
                <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2em; font-weight: 700; color: #ff0000;">${brandCount}</div>
                    <div style="font-size: 0.85em; color: #666; margin-top: 4px;">Brands</div>
                </div>
                ` : ''}
                <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2em; font-weight: 700; color: #ff0000;">${statesCount}</div>
                    <div style="font-size: 0.85em; color: #666; margin-top: 4px;">States</div>
                </div>
                <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2em; font-weight: 700; color: #ff0000;">${districtsCount}</div>
                    <div style="font-size: 0.85em; color: #666; margin-top: 4px;">Districts</div>
                </div>
                ${dcAnalytics ? `
                <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2em; font-weight: 700; color: #2196F3;">${dcAnalytics.count}</div>
                    <div style="font-size: 0.85em; color: #666; margin-top: 4px;">DCs</div>
                </div>
                <div style="background: #f8f8f8; padding: 16px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2em; font-weight: 700; color: #2196F3;">${dcAnalytics.avgStoresPerDC}</div>
                    <div style="font-size: 0.85em; color: #666; margin-top: 4px;">Avg Stores/DC</div>
                </div>
                ` : ''}
            </div>
            
            <!-- Key Metrics Panel -->
            <div style="background: #fff; padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin-bottom: 12px; color: #333; font-size: 0.95em;">Key Metrics</h4>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                    <span style="color: #666; font-size: 0.85em;">Avg stores per district:</span>
                    <span style="font-weight: 600; font-size: 0.85em;">${avgPerDistrict}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                    <span style="color: #666; font-size: 0.85em;">Geographic coverage:</span>
                    <span style="font-weight: 600; font-size: 0.85em;">${coveragePercent}%</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span style="color: #666; font-size: 0.85em;">Top 3 states concentration:</span>
                    <span style="font-weight: 600; font-size: 0.85em;">${concentrationPercent}%</span>
                </div>
            </div>
            
            <!-- Store Distribution by State Chart -->
            <div style="background: white; padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin-bottom: 12px; color: #333; font-size: 0.95em;">Top 10 States by Store Count</h4>
                <canvas id="overview-state-chart" style="max-height: 250px;"></canvas>
            </div>
            
            ${hasMultipleBrands ? `
            <!-- Brand Composition Chart -->
            <div style="background: white; padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin-bottom: 12px; color: #333; font-size: 0.95em;">Brand Composition</h4>
                <canvas id="overview-brand-chart" style="max-height: 200px;"></canvas>
            </div>
            ` : ''}
            
            ${dcAnalytics ? `
            <!-- DC Coverage Widget -->
            <div style="background: white; padding: 16px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h4 style="margin-bottom: 12px; color: #333; font-size: 0.95em;">Distribution Center Coverage</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                    <div style="text-align: center; padding: 12px; background: #f8f8f8; border-radius: 6px;">
                        <div style="font-size: 1.5em; font-weight: 700; color: #2196F3;">${dcAnalytics.avgStoresPerDC}</div>
                        <div style="font-size: 0.75em; color: #666; margin-top: 4px;">Avg Served</div>
                    </div>
                    <div style="text-align: center; padding: 12px; background: #f8f8f8; border-radius: 6px;">
                        <div style="font-size: 1.5em; font-weight: 700; color: #4CAF50;">${dcAnalytics.maxStores}</div>
                        <div style="font-size: 0.75em; color: #666; margin-top: 4px;">Best DC</div>
                    </div>
                    <div style="text-align: center; padding: 12px; background: #f8f8f8; border-radius: 6px;">
                        <div style="font-size: 1.5em; font-weight: 700; color: #FF9800;">${dcAnalytics.minStores}</div>
                        <div style="font-size: 0.75em; color: #666; margin-top: 4px;">Min Served</div>
                    </div>
                </div>
                <canvas id="overview-dc-chart" style="max-height: 200px;"></canvas>
            </div>
            ` : ''}
        </div>
    `;

    // Render charts after DOM update
    setTimeout(() => {
        renderOverviewCharts(topStates, brandComposition, hasMultipleBrands, dcAnalytics);
    }, 100);
}

/**
 * Render charts for Overview tab
 */
function renderOverviewCharts(topStates, brandComposition, hasMultipleBrands, dcAnalytics) {
    // Destroy existing charts
    if (window.overviewStateChart) window.overviewStateChart.destroy();
    if (window.overviewBrandChart) window.overviewBrandChart.destroy();
    if (window.overviewDCChart) window.overviewDCChart.destroy();
    
    // State distribution horizontal bar chart
    const stateCtx = document.getElementById('overview-state-chart');
    if (stateCtx && window.Chart) {
        window.overviewStateChart = new Chart(stateCtx, {
            type: 'bar',
            data: {
                labels: topStates.map(([state]) => state),
                datasets: [{
                    label: 'Store Count',
                    data: topStates.map(([, count]) => count),
                    backgroundColor: '#ff0000',
                    borderColor: '#cc0000',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    }
                }
            }
        });
    }
    
    // Brand composition donut chart
    if (hasMultipleBrands) {
        const brandCtx = document.getElementById('overview-brand-chart');
        if (brandCtx && window.Chart) {
            const brands = Object.entries(brandComposition).sort((a, b) => b[1] - a[1]);
            const brandColors = brands.map(([brand]) => window.getBrandColor(brand));
            
            window.overviewBrandChart = new Chart(brandCtx, {
                type: 'doughnut',
                data: {
                    labels: brands.map(([brand]) => brand),
                    datasets: [{
                        data: brands.map(([, count]) => count),
                        backgroundColor: brandColors,
                        borderWidth: 2,
                        borderColor: '#fff'
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
                                font: { size: 10 },
                                generateLabels: function(chart) {
                                    const data = chart.data;
                                    return data.labels.map((label, i) => ({
                                        text: `${label} (${data.datasets[0].data[i]})`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    }));
                                }
                            }
                        }
                    }
                }
            });
        }
    }
    
    // DC distribution chart
    if (dcAnalytics && dcAnalytics.catchment) {
        const dcCtx = document.getElementById('overview-dc-chart');
        if (dcCtx && window.Chart) {
            const dcData = dcAnalytics.catchment.sort((a, b) => b.storesServed - a.storesServed);
            
            window.overviewDCChart = new Chart(dcCtx, {
                type: 'bar',
                data: {
                    labels: dcData.map(dc => dc.dcName),
                    datasets: [{
                        label: 'Stores Served',
                        data: dcData.map(dc => dc.storesServed),
                        backgroundColor: '#2196F3',
                        borderColor: '#1976D2',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { precision: 0 }
                        }
                    }
                }
            });
        }
    }
}

/**
 * Populate the Stores panel with filters, statistics, and searchable store list
 */
function populateStoresPanel() {
    const panel = document.getElementById('stores');
    
    if (!window.storeData || !window.storeData.features || window.storeData.features.length === 0) {
        panel.innerHTML = '<div class="loading">Please select a category first</div>';
        return;
    }

    const stores = window.storeData.features;
    const hasDC = DC_CATEGORIES.includes(window.currentCategory);
    
    // Get brand composition
    const brandComposition = getBrandComposition(stores);
    const brands = Object.keys(brandComposition).sort();
    const hasMultipleBrands = brands.length > 1;
    
    // Get all states
    const allStates = [...new Set(stores.map(s => s.properties.State))].filter(Boolean).sort();
    
    // Apply filters
    const selectedBrand = window.selectedBrand || 'All';
    const selectedState = window.selectedState || 'All';
    
    let filteredStores = stores;
    if (selectedBrand !== 'All') {
        filteredStores = filteredStores.filter(s => s.properties.brand === selectedBrand);
    }
    if (selectedState !== 'All') {
        filteredStores = filteredStores.filter(s => s.properties.State === selectedState);
    }
    
    // Calculate district data for filtered stores
    const districtCounts = groupByGeography(filteredStores, 'District');
    const topDistricts = Object.entries(districtCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    // Calculate state/brand data for stacked chart
    const stateByBrand = groupByStateAndBrand(filteredStores);
    
    // DC proximity analysis
    let dcProximity = null;
    if (hasDC && window.dcData && window.dcData.features.length > 0) {
        dcProximity = getDistanceDistribution(filteredStores, window.dcData.features);
    }
    
    // Build brand statistics table
    let brandStatsHTML = '';
    if (hasMultipleBrands) {
        const brandStats = Object.entries(brandComposition)
            .sort((a, b) => b[1] - a[1])
            .map(([brand, count]) => {
                const percent = ((count / stores.length) * 100).toFixed(1);
                const color = window.getBrandColor(brand);
                return `
                    <tr style="border-bottom: 1px solid #f0f0f0;">
                        <td style="padding: 8px;">
                            <div style="display: flex; align-items: center;">
                                <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color}; margin-right: 8px;"></div>
                                <span style="font-size: 0.85em;">${brand}</span>
                            </div>
                        </td>
                        <td style="padding: 8px; text-align: right; font-weight: 600; font-size: 0.85em;">${count}</td>
                        <td style="padding: 8px; text-align: right; color: #666; font-size: 0.85em;">${percent}%</td>
                    </tr>
                `;
            }).join('');
    }
    
    panel.innerHTML = `
        <div style="padding: 16px; overflow-y: auto; max-height: calc(100vh - 450px);">
            
            ${hasMultipleBrands || allStates.length > 1 ? `
            <!-- Filters -->
            <div style="background: #f8f8f8; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    ${hasMultipleBrands ? `
                    <div>
                        <label style="font-size: 0.8em; color: #666; display: block; margin-bottom: 4px;">Brand Filter</label>
                        <select id="brand-filter" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85em;">
                            <option value="All">All Brands</option>
                            ${brands.map(brand => `<option value="${brand}" ${selectedBrand === brand ? 'selected' : ''}>${brand}</option>`).join('')}
                        </select>
                    </div>
                    ` : ''}
                    ${allStates.length > 1 ? `
                    <div>
                        <label style="font-size: 0.8em; color: #666; display: block; margin-bottom: 4px;">State Filter</label>
                        <select id="state-filter" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85em;">
                            <option value="All">All States</option>
                            ${allStates.map(state => `<option value="${state}" ${selectedState === state ? 'selected' : ''}>${state}</option>`).join('')}
                        </select>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            ${hasMultipleBrands ? `
            <!-- Brand Statistics Table -->
            <div style="background: white; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 16px;">
                <h4 style="margin-bottom: 10px; color: #333; font-size: 0.9em;">Brand Statistics</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid #e0e0e0;">
                            <th style="padding: 8px; text-align: left; font-size: 0.8em; color: #666;">Brand</th>
                            <th style="padding: 8px; text-align: right; font-size: 0.8em; color: #666;">Stores</th>
                            <th style="padding: 8px; text-align: right; font-size: 0.8em; color: #666;">Share</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${brandStatsHTML}
                    </tbody>
                </table>
            </div>
            ` : ''}
            
            <!-- Top 10 Districts Chart -->
            <div style="background: white; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 16px;">
                <h4 style="margin-bottom: 10px; color: #333; font-size: 0.9em;">Top 10 Districts</h4>
                <canvas id="stores-district-chart" style="max-height: 200px;"></canvas>
            </div>
            
            ${hasMultipleBrands ? `
            <!-- Store Count by State (Stacked) -->
            <div style="background: white; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 16px;">
                <h4 style="margin-bottom: 10px; color: #333; font-size: 0.9em;">Distribution by State & Brand</h4>
                <canvas id="stores-state-brand-chart" style="max-height: 250px;"></canvas>
            </div>
            ` : ''}
            
            ${dcProximity ? `
            <!-- DC Proximity Analysis -->
            <div style="background: white; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 16px;">
                <h4 style="margin-bottom: 10px; color: #333; font-size: 0.9em;">DC Proximity Analysis</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                    <div style="background: #f8f8f8; padding: 10px; border-radius: 6px; text-align: center;">
                        <div style="font-size: 1.3em; font-weight: 700; color: #2196F3;">${dcProximity.avgDistance.toFixed(1)} km</div>
                        <div style="font-size: 0.75em; color: #666; margin-top: 4px;">Avg Distance to DC</div>
                    </div>
                    <div style="background: #f8f8f8; padding: 10px; border-radius: 6px; text-align: center;">
                        <div style="font-size: 1.3em; font-weight: 700; color: #4CAF50;">${dcProximity.percentWithin25km.toFixed(0)}%</div>
                        <div style="font-size: 0.75em; color: #666; margin-top: 4px;">Within 25km of DC</div>
                    </div>
                </div>
                <canvas id="stores-dc-proximity-chart" style="max-height: 180px;"></canvas>
            </div>
            ` : ''}
            
            <!-- Store Search and List -->
            <div style="background: white; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h4 style="margin-bottom: 10px; color: #333; font-size: 0.9em;">Store Directory (${filteredStores.length})</h4>
                <input type="text" id="store-search" placeholder="Search by name, address, or location..." 
                       style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.85em; margin-bottom: 12px;"
                       oninput="filterStoreTable(this.value)">
                <div id="store-list" style="overflow-y: auto; max-height: 300px;">
                    ${renderStoreList(filteredStores)}
                </div>
            </div>
        </div>
    `;

    // Render charts
    setTimeout(() => {
        renderStoresCharts(topDistricts, stateByBrand, hasMultipleBrands, dcProximity, filteredStores);
    }, 100);
}

/**
 * Render store list HTML
 */
function renderStoreList(stores) {
    return stores.map(store => {
        const props = store.properties;
        const brandColor = props.brandColor || '#666';
        return `
            <div class="store-item" style="padding: 10px; border-bottom: 1px solid #f0f0f0; cursor: pointer;" 
                 onmouseover="this.style.background='#f8f8f8'" 
                 onmouseout="this.style.background='white'"
                 onclick="window.map.flyTo({center: [${store.geometry.coordinates[0]}, ${store.geometry.coordinates[1]}], zoom: 15})">
                <div style="display: flex; align-items: start; gap: 8px;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${brandColor}; margin-top: 4px; flex-shrink: 0;"></div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #333; font-size: 0.85em; margin-bottom: 2px;">${props.Name || 'Unnamed'}</div>
                        <div style="font-size: 0.75em; color: #666;">${props.brand || 'Unknown Brand'}</div>
                        <div style="font-size: 0.75em; color: #999; margin-top: 2px;">${props.District || 'N/A'}, ${props.State || 'N/A'}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('') || '<div style="padding: 20px; text-align: center; color: #999; font-size: 0.85em;">No stores found</div>';
}

/**
 * Render charts for Stores tab
 */
function renderStoresCharts(topDistricts, stateByBrand, hasMultipleBrands, dcProximity, filteredStores) {
    // Destroy existing charts
    if (window.storesDistrictChart) window.storesDistrictChart.destroy();
    if (window.storesStateBrandChart) window.storesStateBrandChart.destroy();
    if (window.storesDCProximityChart) window.storesDCProximityChart.destroy();
    
    // Top 10 Districts horizontal bar chart
    const districtCtx = document.getElementById('stores-district-chart');
    if (districtCtx && window.Chart) {
        window.storesDistrictChart = new Chart(districtCtx, {
            type: 'bar',
            data: {
                labels: topDistricts.map(([district]) => district),
                datasets: [{
                    label: 'Stores',
                    data: topDistricts.map(([, count]) => count),
                    backgroundColor: '#ff0000',
                    borderColor: '#cc0000',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.x} stores`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    }
                }
            }
        });
    }
    
    // State by Brand stacked chart
    if (hasMultipleBrands) {
        const stateBrandCtx = document.getElementById('stores-state-brand-chart');
        if (stateBrandCtx && window.Chart) {
            const allBrands = Object.keys(brandComposition);
            const states = Object.keys(stateByBrand).sort((a, b) => {
                const aTotal = Object.values(stateByBrand[a]).reduce((sum, v) => sum + v, 0);
                const bTotal = Object.values(stateByBrand[b]).reduce((sum, v) => sum + v, 0);
                return bTotal - aTotal;
            }).slice(0, 10);
            
            const datasets = allBrands.map(brand => ({
                label: brand,
                data: states.map(state => stateByBrand[state][brand] || 0),
                backgroundColor: window.getBrandColor(brand),
                borderWidth: 1,
                borderColor: '#fff'
            }));
            
            window.storesStateBrandChart = new Chart(stateBrandCtx, {
                type: 'bar',
                data: {
                    labels: states,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 10,
                                font: { size: 9 }
                            }
                        }
                    },
                    scales: {
                        x: { stacked: true },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            ticks: { precision: 0 }
                        }
                    }
                }
            });
        }
    }
    
    // DC Proximity histogram
    if (dcProximity) {
        const dcProxCtx = document.getElementById('stores-dc-proximity-chart');
        if (dcProxCtx && window.Chart) {
            const labels = Object.keys(dcProximity.distribution);
            const data = Object.values(dcProximity.distribution);
            
            window.storesDCProximityChart = new Chart(dcProxCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Number of Stores',
                        data: data,
                        backgroundColor: '#2196F3',
                        borderColor: '#1976D2',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { precision: 0 }
                        }
                    }
                }
            });
        }
    }
}

/**
 * Filter store table based on search text
 */
function filterStoreTable(searchText) {
    if (!window.storeData || !window.storeData.features) return;
    
    const storeList = document.getElementById('store-list');
    
    // Apply existing filters
    const selectedBrand = window.selectedBrand || 'All';
    const selectedState = window.selectedState || 'All';
    
    let stores = window.storeData.features;
    if (selectedBrand !== 'All') {
        stores = stores.filter(s => s.properties.brand === selectedBrand);
    }
    if (selectedState !== 'All') {
        stores = stores.filter(s => s.properties.State === selectedState);
    }
    
    // Apply search filter
    const filtered = stores.filter(store => {
        const props = store.properties;
        const searchLower = searchText.toLowerCase();
        return (props.Name || '').toLowerCase().includes(searchLower) ||
               (props.Address || '').toLowerCase().includes(searchLower) ||
               (props.District || '').toLowerCase().includes(searchLower) ||
               (props.State || '').toLowerCase().includes(searchLower) ||
               (props.brand || '').toLowerCase().includes(searchLower);
    });

    storeList.innerHTML = renderStoreList(filtered);
}

/**
 * Populate the Analytics panel with advanced spatial analysis and insights
 */
function populateAnalyticsPanel() {
    const panel = document.getElementById('analytics');
    
    if (!window.storeData || !window.storeData.features || window.storeData.features.length === 0) {
        panel.innerHTML = '<div class="loading">Please select a category first</div>';
        return;
    }

    const stores = window.storeData.features;
    const hasDC = DC_CATEGORIES.includes(window.currentCategory);
    
    // Brand composition
    const brandComposition = getBrandComposition(stores);
    const hasMultipleBrands = Object.keys(brandComposition).length > 1;
    
    // Calculate spatial analytics
    const densityData = window.districtData ? calculateDensity(stores, window.districtData) : [];
    const topDensity = densityData.slice(0, 5);
    const lowDensity = densityData.slice(-5).reverse();
    
    // White space analysis
    const whiteSpace = window.districtData ? identifyWhiteSpace(stores, window.districtData, 50) : [];
    const topOpportunities = whiteSpace.slice(0, 10);
    
    // DC catchment analysis
    let dcCatchment = null;
    let dcDistanceDistribution = null;
    if (hasDC && window.dcData && window.dcData.features.length > 0) {
        dcCatchment = analyzeDCCatchment(stores, window.dcData.features);
        dcDistanceDistribution = getDistanceDistribution(stores, window.dcData.features);
    }
    
    // State counts for concentration
    const stateCounts = groupByGeography(stores, 'State');
    const concentration = calculateConcentration(stateCounts);
    
    // Generate insights
    const insights = generateInsights({
        stateCounts,
        brandComposition,
        dcCatchment,
        distanceDistribution: dcDistanceDistribution,
        whiteSpace,
        densityData
    });

    panel.innerHTML = `
        <div style="padding: 16px; overflow-y: auto; max-height: calc(100vh - 450px);">
            <h3 style="color: #ff0000; margin-bottom: 16px; font-size: 1.1em;">Strategic Analytics</h3>
            
            <!-- Strategic Insights -->
            ${insights.length > 0 ? `
            <div style="background: #fff3cd; padding: 12px; border-left: 4px solid #ff0000; border-radius: 4px; margin-bottom: 16px;">
                <h4 style="margin-bottom: 8px; color: #333; font-size: 0.9em;">Key Insights</h4>
                ${insights.map(insight => `
                    <div style="font-size: 0.8em; color: #555; margin-bottom: 6px; padding-left: 8px;">• ${insight}</div>
                `).join('')}
            </div>
            ` : ''}
            
            <!-- Spatial Analytics -->
            <div style="background: white; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 16px;">
                <h4 style="margin-bottom: 10px; color: #333; font-size: 0.9em;">Store Density Analysis</h4>
                <div style="margin-bottom: 12px;">
                    <div style="font-size: 0.8em; color: #666; margin-bottom: 6px;">Market Concentration: <strong>${concentration.level}</strong> (Gini: ${concentration.gini})</div>
                </div>
                
                ${densityData.length > 0 ? `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <div style="font-size: 0.8em; font-weight: 600; color: #4CAF50; margin-bottom: 6px;">Top 5 Density</div>
                        ${topDensity.map(d => `
                            <div style="font-size: 0.75em; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                                <div style="font-weight: 600; color: #333;">${d.district}</div>
                                <div style="color: #666;">${d.density.toFixed(1)} stores/100k pop</div>
                            </div>
                        `).join('')}
                    </div>
                    <div>
                        <div style="font-size: 0.8em; font-weight: 600; color: #FF9800; margin-bottom: 6px;">Lowest 5 Density</div>
                        ${lowDensity.map(d => `
                            <div style="font-size: 0.75em; padding: 4px 0; border-bottom: 1px solid #f0f0f0;">
                                <div style="font-weight: 600; color: #333;">${d.district}</div>
                                <div style="color: #666;">${d.density.toFixed(1)} stores/100k pop</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : '<div style="font-size: 0.8em; color: #999; text-align: center; padding: 10px;">Population data not available</div>'}
            </div>
            
            ${hasMultipleBrands ? `
            <!-- Brand Comparison -->
            <div style="background: white; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 16px;">
                <h4 style="margin-bottom: 10px; color: #333; font-size: 0.9em;">Brand Performance Comparison</h4>
                <canvas id="analytics-brand-comparison" style="max-height: 200px;"></canvas>
            </div>
            ` : ''}
            
            <!-- White Space Analysis -->
            ${topOpportunities.length > 0 ? `
            <div style="background: white; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 16px;">
                <h4 style="margin-bottom: 10px; color: #333; font-size: 0.9em;">Expansion Opportunities</h4>
                <div style="font-size: 0.75em; color: #666; margin-bottom: 10px;">High-population districts with low store presence</div>
                <div style="max-height: 200px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="position: sticky; top: 0; background: #f8f8f8;">
                            <tr style="border-bottom: 2px solid #e0e0e0;">
                                <th style="padding: 6px 4px; text-align: left; font-size: 0.75em; color: #666;">District</th>
                                <th style="padding: 6px 4px; text-align: center; font-size: 0.75em; color: #666;">Pop (k)</th>
                                <th style="padding: 6px 4px; text-align: center; font-size: 0.75em; color: #666;">Stores</th>
                                <th style="padding: 6px 4px; text-align: center; font-size: 0.75em; color: #666;">Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topOpportunities.map(opp => `
                                <tr style="border-bottom: 1px solid #f0f0f0;">
                                    <td style="padding: 6px 4px; font-size: 0.75em;">${opp.district}</td>
                                    <td style="padding: 6px 4px; text-align: center; font-size: 0.75em;">${opp.population}</td>
                                    <td style="padding: 6px 4px; text-align: center; font-size: 0.75em;">${opp.currentStores}</td>
                                    <td style="padding: 6px 4px; text-align: center; font-weight: 600; color: #ff0000; font-size: 0.75em;">${opp.opportunityScore}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            ` : ''}
            
            ${dcCatchment ? `
            <!-- DC Catchment Analysis -->
            <div style="background: white; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 16px;">
                <h4 style="margin-bottom: 10px; color: #333; font-size: 0.9em;">DC Catchment Performance</h4>
                <div style="max-height: 180px; overflow-y: auto; margin-bottom: 12px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="position: sticky; top: 0; background: #f8f8f8;">
                            <tr style="border-bottom: 2px solid #e0e0e0;">
                                <th style="padding: 6px 4px; text-align: left; font-size: 0.75em; color: #666;">DC Name</th>
                                <th style="padding: 6px 4px; text-align: center; font-size: 0.75em; color: #666;">Stores</th>
                                <th style="padding: 6px 4px; text-align: center; font-size: 0.75em; color: #666;">Avg Dist</th>
                                <th style="padding: 6px 4px; text-align: center; font-size: 0.75em; color: #666;">Max Dist</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dcCatchment.map(dc => `
                                <tr style="border-bottom: 1px solid #f0f0f0;">
                                    <td style="padding: 6px 4px; font-size: 0.75em;">${dc.dcName}</td>
                                    <td style="padding: 6px 4px; text-align: center; font-weight: 600; color: #2196F3; font-size: 0.75em;">${dc.storesServed}</td>
                                    <td style="padding: 6px 4px; text-align: center; font-size: 0.75em;">${dc.avgDistance.toFixed(1)} km</td>
                                    <td style="padding: 6px 4px; text-align: center; font-size: 0.75em;">${dc.maxDistance.toFixed(1)} km</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <canvas id="analytics-dc-catchment" style="max-height: 180px;"></canvas>
            </div>
            
            <!-- DC Distance Distribution -->
            <div style="background: white; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 16px;">
                <h4 style="margin-bottom: 10px; color: #333; font-size: 0.9em;">Store-to-DC Distance Distribution</h4>
                <canvas id="analytics-dc-distance" style="max-height: 200px;"></canvas>
            </div>
            ` : ''}
        </div>
    `;

    // Render charts
    setTimeout(() => {
        renderAnalyticsCharts(brandComposition, hasMultipleBrands, dcCatchment, dcDistanceDistribution, stores);
    }, 100);
}

/**
 * Render charts for Analytics tab
 */
function renderAnalyticsCharts(brandComposition, hasMultipleBrands, dcCatchment, dcDistanceDistribution, stores) {
    // Destroy existing charts
    if (window.analyticsBrandChart) window.analyticsBrandChart.destroy();
    if (window.analyticsDCCatchmentChart) window.analyticsDCCatchmentChart.destroy();
    if (window.analyticsDCDistanceChart) window.analyticsDCDistanceChart.destroy();
    
    // Brand comparison radar chart
    if (hasMultipleBrands) {
        const brandCompCtx = document.getElementById('analytics-brand-comparison');
        if (brandCompCtx && window.Chart) {
            const brands = Object.keys(brandComposition);
            
            // Calculate metrics per brand
            const brandMetrics = brands.map(brand => {
                const brandStores = stores.filter(s => s.properties.brand === brand);
                const states = new Set(brandStores.map(s => s.properties.State).filter(Boolean));
                const districts = new Set(brandStores.map(s => s.properties.District).filter(Boolean));
                
                return {
                    brand,
                    stores: brandStores.length,
                    states: states.size,
                    districts: districts.size,
                    avgPerDistrict: districts.size > 0 ? brandStores.length / districts.size : 0
                };
            });
            
            // Normalize metrics for radar chart (0-100 scale)
            const maxStores = Math.max(...brandMetrics.map(m => m.stores));
            const maxStates = Math.max(...brandMetrics.map(m => m.states));
            const maxDistricts = Math.max(...brandMetrics.map(m => m.districts));
            const maxAvg = Math.max(...brandMetrics.map(m => m.avgPerDistrict));
            
            const datasets = brandMetrics.map(metric => ({
                label: metric.brand,
                data: [
                    (metric.stores / maxStores) * 100,
                    (metric.states / maxStates) * 100,
                    (metric.districts / maxDistricts) * 100,
                    (metric.avgPerDistrict / maxAvg) * 100
                ],
                backgroundColor: window.getBrandColor(metric.brand) + '33',
                borderColor: window.getBrandColor(metric.brand),
                borderWidth: 2,
                pointBackgroundColor: window.getBrandColor(metric.brand)
            }));
            
            window.analyticsBrandChart = new Chart(brandCompCtx, {
                type: 'radar',
                data: {
                    labels: ['Store Count', 'State Coverage', 'District Coverage', 'Density'],
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 10,
                                font: { size: 9 }
                            }
                        }
                    },
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { display: false }
                        }
                    }
                }
            });
        }
    }
    
    // DC Catchment bar chart
    if (dcCatchment) {
        const dcCatchCtx = document.getElementById('analytics-dc-catchment');
        if (dcCatchCtx && window.Chart) {
            window.analyticsDCCatchmentChart = new Chart(dcCatchCtx, {
                type: 'bar',
                data: {
                    labels: dcCatchment.map(dc => dc.dcName),
                    datasets: [{
                        label: 'Stores Served',
                        data: dcCatchment.map(dc => dc.storesServed),
                        backgroundColor: '#2196F3',
                        borderColor: '#1976D2',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { precision: 0 }
                        }
                    }
                }
            });
        }
        
        // DC Distance distribution
        const dcDistCtx = document.getElementById('analytics-dc-distance');
        if (dcDistCtx && window.Chart && dcDistanceDistribution) {
            const labels = Object.keys(dcDistanceDistribution.distribution);
            const data = Object.values(dcDistanceDistribution.distribution);
            
            window.analyticsDCDistanceChart = new Chart(dcDistCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Number of Stores',
                        data: data,
                        backgroundColor: labels.map((label, idx) => {
                            const colors = ['#4CAF50', '#81C784', '#FFC107', '#FF9800', '#F44336'];
                            return colors[idx] || '#999';
                        }),
                        borderWidth: 1,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { precision: 0 }
                        }
                    }
                }
            });
        }
    }
}
