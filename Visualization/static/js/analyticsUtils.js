// ============================================
// ANALYTICS UTILITIES MODULE
// ============================================

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Find nearest DC for each store and assign stores to DCs
 * @param {Array} stores - Array of store features
 * @param {Array} dcs - Array of DC features
 * @returns {Object} Object with store assignments and distances
 */
function assignStoresToDCs(stores, dcs) {
    if (!stores || !dcs || dcs.length === 0) {
        return { assignments: {}, storeDistances: {} };
    }

    const assignments = {}; // DC index -> array of store indices
    const storeDistances = {}; // store index -> { dcIndex, distance }

    // Initialize assignments for each DC
    dcs.forEach((dc, idx) => {
        assignments[idx] = [];
    });

    // Assign each store to nearest DC
    stores.forEach((store, storeIdx) => {
        const [storeLon, storeLat] = store.geometry.coordinates;
        let minDistance = Infinity;
        let nearestDC = -1;

        dcs.forEach((dc, dcIdx) => {
            const [dcLon, dcLat] = dc.geometry.coordinates;
            const distance = calculateDistance(storeLat, storeLon, dcLat, dcLon);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestDC = dcIdx;
            }
        });

        if (nearestDC !== -1) {
            assignments[nearestDC].push(storeIdx);
            storeDistances[storeIdx] = {
                dcIndex: nearestDC,
                distance: minDistance
            };
        }
    });

    return { assignments, storeDistances };
}

/**
 * Assign stores to districts using spatial polygon containment
 * @param {Array} stores - Store features with coordinates
 * @param {Object} districtGeoJSON - District polygon GeoJSON
 * @param {boolean} useCache - Whether to use cached results
 * @returns {Object} districtName -> array of store indices
 */
function assignStoresToDistrictsSpatially(stores, districtGeoJSON, useCache = true) {
    if (!stores || !districtGeoJSON || !window.turf) {
        console.error('Missing data or Turf.js not loaded for spatial district assignment');
        return {};
    }
    
    // Check cache
    if (useCache && window.districtAssignmentsCache) {
        return window.districtAssignmentsCache;
    }
    
    const assignments = {};
    
    // Initialize
    districtGeoJSON.features.forEach(district => {
        const districtName = district.properties.name || district.properties.Name;
        if (districtName) {
            assignments[districtName] = [];
        }
    });
    
    // Assign each store to containing district
    stores.forEach((store, idx) => {
        const point = turf.point(store.geometry.coordinates);
        
        for (const district of districtGeoJSON.features) {
            try {
                if (turf.booleanPointInPolygon(point, district.geometry)) {
                    const districtName = district.properties.name || district.properties.Name;
                    const stateName = district.properties.state || district.properties.State;
                    
                    if (districtName) {
                        assignments[districtName].push(idx);
                        
                        // Update the store's district property for consistency
                        store.properties.District = districtName;
                        if (stateName) {
                            store.properties.State = stateName;
                        }
                    }
                    break; // Store found in district, move to next store
                }
            } catch (error) {
                console.warn(`Error checking point in polygon for district ${district.properties.name}:`, error);
            }
        }
    });
    
    // Cache the results
    if (useCache) {
        window.districtAssignmentsCache = assignments;
    }
    
    return assignments;
}

/**
 * Calculate brand composition from store features
 * @param {Array} stores - Array of store features
 * @returns {Object} Object with brand names as keys and counts as values
 */
function getBrandComposition(stores) {
    const composition = {};
    
    if (!stores || stores.length === 0) {
        return composition;
    }

    stores.forEach(store => {
        const brand = store.properties.brand || 'Unknown';
        composition[brand] = (composition[brand] || 0) + 1;
    });

    return composition;
}

/**
 * Group stores by geographic entity (State or District)
 * @param {Array} stores - Array of store features
 * @param {string} field - Field name to group by ('State' or 'District')
 * @returns {Object} Object with field values as keys and store counts as values
 */
function groupByGeography(stores, field) {
    const grouped = {};
    
    if (!stores || stores.length === 0) {
        return grouped;
    }

    // Special handling for District - use spatial containment
    if (field === 'District' && window.districtData) {
        const assignments = assignStoresToDistrictsSpatially(stores, window.districtData);
        Object.entries(assignments).forEach(([district, storeIndices]) => {
            if (storeIndices.length > 0) {
                grouped[district] = storeIndices.length;
            }
        });
        return grouped;
    }

    // For other fields (like State), use property-based grouping
    stores.forEach(store => {
        const value = store.properties[field] || 'Unknown';
        grouped[value] = (grouped[value] || 0) + 1;
    });

    return grouped;
}

