'use client';

import { useMemo } from 'react';
import { GeoJSONCollection } from '../utils/dataLoader';
import { getBrandColor } from '../utils/config';
import { getBrandComposition } from '../utils/analyticsUtils';

interface BrandLegendProps {
  storeData: GeoJSONCollection | null;
}

export default function BrandLegend({ storeData }: BrandLegendProps) {
  const brands = useMemo(() => {
    if (!storeData || !storeData.features || storeData.features.length === 0) {
      return [];
    }

    const brandComposition = getBrandComposition(storeData.features);
    const brandEntries = Object.entries(brandComposition)
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(([brand, count]) => ({
        brand,
        count,
        color: getBrandColor(brand)
      }));

    return brandEntries;
  }, [storeData]);

  if (brands.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-5 left-5 bg-white/95 p-3 rounded-lg border border-gray-200 shadow-lg z-[1000] min-w-[200px] max-w-[280px]">
      <div className="font-semibold mb-2.5 text-[0.95em] text-gray-800">Brands in View</div>
      <div className="space-y-2">
        {brands.map(({ brand, count, color }) => (
          <div key={brand} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0 border border-gray-300"
              style={{ backgroundColor: color }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-800 truncate">{brand}</div>
              <div className="text-xs text-gray-500">{count} {count === 1 ? 'store' : 'stores'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
