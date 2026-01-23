'use client';

import { useMemo } from 'react';
import { GeoJSONCollection, GeoJSONFeature } from '../utils/dataLoader';
import { DC_CATEGORIES, getBrandColor } from '../utils/config';
import {
  getBrandComposition,
  groupByGeography,
  analyzeDCCatchment,
  getDistanceDistribution,
  calculateConcentration
} from '../utils/analyticsUtils';

interface AnalyticsPanelProps {
  storeData: GeoJSONCollection | null;
  dcData: GeoJSONCollection | null;
  districtData: GeoJSONCollection | null;
  currentCategory: string | null;
}

interface DensityData {
  district: string;
  state: string;
  stores: number;
  population: number;
  density: number;
}

interface WhiteSpaceData {
  district: string;
  state: string;
  population: number;
  currentStores: number;
  opportunityScore: number;
}

// Simplified density calculation (without spatial containment)
function calculateDensity(stores: GeoJSONFeature[], districtData: GeoJSONCollection | null): DensityData[] {
  if (!stores || !districtData || !districtData.features) {
    return [];
  }

  const districtCounts = groupByGeography(stores, 'District');
  const densityData: DensityData[] = [];

  districtData.features.forEach(feature => {
    const districtName = feature.properties.name;
    const population = feature.properties['Population (k)'];
    const storeCount = districtCounts[districtName] || 0;

    if (population && population > 0) {
      const density = (storeCount / population) * 100; // stores per 100k population
      densityData.push({
        district: districtName,
        state: feature.properties.state || 'Unknown',
        stores: storeCount,
        population: population,
        density: density
      });
    }
  });

  return densityData.sort((a, b) => b.density - a.density);
}

// Simplified white space identification
function identifyWhiteSpace(
  stores: GeoJSONFeature[],
  districtData: GeoJSONCollection | null,
  threshold: number = 50
): WhiteSpaceData[] {
  if (!stores || !districtData || !districtData.features) {
    return [];
  }

  const districtCounts = groupByGeography(stores, 'District');
  const whiteSpace: WhiteSpaceData[] = [];

  districtData.features.forEach(feature => {
    const districtName = feature.properties.name;
    const population = feature.properties['Population (k)'];
    const storeCount = districtCounts[districtName] || 0;

    // Criteria: high population but few stores
    if (population && population >= threshold && storeCount < 3) {
      const opportunityScore = Math.round(population / Math.max(storeCount, 1));
      whiteSpace.push({
        district: districtName,
        state: feature.properties.state || 'Unknown',
        population: population,
        currentStores: storeCount,
        opportunityScore: opportunityScore
      });
    }
  });

  return whiteSpace.sort((a, b) => b.opportunityScore - a.opportunityScore);
}

