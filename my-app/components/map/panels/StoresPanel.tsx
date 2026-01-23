'use client';

import { useState, useMemo } from 'react';
import { GeoJSONCollection, GeoJSONFeature } from '../utils/dataLoader';
import { DC_CATEGORIES, getBrandColor } from '../utils/config';
import {
  getBrandComposition,
  groupByGeography,
  groupByStateAndBrand,
  getDistanceDistribution
} from '../utils/analyticsUtils';

interface StoresPanelProps {
  storeData: GeoJSONCollection | null;
  dcData: GeoJSONCollection | null;
  currentCategory: string | null;
  onStoreClick?: (store: GeoJSONFeature) => void;
}

export default function StoresPanel({
  storeData,
  dcData,
  currentCategory,
  onStoreClick
}: StoresPanelProps) {
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [selectedState, setSelectedState] = useState<string>('All');
  const [searchText, setSearchText] = useState<string>('');

  const analytics = useMemo(() => {
    if (!storeData || !storeData.features || storeData.features.length === 0) {
      return null;
    }

    const stores = storeData.features;
    const hasDC = currentCategory ? DC_CATEGORIES.includes(currentCategory) : false;
    
    // Get brand composition
    const brandComposition = getBrandComposition(stores);
    const brands = Object.keys(brandComposition).sort();
    const hasMultipleBrands = brands.length > 1;
    
    // Get all states
    const allStates = [...new Set(stores.map(s => s.properties.State))].filter(Boolean).sort();
    
    // Apply filters
    let filteredStores = stores;
    if (selectedBrand !== 'All') {
      filteredStores = filteredStores.filter(s => s.properties.brand === selectedBrand);
    }
    if (selectedState !== 'All') {
      filteredStores = filteredStores.filter(s => s.properties.State === selectedState);
    }
    
    // Apply search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filteredStores = filteredStores.filter(store => {
        const props = store.properties;
        return (props.Name || '').toLowerCase().includes(searchLower) ||
               (props.Address || '').toLowerCase().includes(searchLower) ||
               (props.District || '').toLowerCase().includes(searchLower) ||
               (props.State || '').toLowerCase().includes(searchLower) ||
               (props.brand || '').toLowerCase().includes(searchLower);
      });
    }
    
    // Calculate district data for filtered stores
    const districtCounts = groupByGeography(filteredStores, 'District');
    const topDistricts = Object.entries(districtCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    // Calculate state/brand data
    const stateByBrand = groupByStateAndBrand(filteredStores);
    
    // DC proximity analysis
    let dcProximity = null;
    if (hasDC && dcData && dcData.features.length > 0) {
      dcProximity = getDistanceDistribution(filteredStores, dcData.features);
    }

    return {
      stores,
      filteredStores,
      brandComposition,
      brands,
      hasMultipleBrands,
      allStates,
      topDistricts,
      stateByBrand,
      dcProximity
    };
  }, [storeData, dcData, currentCategory, selectedBrand, selectedState, searchText]);

  if (!analytics) {
    return (
      <div className="text-center py-5 text-gray-600">Please select a category first</div>
    );
  }

  return (
    <div className="p-4 overflow-y-auto max-h-[calc(100vh-450px)]">
      {/* Filters */}
      {(analytics.hasMultipleBrands || analytics.allStates.length > 1) && (
        <div className="bg-gray-100 p-3 rounded-lg mb-4">
          <div className="grid grid-cols-2 gap-3">
            {analytics.hasMultipleBrands && (
              <div>
                <label className="text-xs text-gray-600 block mb-1">Brand Filter</label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full p-1.5 border border-gray-300 rounded text-sm"
                >
                  <option value="All">All Brands</option>
                  {analytics.brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>
            )}
            {analytics.allStates.length > 1 && (
              <div>
                <label className="text-xs text-gray-600 block mb-1">State Filter</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full p-1.5 border border-gray-300 rounded text-sm"
                >
                  <option value="All">All States</option>
                  {analytics.allStates.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Brand Statistics Table */}
      {analytics.hasMultipleBrands && (
        <div className="bg-white p-3 border border-gray-200 rounded-lg mb-4">
          <h4 className="mb-2.5 text-gray-800 text-sm font-semibold">Brand Statistics</h4>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="p-2 text-left text-xs text-gray-600">Brand</th>
                <th className="p-2 text-right text-xs text-gray-600">Stores</th>
                <th className="p-2 text-right text-xs text-gray-600">Share</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(analytics.brandComposition)
                .sort((a, b) => b[1] - a[1])
                .map(([brand, count]) => {
                  const percent = ((count / analytics.stores.length) * 100).toFixed(1);
                  const color = getBrandColor(brand);
                  return (
                    <tr key={brand} className="border-b border-gray-100">
                      <td className="p-2">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-sm">{brand}</span>
                        </div>
                      </td>
                      <td className="p-2 text-right font-semibold text-sm">{count}</td>
                      <td className="p-2 text-right text-gray-600 text-sm">{percent}%</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Top 10 Districts */}
      <div className="bg-white p-3 border border-gray-200 rounded-lg mb-4">
        <h4 className="mb-2.5 text-gray-800 text-sm font-semibold">Top 10 Districts</h4>
        <div className="space-y-1.5">
          {analytics.topDistricts.map(([district, count], idx) => (
            <div key={district} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-6">{idx + 1}.</span>
                <span className="text-sm text-gray-800">{district}</span>
              </div>
              <span className="text-sm font-semibold text-red-600">{count}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* DC Proximity Analysis */}
      {analytics.dcProximity && (
        <div className="bg-white p-3 border border-gray-200 rounded-lg mb-4">
          <h4 className="mb-2.5 text-gray-800 text-sm font-semibold">DC Proximity Analysis</h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-gray-100 p-2.5 rounded-md text-center">
              <div className="text-xl font-bold text-blue-500">{analytics.dcProximity.avgDistance.toFixed(1)} km</div>
              <div className="text-xs text-gray-600 mt-1">Avg Distance to DC</div>
            </div>
            <div className="bg-gray-100 p-2.5 rounded-md text-center">
              <div className="text-xl font-bold text-green-500">{analytics.dcProximity.percentWithin25km.toFixed(0)}%</div>
              <div className="text-xs text-gray-600 mt-1">Within 25km of DC</div>
            </div>
          </div>
          <div className="text-xs text-gray-600">
            Distance bands: {Object.entries(analytics.dcProximity.distribution)
              .map(([label, count]) => `${label}: ${count}`)
              .join(', ')}
          </div>
        </div>
      )}
      
      {/* Store Search and List */}
      <div className="bg-white p-3 border border-gray-200 rounded-lg">
        <h4 className="mb-2.5 text-gray-800 text-sm font-semibold">
          Store Directory ({analytics.filteredStores.length})
        </h4>
        <input
          type="text"
          placeholder="Search by name, address, or location..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md text-sm mb-3"
        />
        <div className="overflow-y-auto max-h-[300px]">
          {analytics.filteredStores.length === 0 ? (
            <div className="text-center py-5 text-gray-500 text-sm">No stores found</div>
          ) : (
            analytics.filteredStores.map((store, idx) => {
              const props = store.properties;
              const brandColor = props.brandColor || getBrandColor(props.brand || '');
              return (
                <div
                  key={idx}
                  onClick={() => onStoreClick?.(store)}
                  className="p-2.5 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: brandColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm mb-0.5 truncate">
                        {props.Name || 'Unnamed'}
                      </div>
                      <div className="text-xs text-gray-600">{props.brand || 'Unknown Brand'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {props.District || 'N/A'}, {props.State || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
