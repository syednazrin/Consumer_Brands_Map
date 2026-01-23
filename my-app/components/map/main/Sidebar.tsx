'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DC_CATEGORIES } from '../utils/config';
import { useSidebarResize } from '../hooks/useSidebarResize';
import { GeoJSONCollection } from '../utils/dataLoader';
import { OverviewPanel, StoresPanel, AnalyticsPanel } from '../panels';

interface SidebarProps {
  categories: string[];
  currentCategory: string | null;
  currentMetric: string;
  currentViewMode: string;
  storeCount: number;
  districtCount: number;
  dcCount: number;
  storeData: GeoJSONCollection | null;
  dcData: GeoJSONCollection | null;
  districtData: GeoJSONCollection | null;
  onCategoryChange: (category: string) => void;
  onMetricChange: (metric: string) => void;
  onViewModeChange: (mode: string) => void;
}

export default function Sidebar({
  categories,
  currentCategory,
  currentMetric,
  currentViewMode,
  storeCount,
  districtCount,
  dcCount,
  storeData,
  dcData,
  districtData,
  onCategoryChange,
  onMetricChange,
  onViewModeChange
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const hasDC = currentCategory ? DC_CATEGORIES.includes(currentCategory) : false;
  const { sidebarRef, resizeHandleRef } = useSidebarResize();

  return (
    <div 
      ref={sidebarRef}
      className={`absolute top-5 right-5 w-[400px] min-w-[300px] max-w-[calc(100vw-40px)] max-h-[calc(100vh-40px)] bg-white border border-gray-200 flex flex-col z-[1000] rounded-xl overflow-hidden shadow-lg resize-x transition-none ${
        collapsed ? 'w-[60px] h-[60px]' : ''
      }`}
      id="sidebar"
    >
      <div 
        ref={resizeHandleRef} 
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-transparent z-10 hover:bg-red-500/10"
        id="resize-handle"
      ></div>
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <h1 className={`text-[1.4em] font-semibold m-0 text-red-600 ${collapsed ? 'hidden' : ''}`}>
            Store Locations Map
          </h1>
          <button 
            id="collapse-btn" 
            onClick={() => setCollapsed(!collapsed)} 
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="bg-gray-200 border border-gray-300 text-gray-800 cursor-pointer text-base font-bold px-2.5 py-1 rounded min-w-[30px] h-[30px] flex items-center justify-center transition-all hover:bg-gray-300"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        
        <div className={`flex-1 overflow-y-auto p-0 sidebar-scroll ${collapsed ? 'hidden' : ''}`}>
          <div className="mb-4">
            <label className="block font-semibold mb-1.5 text-gray-800 text-[0.9em]">Select Category</label>
            <select
              id="category-selector"
              value={currentCategory || ''}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-[0.9em] bg-white transition-colors hover:border-red-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
            >
              <option value="">-- Select a category --</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block font-semibold mb-1.5 text-gray-800 text-[0.9em]">District Metric (Choropleth)</label>
            <select
              id="metric-selector"
              value={currentMetric}
              onChange={(e) => onMetricChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-[0.9em] bg-white transition-colors hover:border-red-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
            >
              <option value="Population (k)">Population (thousands)</option>
              <option value="Income per capita">Income per Capita</option>
              <option value="Income">Total Income (Billion RM)</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block font-semibold mb-2 text-gray-800 text-[0.95em]">Store Display Mode</label>
            <div 
              className="grid gap-2" 
              style={{ gridTemplateColumns: hasDC ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)' }}
            >
              <button
                className={`p-2.5 border-2 rounded-md cursor-pointer text-[0.9em] font-medium transition-all ${
                  currentViewMode === 'cluster' 
                    ? 'bg-red-600 text-white border-red-600' 
                    : 'bg-white border-gray-300 hover:border-red-500 hover:bg-red-50'
                }`}
                data-mode="cluster"
                onClick={() => onViewModeChange('cluster')}
              >
                Cluster
              </button>
              <button
                className={`p-2.5 border-2 rounded-md cursor-pointer text-[0.9em] font-medium transition-all ${
                  currentViewMode === 'individual' 
                    ? 'bg-red-600 text-white border-red-600' 
                    : 'bg-white border-gray-300 hover:border-red-500 hover:bg-red-50'
                }`}
                data-mode="individual"
                onClick={() => onViewModeChange('individual')}
              >
                Individual
              </button>
              {hasDC && (
                <button
                  className={`p-2.5 border-2 rounded-md cursor-pointer text-[0.9em] font-medium transition-all ${
                    currentViewMode === 'sonar' 
                      ? 'bg-red-600 text-white border-red-600' 
                      : 'bg-white border-gray-300 hover:border-red-500 hover:bg-red-50'
                  }`}
                  data-mode="sonar"
                  onClick={() => onViewModeChange('sonar')}
                >
                  Sonar
                </button>
              )}
              <button
                className={`p-2.5 border-2 rounded-md cursor-pointer text-[0.9em] font-medium transition-all ${
                  currentViewMode === 'none' 
                    ? 'bg-red-600 text-white border-red-600' 
                    : 'bg-white border-gray-300 hover:border-red-500 hover:bg-red-50'
                }`}
                data-mode="none"
                onClick={() => onViewModeChange('none')}
              >
                None
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-gray-100 p-4 rounded-lg text-center border border-gray-200">
              <span className="text-[1.8em] font-bold text-red-600 block">{storeCount}</span>
              <span className="text-[0.85em] text-gray-600 mt-1 block">Total Stores</span>
            </div>
            <div className="bg-gray-100 p-4 rounded-lg text-center border border-gray-200">
              <span className="text-[1.8em] font-bold text-red-600 block">{districtCount}</span>
              <span className="text-[0.85em] text-gray-600 mt-1 block">Districts Covered</span>
            </div>
            {hasDC && (
              <div className="bg-gray-100 p-4 rounded-lg text-center border border-gray-200" id="dc-stat-card">
                <span className="text-[1.8em] font-bold text-red-600 block">{dcCount}</span>
                <span className="text-[0.85em] text-gray-600 mt-1 block">Number of DC&apos;s</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {!collapsed && (
        <>
          <div className="flex bg-gray-100 border-b border-gray-200">
            <button
              className={`flex-1 px-3 py-3 bg-transparent border-none cursor-pointer text-[0.9em] transition-all text-gray-600 hover:bg-gray-200 ${
                activeTab === 'overview' ? 'bg-white border-b-2 border-red-600 font-semibold text-red-600' : ''
              }`}
              data-tab="overview"
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`flex-1 px-3 py-3 bg-transparent border-none cursor-pointer text-[0.9em] transition-all text-gray-600 hover:bg-gray-200 ${
                activeTab === 'stores' ? 'bg-white border-b-2 border-red-600 font-semibold text-red-600' : ''
              }`}
              data-tab="stores"
              onClick={() => setActiveTab('stores')}
            >
              Stores
            </button>
            <button
              className={`flex-1 px-3 py-3 bg-transparent border-none cursor-pointer text-[0.9em] transition-all text-gray-600 hover:bg-gray-200 ${
                activeTab === 'analytics' ? 'bg-white border-b-2 border-red-600 font-semibold text-red-600' : ''
              }`}
              data-tab="analytics"
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto flex flex-col tab-scroll">
            {activeTab === 'overview' && (
              <OverviewPanel
                storeData={storeData}
                dcData={dcData}
                districtData={districtData}
                currentCategory={currentCategory}
              />
            )}
            
            {activeTab === 'stores' && (
              <StoresPanel
                storeData={storeData}
                dcData={dcData}
                currentCategory={currentCategory}
              />
            )}
            
            {activeTab === 'analytics' && (
              <AnalyticsPanel
                storeData={storeData}
                dcData={dcData}
                districtData={districtData}
                currentCategory={currentCategory}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