// Generate strategic insights
function generateInsights(
  stateCounts: Record<string, number>,
  brandComposition: Record<string, number>,
  dcCatchment: ReturnType<typeof analyzeDCCatchment>,
  distanceDistribution: ReturnType<typeof getDistanceDistribution>,
  whiteSpace: WhiteSpaceData[],
  densityData: DensityData[]
): string[] {
  const insights: string[] = [];

  // Market concentration insight
  if (stateCounts) {
    const totalStores = Object.values(stateCounts).reduce((a, b) => a + b, 0);
    const sortedStates = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);
    const top3Count = sortedStates.slice(0, 3).reduce((sum, [, count]) => sum + count, 0);
    const concentration = totalStores > 0 ? (top3Count / totalStores) * 100 : 0;
    
    if (concentration > 60) {
      insights.push(`High concentration: ${concentration.toFixed(0)}% of stores in top 3 states`);
    } else if (concentration < 40) {
      insights.push(`Well-distributed: Stores spread across ${sortedStates.length} states`);
    }
  }

  // DC coverage insight
  if (dcCatchment && dcCatchment.length > 0) {
    const topDC = dcCatchment[0];
    insights.push(`Strongest DC presence in ${topDC.dcState} serving ${topDC.storesServed} stores`);
    
    if (distanceDistribution && distanceDistribution.percentWithin25km) {
      const percent = distanceDistribution.percentWithin25km.toFixed(0);
      insights.push(`${percent}% of stores within 25km of a distribution center`);
    }
  }

  // White space insight
  if (whiteSpace && whiteSpace.length > 0) {
    insights.push(`${whiteSpace.length} high-potential expansion opportunities identified`);
    if (whiteSpace[0]) {
      insights.push(`Top opportunity: ${whiteSpace[0].district} (population: ${whiteSpace[0].population}k)`);
    }
  }

  // Brand leader insight
  if (brandComposition) {
    const brands = Object.entries(brandComposition).sort((a, b) => b[1] - a[1]);
    if (brands.length > 1) {
      const leader = brands[0];
      const totalStores = brands.reduce((sum, [, count]) => sum + count, 0);
      const share = totalStores > 0 ? (leader[1] / totalStores) * 100 : 0;
      insights.push(`Brand leader: ${leader[0]} accounts for ${share.toFixed(0)}% of stores`);
    }
  }

  // Density insight
  if (densityData && densityData.length > 0) {
    const topDensity = densityData[0];
    insights.push(`Highest density: ${topDensity.district} (${topDensity.density.toFixed(1)} stores per 100k population)`);
  }

  return insights;
}