/**
 * Group stores by both state and brand for stacked charts
 * @param {Array} stores - Array of store features
 * @returns {Object} Nested object: state -> brand -> count
 */
function groupByStateAndBrand(stores) {
    const grouped = {};
    
    if (!stores || stores.length === 0) {
        return grouped;
    }

    stores.forEach(store => {
        const state = store.properties.State || 'Unknown';
        const brand = store.properties.brand || 'Unknown';
        
        if (!grouped[state]) {
            grouped[state] = {};
        }
        grouped[state][brand] = (grouped[state][brand] || 0) + 1;
    });

    return grouped;
}

/**
 * Calculate store density (stores per 100k population)
 * @param {Array} stores - Array of store features
 * @param {Object} districtData - District GeoJSON with population data
 * @returns {Array} Array of objects with district, stores, population, density
 */
function calculateDensity(stores, districtData) {
    if (!stores || !districtData || !districtData.features) {
        return [];
    }

    // Use spatial assignment to count stores per district
    const districtAssignments = assignStoresToDistrictsSpatially(stores, districtData);
    const storesByDistrict = {};
    Object.entries(districtAssignments).forEach(([district, storeIndices]) => {
        storesByDistrict[district] = storeIndices.length;
    });

    // Calculate density for each district
    const densityData = [];
    districtData.features.forEach(feature => {
        const districtName = feature.properties.name;
        const population = feature.properties['Population (k)'];
        const storeCount = storesByDistrict[districtName] || 0;

        if (population && population > 0) {
            const density = (storeCount / population) * 100; // stores per 100k population
            densityData.push({
                district: districtName,
                state: feature.properties.state,
                stores: storeCount,
                population: population,
                density: density
            });
        }
    });

    return densityData.sort((a, b) => b.density - a.density);
}

/**
 * Identify white space opportunities (underserved areas)
 * @param {Array} stores - Array of store features
 * @param {Object} districtData - District GeoJSON with population data
 * @param {number} threshold - Population threshold in thousands
 * @returns {Array} Array of underserved districts
 */
