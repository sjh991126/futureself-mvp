import axios from 'axios';
import api, { API_BASE_URL, TokenManager } from '.././config';

// Main API function - fetches both tripLists and places in one call
export const getCategoryContent = async (categoryId) => {
  const startTime = Date.now();

  try {
    console.log(`[PERF] Fetching category content for category ${categoryId}`);
    const response = await api.get(`/api/categories/v1/${categoryId}/content`, {

    });

    // Transform data to match expected format
    const transformedData = {
      places: response.data.places.map(place => ({
        ...place,
        imageUrls: place.thumbnailUrl ? [place.thumbnailUrl] : [],
        googleid: place.id,
        view_counts: 0,
        created_at: new Date().toISOString(),
      })),
      tripLists: response.data.tripLists.map(tripList => ({
        ...tripList,
        view_counts: 0,
        created_at: new Date().toISOString(),
      }))
    };

    console.log(`[PERF] Fetched ${transformedData.places.length} places, ${transformedData.tripLists.length} tripLists in ${Date.now() - startTime}ms`);
    return transformedData;
  } catch (error) {
    console.error('Error getting category content:', error);
    console.error('Error response:', error.response?.data);
    throw error;
  }
};

// Deprecated - kept for backward compatibility
export const categoryTriplists = async (id) => {
  const content = await getCategoryContent(id);
  return content.tripLists;
};

export const categoryPlaces = async (id) => {
  const content = await getCategoryContent(id);
  return content.places;
};

// Prefetch data for a specific category
export const prefetchCategoryData = async (id) => {
  try {
    return await getCategoryContent(id);
  } catch (error) {
    console.error('Error prefetching category data', error);
    throw error;
  }
};

// Dummy functions to maintain compatibility
export const isCategoryDataCached = (id) => {
  return false; // No caching
};

export const preloadAllCategoriesData = async (categoryIds) => {
  // No preloading without cache
  console.log('Preloading disabled - no caching');
};

export const initializeCache = async () => {
  // No cache to initialize
  return false;
};

export const resetCache = async () => {
  // No cache to reset
  return true;
};
