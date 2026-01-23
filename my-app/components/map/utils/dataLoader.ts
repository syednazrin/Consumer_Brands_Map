// ============================================
// DATA LOADING MODULE
// ============================================

import { CATEGORY_FILE_MAP, DC_FILE_PATHS, DC_CATEGORIES, getBrandFromFilename, getBrandColor } from './config';

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  properties: Record<string, any>;
}

export interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface DistributionCenter {
  code: string;
  name: string;
  address: string;
  gps: string;
}

export interface DCStateGroup {
  state: string;
  locations: DistributionCenter[];
}

/**
 * Load store GeoJSON data for a given category
 */
export async function loadStoreGeoJSON(category: string): Promise<GeoJSONCollection> {
  try {
    console.log('Loading stores for category:', category);
    
    const basePath = '/api/data';
    const categoryPath = `${basePath}/${encodeURIComponent(category)}/GEOJSON Data`;
    const files = CATEGORY_FILE_MAP[category] || [];
    const allFeatures: GeoJSONFeature[] = [];

    for (const file of files) {
      try {
        const response = await fetch(`${categoryPath}/${encodeURIComponent(file)}`);
        if (response.ok) {
          const geojson: GeoJSONCollection = await response.json();
          if (geojson.features) {
            // Add brand name and color to each feature
            const brandName = getBrandFromFilename(file);
            const brandColor = getBrandColor(brandName);
            
            console.log(`Brand: ${brandName}, Color: ${brandColor}, Features: ${geojson.features.length}`);
            
            geojson.features.forEach(feature => {
              feature.properties.brand = brandName;
              feature.properties.brandColor = brandColor;
            });
            
            allFeatures.push(...geojson.features);
          }
        }
      } catch (err) {
        console.warn(`Could not load ${file}:`, err);
      }
    }

    console.log(`Loaded ${allFeatures.length} stores for ${category}`);

    return {
      type: 'FeatureCollection',
      features: allFeatures
    };
  } catch (error) {
    console.error('Error loading store GeoJSON:', error);
    return { type: 'FeatureCollection', features: [] };
  }
}

/**
 * Load distribution centers for categories that have them
 */
export async function loadDistributionCenters(category: string): Promise<GeoJSONCollection | null> {
  if (!DC_CATEGORIES.includes(category)) {
    return null;
  }

  try {
    console.log('Loading distribution centers for:', category);
    
    const dcFile = DC_FILE_PATHS[category];
    if (!dcFile) {
      return null;
    }

    const response = await fetch(dcFile);
    if (!response.ok) {
      console.warn('DC file not found:', dcFile);
      return null;
    }

    const jsonData: DCStateGroup[] = await response.json();
    
    // Convert to GeoJSON format
    const features: GeoJSONFeature[] = [];
    for (const stateGroup of jsonData) {
      for (const location of stateGroup.locations || []) {
        const gps = location.gps || '';
        if (gps) {
          try {
            const parts = gps.split(',');
            if (parts.length >= 2) {
              const lat = parseFloat(parts[0].trim());
              const lon = parseFloat(parts[1].trim());
              
              features.push({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [lon, lat] // GeoJSON uses [lon, lat]
                },
                properties: {
                  code: location.code || '',
                  name: location.name || '',
                  address: location.address || '',
                  state: stateGroup.state || '',
                  type: 'distribution_center'
                }
              });
            }
          } catch (err) {
            console.warn('Could not parse GPS:', gps, err);
          }
        }
      }
    }

    console.log(`Loaded ${features.length} distribution centers`);

    return {
      type: 'FeatureCollection',
      features: features
    };
  } catch (error) {
    console.error('Error loading distribution centers:', error);
    return null;
  }
}

/**
 * Load district geometry and statistics data
 */
export async function loadDistrictData(): Promise<GeoJSONCollection | null> {
  try {
    console.log('Loading district data...');
    
    // Load district geometry
    const geomResponse = await fetch('/api/district-data/malaysia.district.geojson');
    if (!geomResponse.ok) {
      throw new Error('Failed to load district geometry');
    }
    const geometry: GeoJSONCollection = await geomResponse.json();
    
    // Load district statistics
    const statsResponse = await fetch('/api/district-data/District Statistics.geojson');
    if (!statsResponse.ok) {
      throw new Error('Failed to load district statistics');
    }
    const statistics: GeoJSONCollection = await statsResponse.json();
    
    console.log('Loaded geometry:', geometry.features.length, 'districts');
    console.log('Loaded statistics:', statistics.features.length, 'records');
    
    // Create stats lookup by district name (case-insensitive)
    const statsMap: Record<string, Record<string, any>> = {};
    for (const feature of statistics.features) {
      const props = feature.properties;
      const districtKey = props.District?.toLowerCase();
      if (districtKey) {
        statsMap[districtKey] = props;
      }
    }

    console.log('Stats map created with', Object.keys(statsMap).length, 'entries');

    // Join statistics to geometry
    let joinCount = 0;
    for (const feature of geometry.features) {
      const props = feature.properties;
      const districtKey = props.name?.toLowerCase();
      
      if (districtKey && statsMap[districtKey]) {
        const stats = statsMap[districtKey];
        // Copy all statistics properties
        feature.properties['Population (k)'] = stats['Population (k)'];
        feature.properties['Income per capita'] = stats['Income per capita'];
        feature.properties['Income'] = stats['Income'];
        joinCount++;
      }
      // Silently skip districts without stats (some districts like W.P. Labuan, W.P. Putrajaya, etc. may not have stats)
    }

    console.log(`✓ Successfully joined ${joinCount} out of ${geometry.features.length} districts`);
    
    // Log sample for debugging
    if (geometry.features.length > 0) {
      const sample = geometry.features[0].properties;
      console.log('Sample district properties:', {
        name: sample.name,
        state: sample.state,
        population: sample['Population (k)'],
        income: sample['Income per capita']
      });
    }
    
    return geometry;
  } catch (error) {
    console.error('Error loading district data:', error);
    return null;
  }
}
