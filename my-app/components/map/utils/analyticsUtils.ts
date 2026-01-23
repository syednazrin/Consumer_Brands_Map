// ============================================
// ANALYTICS UTILITIES MODULE
// ============================================

import * as turf from '@turf/turf';
import { GeoJSONCollection, GeoJSONFeature } from './dataLoader';

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
 */
export function assignStoresToDCs(
  stores: GeoJSONFeature[],
  dcs: GeoJSONFeature[]
): { assignments: Record<number, number[]>; storeDistances: Record<number, { dcIndex: number; distance: number }> } {
  if (!stores || !dcs || dcs.length === 0) {
    return { assignments: {}, storeDistances: {} };
  }

  const assignments: Record<number, number[]> = {};
  const storeDistances: Record<number, { dcIndex: number; distance: number }> = {};

  // Initialize assignments for each DC
  dcs.forEach((_, idx) => {
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

  // Log assignment summary for verification
  const assignmentSummary = Object.entries(assignments)
    .map(([dcIdx, storeIndices]) => `DC ${dcIdx}: ${storeIndices.length} stores`)
    .join(', ');
  console.log(`assignStoresToDCs: Assigned ${stores.length} stores to ${dcs.length} DCs. Summary: ${assignmentSummary}`);

  return { assignments, storeDistances };
}

/**
 * Calculate brand composition from store features
 */
export function getBrandComposition(stores: GeoJSONFeature[]): Record<string, number> {
  const composition: Record<string, number> = {};
  
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
 */
export function groupByGeography(stores: GeoJSONFeature[], field: 'State' | 'District'): Record<string, number> {
  const grouped: Record<string, number> = {};
  
  if (!stores || stores.length === 0) {
    return grouped;
  }

  stores.forEach(store => {
    const value = store.properties[field] || 'Unknown';
    grouped[value] = (grouped[value] || 0) + 1;
  });

  return grouped;
}

/**
 * Group stores by both state and brand for stacked charts
 */
export function groupByStateAndBrand(stores: GeoJSONFeature[]): Record<string, Record<string, number>> {
  const grouped: Record<string, Record<string, number>> = {};
  
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
 * Analyze DC catchment areas
 */
export interface DCCatchmentData {
  dcIndex: number;
  dcName: string;
  dcState: string;
  storesServed: number;
  avgDistance: number;
  maxDistance: number;
  minDistance: number;
}

export function analyzeDCCatchment(stores: GeoJSONFeature[], dcs: GeoJSONFeature[]): DCCatchmentData[] | null {
  if (!stores || !dcs || dcs.length === 0) {
    return null;
  }

  const { assignments, storeDistances } = assignStoresToDCs(stores, dcs);
  
  const catchmentData: DCCatchmentData[] = dcs.map((dc, dcIdx) => {
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
 */
export function calculateDCReach(
  stores: GeoJSONFeature[],
  dcs: GeoJSONFeature[]
): { reach: number; dcReaches: Array<{ dcIndex: number; dcName: string; maxDistance: number }> } {
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
    
    // Log verification that we're finding the furthest store for each DC
    if (assignedStores.length > 0) {
      console.log(`calculateDCReach: DC ${dcIdx} (${dc.properties.name || `DC ${dcIdx + 1}`}) - ${assignedStores.length} stores assigned, furthest distance: ${maxDistance.toFixed(2)} km`);
    }
    
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
 */
export interface DistanceDistribution {
  distribution: Record<string, number>;
  avgDistance: number;
  percentWithin25km: number;
}

export function getDistanceDistribution(
  stores: GeoJSONFeature[],
  dcs: GeoJSONFeature[],
  bands: number[] = [10, 25, 50, 100]
): DistanceDistribution | null {
  if (!stores || !dcs || dcs.length === 0) {
    return null;
  }

  const { storeDistances } = assignStoresToDCs(stores, dcs);
  
  // Initialize distribution
  const distribution: Record<string, number> = {};
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
 * Assign stores to districts using spatial polygon containment
 */
export function assignStoresToDistrictsSpatially(
  stores: GeoJSONFeature[],
  districtGeoJSON: GeoJSONCollection
): Record<string, number[]> {
  if (!stores || !districtGeoJSON || !districtGeoJSON.features) {
    return {};
  }
  
  const assignments: Record<string, number[]> = {};
  
  // Initialize assignments for each district
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
          
          if (districtName && assignments[districtName]) {
            assignments[districtName].push(idx);
            
            // Update store properties for consistency
            store.properties.District = districtName;
            if (stateName) {
              store.properties.State = stateName;
            }
          }
          break; // Store found, move to next store
        }
      } catch (error) {
        console.warn(`Error checking point in polygon for district ${district.properties.name}:`, error);
      }
    }
  });
  
  return assignments;
}

/**
 * Count districts that contain at least one store
 */
export function countPopulatedDistricts(
  stores: GeoJSONFeature[],
  districtGeoJSON: GeoJSONCollection | null
): number {
  if (!stores || stores.length === 0 || !districtGeoJSON) {
    return 0;
  }
  
  const districtAssignments = assignStoresToDistrictsSpatially(stores, districtGeoJSON);
  
  // Count districts with at least 1 store
  let populatedCount = 0;
  Object.entries(districtAssignments).forEach(([, storeIndices]) => {
    if (storeIndices.length > 0) {
      populatedCount++;
    }
  });
  
  return populatedCount;
}

/**
 * Calculate market concentration using Gini coefficient
 */
export function calculateConcentration(stateCounts: Record<string, number>): { gini: string; level: string } {
  if (!stateCounts) return { gini: '0', level: 'Low' };

  const values = Object.values(stateCounts).sort((a, b) => a - b);
  const n = values.length;
  
  if (n === 0) return { gini: '0', level: 'Low' };

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
