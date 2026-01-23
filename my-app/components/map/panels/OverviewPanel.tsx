'use client';

import { useMemo } from 'react';
import { GeoJSONCollection } from '../utils/dataLoader';
import { DC_CATEGORIES } from '../utils/config';
import {
  getBrandComposition,
  groupByGeography,
  analyzeDCCatchment,
  calculateDCReach,
  countPopulatedDistricts
} from '../utils/analyticsUtils';

interface OverviewPanelProps {
  storeData: GeoJSONCollection | null;
  dcData: GeoJSONCollection | null;
  districtData: GeoJSONCollection | null;
  currentCategory: string | null;
}

export default function OverviewPanel({
  storeData,
  dcData,
  districtData,
  currentCategory
}: OverviewPanelProps) {
  const analytics = useMemo(() => {
    if (!storeData || !storeData.features || storeData.features.length === 0) {
      return null;
    }

    const stores = storeData.features;
    const hasDC = currentCategory ? DC_CATEGORIES.includes(currentCategory) : false;
    
    // Calculate basic statistics
    const totalStores = stores.length;
    const states = new Set<string>();
    
    stores.forEach(f => {
      if (f.properties.State) states.add(f.properties.State);
    });

    const statesCount = states.size;
    
    // Use spatial counting for districts if districtData is available
    const districtsCount = districtData && districtData.features
      ? countPopulatedDistricts(stores, districtData)
      : new Set(stores.map(f => f.properties.District).filter(Boolean)).size;
    
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
    if (hasDC && dcData && dcData.features.length > 0) {
      const dcCatchment = analyzeDCCatchment(stores, dcData.features);
      if (dcCatchment) {
        const avgStoresPerDC = dcCatchment.reduce((sum, dc) => sum + dc.storesServed, 0) / dcCatchment.length;
        const maxStores = Math.max(...dcCatchment.map(dc => dc.storesServed));
        const minStores = Math.min(...dcCatchment.map(dc => dc.storesServed));
        
        // Calculate DC reach
        const dcReachData = calculateDCReach(stores, dcData.features);
        
        dcAnalytics = {
          count: dcData.features.length,
          avgStoresPerDC: avgStoresPerDC.toFixed(1),
          maxStores,
          minStores,
          reach: dcReachData.reach,
          dcReaches: dcReachData.dcReaches,
          catchment: dcCatchment
        };
      }
    }
    
    // Calculate metrics
    const avgPerDistrict = districtsCount > 0 ? (totalStores / districtsCount).toFixed(1) : '0';
    const coveragePercent = ((districtsCount / 160) * 100).toFixed(1);
    
    // Market concentration
    const top3States = topStates.slice(0, 3).reduce((sum, [, count]) => sum + count, 0);
    const concentrationPercent = ((top3States / totalStores) * 100).toFixed(0);

    return {
      totalStores,
      statesCount,
      districtsCount,
      brandCount,
      hasMultipleBrands,
      brandComposition,
      topStates,
      dcAnalytics,
      avgPerDistrict,
      coveragePercent,
      concentrationPercent
    };
  }, [storeData, dcData, districtData, currentCategory]);

  if (!analytics) {
    return (
      <div className="text-center py-5 text-gray-600">Please select a category first</div>
    );
  }

  return (
    <div className="p-5 overflow-y-auto max-h-[calc(100vh-450px)]">
      <h3 className="text-red-600 mb-5 text-lg font-semibold">{currentCategory || 'Overview'}</h3>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gray-100 p-4 rounded-lg text-center border border-gray-200">
          <div className="text-3xl font-bold text-red-600">{analytics.totalStores}</div>
          <div className="text-sm text-gray-600 mt-1">Total Stores</div>
        </div>
        {analytics.hasMultipleBrands && (
          <div className="bg-gray-100 p-4 rounded-lg text-center border border-gray-200">
            <div className="text-3xl font-bold text-red-600">{analytics.brandCount}</div>
            <div className="text-sm text-gray-600 mt-1">Brands</div>
          </div>
        )}
        <div className="bg-gray-100 p-4 rounded-lg text-center border border-gray-200">
          <div className="text-3xl font-bold text-red-600">{analytics.statesCount}</div>
          <div className="text-sm text-gray-600 mt-1">States</div>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg text-center border border-gray-200">
          <div className="text-3xl font-bold text-red-600">{analytics.districtsCount}</div>
          <div className="text-sm text-gray-600 mt-1">Districts</div>
        </div>
        {analytics.dcAnalytics && (
          <>
            <div className="bg-gray-100 p-4 rounded-lg text-center border border-gray-200">
              <div className="text-3xl font-bold text-blue-500">{analytics.dcAnalytics.count}</div>
              <div className="text-sm text-gray-600 mt-1">DCs</div>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg text-center border border-gray-200">
              <div className="text-3xl font-bold text-blue-500">{analytics.dcAnalytics.avgStoresPerDC}</div>
              <div className="text-sm text-gray-600 mt-1">Avg Stores/DC</div>
            </div>
          </>
        )}
      </div>
      
      {/* Key Metrics Panel */}
      <div className="bg-white p-4 border border-gray-200 rounded-lg mb-5">
        <h4 className="mb-3 text-gray-800 text-sm font-semibold">Key Metrics</h4>
        <div className="flex justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600 text-sm">Avg stores per district:</span>
          <span className="font-semibold text-sm">{analytics.avgPerDistrict}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-gray-100">
          <span className="text-gray-600 text-sm">Geographic coverage:</span>
          <span className="font-semibold text-sm">{analytics.coveragePercent}%</span>
        </div>
        <div className={`flex justify-between py-2 ${analytics.dcAnalytics ? 'border-b border-gray-100' : ''}`}>
          <span className="text-gray-600 text-sm">Top 3 states concentration:</span>
          <span className="font-semibold text-sm">{analytics.concentrationPercent}%</span>
        </div>
        {analytics.dcAnalytics && analytics.dcAnalytics.reach > 0 && (
          <div className="flex justify-between py-2">
            <span className="text-gray-600 text-sm">DC Reach:</span>
            <span className="font-semibold text-sm text-blue-500">{analytics.dcAnalytics.reach.toFixed(1)} km</span>
          </div>
        )}
      </div>
      
      {/* Top 10 States */}
      <div className="bg-white p-4 border border-gray-200 rounded-lg mb-5">
        <h4 className="mb-3 text-gray-800 text-sm font-semibold">Top 10 States by Store Count</h4>
        <div className="space-y-2">
          {analytics.topStates.map(([state, count], idx) => (
            <div key={state} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-6">{idx + 1}.</span>
                <span className="text-sm text-gray-800">{state}</span>
              </div>
              <span className="text-sm font-semibold text-red-600">{count}</span>
            </div>
          ))}
        </div>
      </div>
      
      {analytics.hasMultipleBrands && (
        <div className="bg-white p-4 border border-gray-200 rounded-lg mb-5">
          <h4 className="mb-3 text-gray-800 text-sm font-semibold">Brand Composition</h4>
          <div className="space-y-2">
            {Object.entries(analytics.brandComposition)
              .sort((a, b) => b[1] - a[1])
              .map(([brand, count]) => (
                <div key={brand} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-800">{brand}</span>
                  <span className="text-sm font-semibold text-red-600">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {analytics.dcAnalytics && (
        <div className="bg-white p-4 border border-gray-200 rounded-lg">
          <h4 className="mb-3 text-gray-800 text-sm font-semibold">Distribution Center Coverage</h4>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-gray-100 rounded-md">
              <div className="text-xl font-bold text-blue-500">{analytics.dcAnalytics.avgStoresPerDC}</div>
              <div className="text-xs text-gray-600 mt-1">Avg Served</div>
            </div>
            <div className="text-center p-3 bg-gray-100 rounded-md">
              <div className="text-xl font-bold text-green-500">{analytics.dcAnalytics.maxStores}</div>
              <div className="text-xs text-gray-600 mt-1">Best DC</div>
            </div>
            <div className="text-center p-3 bg-gray-100 rounded-md">
              <div className="text-xl font-bold text-orange-500">{analytics.dcAnalytics.minStores}</div>
              <div className="text-xs text-gray-600 mt-1">Min Served</div>
            </div>
          </div>
          {analytics.dcAnalytics.reach > 0 && (
            <div className="bg-blue-50 p-3 rounded-md mb-4 border-l-4 border-blue-500">
              <div className="text-xs text-gray-600 mb-1">Average DC Reach</div>
              <div className="text-2xl font-bold text-blue-500">{analytics.dcAnalytics.reach.toFixed(1)} km</div>
              <div className="text-xs text-gray-600 mt-1">This is the average reach of this brand&apos;s DCs</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
