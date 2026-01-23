'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/map/main/Sidebar';
import BrandLegend from '@/components/map/main/BrandLegend';
import { useDataLoader } from '@/components/map/hooks/useDataLoader';

// Dynamically import Map component with SSR disabled to avoid hydration issues
const Map = dynamic(() => import('@/components/map/main'), {
  ssr: false,
  loading: () => <div className="w-full h-screen bg-gray-100" />
});

export default function Home() {
  const { categories, districtData, storeData, dcData, loadCategoryData, loading, error } = useDataLoader();
  
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [currentMetric, setCurrentMetric] = useState('Population (k)');
  const [currentViewMode, setCurrentViewMode] = useState('cluster');

  // Load category data when category changes
  useEffect(() => {
    loadCategoryData(currentCategory);
  }, [currentCategory, loadCategoryData]);

  // Calculate stats
  const storeCount = storeData?.features?.length || 0;
  const districtCount = districtData?.features?.length || 0;
  const dcCount = dcData?.features?.length || 0;

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden">
      {loading && !districtData && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-[2000]">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700 mb-2">Loading map data...</div>
            <div className="text-sm text-gray-500">Please wait</div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg z-[2000]">
          {error}
        </div>
      )}

      <Map
        districtData={districtData}
        storeData={storeData}
        dcData={dcData}
        currentMetric={currentMetric}
        currentViewMode={currentViewMode}
      />
      
      <Sidebar
        categories={categories}
        currentCategory={currentCategory}
        currentMetric={currentMetric}
        currentViewMode={currentViewMode}
        storeCount={storeCount}
        districtCount={districtCount}
        dcCount={dcCount}
        storeData={storeData}
        dcData={dcData}
        districtData={districtData}
        onCategoryChange={setCurrentCategory}
        onMetricChange={setCurrentMetric}
        onViewModeChange={setCurrentViewMode}
      />

      {/* Brand Legend - Fixed at top-right corner of map */}
      <BrandLegend storeData={storeData} />

      {/* District Metric Legend - Fixed at bottom-left corner of map */}
      {districtData && (
        <div className="fixed bottom-5 left-5 bg-white/95 p-4 rounded-lg border border-gray-200 shadow-lg z-[1000] min-w-[250px]">
          <div className="font-semibold mb-3 text-[0.95em]" id="legend-title">
            {currentMetric === 'Population (k)' ? 'Population (thousands)' :
             currentMetric === 'Income per capita' ? 'Income per Capita' :
             'Total Income (Billion RM)'}
          </div>
          <div className="flex h-5 rounded overflow-hidden mb-2">
            <div className="flex-1 bg-[#4ade80]"></div>
            <div className="flex-1 bg-[#facc15]"></div>
            <div className="flex-1 bg-[#fb923c]"></div>
            <div className="flex-1 bg-[#ef4444]"></div>
          </div>
          <div className="flex justify-between text-[0.8em] text-gray-600">
            <span id="legend-min">0</span>
            <span id="legend-max">100</span>
          </div>
        </div>
      )}
    </div>
  );
}