export default function AnalyticsPanel({
  storeData,
  dcData,
  districtData,
  currentCategory
}: AnalyticsPanelProps) {
  const analytics = useMemo(() => {
    if (!storeData || !storeData.features || storeData.features.length === 0) {
      return null;
    }

    const stores = storeData.features;
    const hasDC = currentCategory ? DC_CATEGORIES.includes(currentCategory) : false;
    
    // Brand composition
    const brandComposition = getBrandComposition(stores);
    const hasMultipleBrands = Object.keys(brandComposition).length > 1;
    
    // Calculate spatial analytics
    const densityData = calculateDensity(stores, districtData);
    const topDensity = densityData.slice(0, 5);
    const lowDensity = densityData.slice(-5).reverse();
    
    // White space analysis
    const whiteSpace = identifyWhiteSpace(stores, districtData, 50);
    const topOpportunities = whiteSpace.slice(0, 10);
    
    // DC catchment analysis
    let dcCatchment = null;
    let dcDistanceDistribution = null;
    if (hasDC && dcData && dcData.features.length > 0) {
      dcCatchment = analyzeDCCatchment(stores, dcData.features);
      dcDistanceDistribution = getDistanceDistribution(stores, dcData.features);
    }
    
    // State counts for concentration
    const stateCounts = groupByGeography(stores, 'State');
    const concentration = calculateConcentration(stateCounts);
    
    // Generate insights
    const insights = generateInsights(
      stateCounts,
      brandComposition,
      dcCatchment,
      dcDistanceDistribution,
      whiteSpace,
      densityData
    );

    return {
      hasMultipleBrands,
      brandComposition,
      densityData,
      topDensity,
      lowDensity,
      whiteSpace,
      topOpportunities,
      dcCatchment,
      dcDistanceDistribution,
      concentration,
      insights
    };
  }, [storeData, dcData, districtData, currentCategory]);

  if (!analytics) {
    return (
      <div className="text-center py-5 text-gray-600">Please select a category first</div>
    );
  }

  return (
    <div className="p-4 overflow-y-auto max-h-[calc(100vh-450px)]">
      <h3 className="text-red-600 mb-4 text-base font-semibold">Strategic Analytics</h3>
      
      {/* Strategic Insights */}
      {analytics.insights.length > 0 && (
        <div className="bg-yellow-50 p-3 border-l-4 border-red-600 rounded mb-4">
          <h4 className="mb-2 text-gray-800 text-sm font-semibold">Key Insights</h4>
          {analytics.insights.map((insight, idx) => (
            <div key={idx} className="text-xs text-gray-700 mb-1.5 pl-2">
              • {insight}
            </div>
          ))}
        </div>
      )}
      
      {/* Spatial Analytics */}
      <div className="bg-white p-3 border border-gray-200 rounded-lg mb-4">
        <h4 className="mb-2.5 text-gray-800 text-sm font-semibold">Store Density Analysis</h4>
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1.5">
            Market Concentration: <strong>{analytics.concentration.level}</strong> (Gini: {analytics.concentration.gini})
          </div>
        </div>
        
        {analytics.densityData.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-green-600 mb-1.5">Top 5 Density</div>
              {analytics.topDensity.map((d, idx) => (
                <div key={idx} className="text-xs py-1 border-b border-gray-100">
                  <div className="font-semibold text-gray-800">{d.district}</div>
                  <div className="text-gray-600">{d.density.toFixed(1)} stores/100k pop</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs font-semibold text-orange-500 mb-1.5">Lowest 5 Density</div>
              {analytics.lowDensity.map((d, idx) => (
                <div key={idx} className="text-xs py-1 border-b border-gray-100">
                  <div className="font-semibold text-gray-800">{d.district}</div>
                  <div className="text-gray-600">{d.density.toFixed(1)} stores/100k pop</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-500 text-center py-2">Population data not available</div>
        )}
      </div>
      
      {/* White Space Analysis */}
      {analytics.topOpportunities.length > 0 && (
        <div className="bg-white p-3 border border-gray-200 rounded-lg mb-4">
          <h4 className="mb-2.5 text-gray-800 text-sm font-semibold">Expansion Opportunities</h4>
          <div className="text-xs text-gray-600 mb-2.5">High-population districts with low store presence</div>
          <div className="max-h-[200px] overflow-y-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-gray-100">
                <tr className="border-b-2 border-gray-200">
                  <th className="p-1.5 text-left text-gray-600">District</th>
                  <th className="p-1.5 text-center text-gray-600">Pop (k)</th>
                  <th className="p-1.5 text-center text-gray-600">Stores</th>
                  <th className="p-1.5 text-center text-gray-600">Score</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topOpportunities.map((opp, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="p-1.5 text-gray-800">{opp.district}</td>
                    <td className="p-1.5 text-center">{opp.population}</td>
                    <td className="p-1.5 text-center">{opp.currentStores}</td>
                    <td className="p-1.5 text-center font-semibold text-red-600">{opp.opportunityScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* DC Catchment Analysis */}
      {analytics.dcCatchment && (
        <>
          <div className="bg-white p-3 border border-gray-200 rounded-lg mb-4">
            <h4 className="mb-2.5 text-gray-800 text-sm font-semibold">DC Catchment Performance</h4>
            <div className="max-h-[180px] overflow-y-auto mb-3">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-gray-100">
                  <tr className="border-b-2 border-gray-200">
                    <th className="p-1.5 text-left text-gray-600">DC Name</th>
                    <th className="p-1.5 text-center text-gray-600">Stores</th>
                    <th className="p-1.5 text-center text-gray-600">Avg Dist</th>
                    <th className="p-1.5 text-center text-gray-600">Max Dist</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.dcCatchment.map((dc, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="p-1.5 text-gray-800">{dc.dcName}</td>
                      <td className="p-1.5 text-center font-semibold text-blue-500">{dc.storesServed}</td>
                      <td className="p-1.5 text-center">{dc.avgDistance.toFixed(1)} km</td>
                      <td className="p-1.5 text-center">{dc.maxDistance.toFixed(1)} km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* DC Distance Distribution */}
          {analytics.dcDistanceDistribution && (
            <div className="bg-white p-3 border border-gray-200 rounded-lg mb-4">
              <h4 className="mb-2.5 text-gray-800 text-sm font-semibold">Store-to-DC Distance Distribution</h4>
              <div className="text-xs text-gray-600 space-y-1">
                {Object.entries(analytics.dcDistanceDistribution.distribution).map(([label, count]) => (
                  <div key={label} className="flex justify-between">
                    <span>{label}:</span>
                    <span className="font-semibold">{count} stores</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