function identifyWhiteSpace(stores, districtData, threshold = 50) {
    if (!stores || !districtData || !districtData.features) {
        return [];
    }

    // Use spatial assignment to count stores per district
    const districtAssignments = assignStoresToDistrictsSpatially(stores, districtData);
    const storesByDistrict = {};
    Object.entries(districtAssignments).forEach(([district, storeIndices]) => {
        storesByDistrict[district] = storeIndices.length;
    });

    // Find underserved districts
    const whiteSpace = [];
    districtData.features.forEach(feature => {
        const districtName = feature.properties.name;
        const population = feature.properties['Population (k)'];
        const storeCount = storesByDistrict[districtName] || 0;

        // Criteria: high population but few stores
        if (population && population >= threshold && storeCount < 3) {
            const opportunityScore = Math.round(population / Math.max(storeCount, 1));
            whiteSpace.push({
                district: districtName,
                state: feature.properties.state,
                population: population,
                currentStores: storeCount,
                opportunityScore: opportunityScore
            });
        }
    });

    return whiteSpace.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

/**
 * Analyze DC catchment areas
 * @param {Array} stores - Array of store features
 * @param {Array} dcs - Array of DC features
 * @returns {Object} DC analysis with stores served, distances, etc.
 */
function analyzeDCCatchment(stores, dcs) {
    if (!stores || !dcs || dcs.length === 0) {
        return null;
    }

    const { assignments, storeDistances } = assignStoresToDCs(stores, dcs);
    
    const catchmentData = dcs.map((dc, dcIdx) => {
        const assignedStores = assignments[dcIdx] || [];
        const distances = assignedStores.map(storeIdx => storeDistances[storeIdx].distance);
        
        return {
            dcIndex: dcIdx,
            dcName: dc.properties.name || `DC ${dcIdx + 1}`,
            dcState: dc.properties.state || 'Unknown',
            storesServed: assignedStores.length,
            avgDistance: distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : 0,
            maxDistance: distances.length > 0 ? Math.max(...distances) : 0,
            minDistance: distances.length > 0 ? Math.min(...distances) : 0
        };
    });

    return catchmentData.sort((a, b) => b.storesServed - a.storesServed);
}

/**
 * Calculate DC reach - average of longest distances from each DC to its assigned stores
 * @param {Array} stores - Array of store features
 * @param {Array} dcs - Array of DC features
 * @returns {Object} Object with reach value and per-DC max distances
 */
function calculateDCReach(stores, dcs) {
    if (!stores || !dcs || dcs.length === 0) {
        return { reach: 0, dcReaches: [] };
    }

    const { assignments, storeDistances } = assignStoresToDCs(stores, dcs);
    
    // For each DC, find the maximum distance to its assigned stores
    const dcReaches = dcs.map((dc, dcIdx) => {
        const assignedStores = assignments[dcIdx] || [];
        
        if (assignedStores.length === 0) {
            return {
                dcIndex: dcIdx,
                dcName: dc.properties.name || `DC ${dcIdx + 1}`,
                maxDistance: 0
            };
        }
        
        const distances = assignedStores.map(storeIdx => storeDistances[storeIdx].distance);
        const maxDistance = Math.max(...distances);
        
        return {
            dcIndex: dcIdx,
            dcName: dc.properties.name || `DC ${dcIdx + 1}`,
            maxDistance: maxDistance
        };
    });
    
    // Filter out DCs with no assigned stores, then average the max distances
    const validReaches = dcReaches.filter(dc => dc.maxDistance > 0);
    const reach = validReaches.length > 0
        ? validReaches.reduce((sum, dc) => sum + dc.maxDistance, 0) / validReaches.length
        : 0;
    
    return {
        reach: reach,
        dcReaches: dcReaches
    };
}

/**
 * Get distribution of stores by distance to nearest DC
 * @param {Array} stores - Array of store features
 * @param {Array} dcs - Array of DC features
 * @param {Array} bands - Distance bands in km (e.g., [10, 25, 50, 100])
 * @returns {Object} Distribution by distance bands
 */
function getDistanceDistribution(stores, dcs, bands = [10, 25, 50, 100]) {
    if (!stores || !dcs || dcs.length === 0) {
        return null;
    }

    const { storeDistances } = assignStoresToDCs(stores, dcs);
    
    // Initialize distribution
    const distribution = {};
    bands.forEach((band, idx) => {
        const label = idx === 0 
            ? `0-${band}km` 
            : `${bands[idx-1]}-${band}km`;
        distribution[label] = 0;
    });
    distribution[`${bands[bands.length - 1]}km+`] = 0;

    // Count stores in each band
    Object.values(storeDistances).forEach(({ distance }) => {
        let placed = false;
        for (let i = 0; i < bands.length; i++) {
            const label = i === 0 ? `0-${bands[i]}km` : `${bands[i-1]}-${bands[i]}km`;
            if (distance <= bands[i]) {
                distribution[label]++;
                placed = true;
                break;
            }
        }
        if (!placed) {
            distribution[`${bands[bands.length - 1]}km+`]++;
        }
    });

    // Calculate statistics
    const allDistances = Object.values(storeDistances).map(d => d.distance);
    const avgDistance = allDistances.length > 0 
        ? allDistances.reduce((a, b) => a + b, 0) / allDistances.length 
        : 0;
    
    const within25km = Object.entries(distribution)
        .filter(([label]) => {
            const maxDist = parseInt(label.split('-')[1]) || 25;
            return maxDist <= 25;
        })
        .reduce((sum, [, count]) => sum + count, 0);
    
    const percentWithin25km = stores.length > 0 
        ? (within25km / stores.length) * 100 
        : 0;

    return {
        distribution,
        avgDistance,
        percentWithin25km
    };
}

/**
 * Generate strategic insights based on data patterns
 * @param {Object} analytics - Precomputed analytics data
 * @returns {Array} Array of insight strings
 */
function generateInsights(analytics) {
    const insights = [];
    
    if (!analytics) return insights;

    // Market concentration insight
    if (analytics.stateCounts) {
        const totalStores = Object.values(analytics.stateCounts).reduce((a, b) => a + b, 0);
        const sortedStates = Object.entries(analytics.stateCounts).sort((a, b) => b[1] - a[1]);
        const top3Count = sortedStates.slice(0, 3).reduce((sum, [, count]) => sum + count, 0);
        const concentration = totalStores > 0 ? (top3Count / totalStores) * 100 : 0;
        
        if (concentration > 60) {
            insights.push(`High concentration: ${concentration.toFixed(0)}% of stores in top 3 states`);
        } else if (concentration < 40) {
            insights.push(`Well-distributed: Stores spread across ${sortedStates.length} states`);
        }
    }

    // DC coverage insight
    if (analytics.dcCatchment && analytics.dcCatchment.length > 0) {
        const topDC = analytics.dcCatchment[0];
        insights.push(`Strongest DC presence in ${topDC.dcState} serving ${topDC.storesServed} stores`);
        
        if (analytics.distanceDistribution && analytics.distanceDistribution.percentWithin25km) {
            const percent = analytics.distanceDistribution.percentWithin25km.toFixed(0);
            insights.push(`${percent}% of stores within 25km of a distribution center`);
        }
    }

    // White space insight
    if (analytics.whiteSpace && analytics.whiteSpace.length > 0) {
        insights.push(`${analytics.whiteSpace.length} high-potential expansion opportunities identified`);
        if (analytics.whiteSpace[0]) {
            insights.push(`Top opportunity: ${analytics.whiteSpace[0].district} (population: ${analytics.whiteSpace[0].population}k)`);
        }
    }

    // Brand leader insight
    if (analytics.brandComposition) {
        const brands = Object.entries(analytics.brandComposition).sort((a, b) => b[1] - a[1]);
        if (brands.length > 1) {
            const leader = brands[0];
            const totalStores = brands.reduce((sum, [, count]) => sum + count, 0);
            const share = totalStores > 0 ? (leader[1] / totalStores) * 100 : 0;
            insights.push(`Brand leader: ${leader[0]} accounts for ${share.toFixed(0)}% of stores`);
        }
    }

    // Density insight
    if (analytics.densityData && analytics.densityData.length > 0) {
        const topDensity = analytics.densityData[0];
        insights.push(`Highest density: ${topDensity.district} (${topDensity.density.toFixed(1)} stores per 100k population)`);
    }

    return insights;
}

/**
 * Calculate market concentration using Gini coefficient
 * @param {Object} stateCounts - Object with state names as keys and counts as values
 * @returns {Object} Concentration metrics
 */
function calculateConcentration(stateCounts) {
    if (!stateCounts) return { gini: 0, level: 'Low' };

    const values = Object.values(stateCounts).sort((a, b) => a - b);
    const n = values.length;
    
    if (n === 0) return { gini: 0, level: 'Low' };

    let sumOfDifferences = 0;
    let sumOfValues = 0;

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            sumOfDifferences += Math.abs(values[i] - values[j]);
        }
        sumOfValues += values[i];
    }

    const gini = sumOfDifferences / (2 * n * sumOfValues);
    
    let level = 'Low';
    if (gini > 0.6) level = 'High';
    else if (gini > 0.4) level = 'Medium';

    return { gini: gini.toFixed(3), level };
}

