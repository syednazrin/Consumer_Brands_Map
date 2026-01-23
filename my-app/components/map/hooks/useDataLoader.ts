import { useState, useEffect, useCallback } from 'react';
import { loadStoreGeoJSON, loadDistributionCenters, loadDistrictData, GeoJSONCollection } from '../utils/dataLoader';
import { CATEGORIES } from '../utils/config';

export function useDataLoader() {
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [districtData, setDistrictData] = useState<GeoJSONCollection | null>(null);
  const [storeData, setStoreData] = useState<GeoJSONCollection | null>(null);
  const [dcData, setDcData] = useState<GeoJSONCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);

  // Load categories from API
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    }
    fetchCategories();
  }, []);

  // Load district data on mount
  useEffect(() => {
    async function fetchDistrictData() {
      try {
        const data = await loadDistrictData();
        setDistrictData(data);
      } catch (err) {
        console.error('Error loading district data:', err);
        setError('Failed to load district data');
      } finally {
        setLoading(false);
      }
    }
    fetchDistrictData();
  }, []);

  const loadCategoryData = useCallback(async (category: string | null) => {
    if (!category) {
      // Clear data when no category selected
      setStoreData({ type: 'FeatureCollection', features: [] });
      setDcData(null);
      setCurrentCategory(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setCurrentCategory(category);
      console.log('Loading data for category:', category);
      
      const [stores, dcs] = await Promise.all([
        loadStoreGeoJSON(category),
        loadDistributionCenters(category)
      ]);
      
      console.log('Loaded stores:', stores.features.length);
      console.log('Loaded DCs:', dcs?.features.length || 0);
      
      setStoreData(stores);
      setDcData(dcs);
    } catch (err) {
      console.error('Error loading category data:', err);
      setError('Failed to load category data');
      setStoreData({ type: 'FeatureCollection', features: [] });
      setDcData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    categories,
    districtData,
    storeData,
    dcData,
    loading,
    error,
    loadCategoryData
  };
}