/**
 * Count districts that contain at least one store
 * @param {Array} stores - Store features with coordinates
 * @param {Object} districtGeoJSON - District polygon GeoJSON
 * @returns {number} Number of populated districts
 */
function countPopulatedDistricts(stores, districtGeoJSON) {
    if (!stores || stores.length === 0 || !districtGeoJSON) {
        return 0;
    }
    
    // Use spatial assignment to get districts with stores
    const districtAssignments = assignStoresToDistrictsSpatially(stores, districtGeoJSON);
    
    // Count districts with at least 1 store
    let populatedCount = 0;
    Object.entries(districtAssignments).forEach(([district, storeIndices]) => {
        if (storeIndices.length > 0) {
            populatedCount++;
        }
    });
    
    return populatedCount;
}

// Make all analytics functions globally accessible
window.calculateDistance = calculateDistance;
window.assignStoresToDCs = assignStoresToDCs;
window.assignStoresToDistrictsSpatially = assignStoresToDistrictsSpatially;
window.getBrandComposition = getBrandComposition;
window.groupByGeography = groupByGeography;
window.groupByStateAndBrand = groupByStateAndBrand;
window.calculateDensity = calculateDensity;
window.identifyWhiteSpace = identifyWhiteSpace;
window.analyzeDCCatchment = analyzeDCCatchment;
window.calculateDCReach = calculateDCReach;
window.getDistanceDistribution = getDistanceDistribution;
window.generateInsights = generateInsights;
window.calculateConcentration = calculateConcentration;
window.countPopulatedDistricts = countPopulatedDistricts;
