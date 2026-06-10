import api from '../config';
import { endpoints } from './endpoints';

const normalizePlaceSearchResponse = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.places)) {
    return payload.places;
  }

  if (Array.isArray(payload?.content)) {
    return payload.content;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
};

export const searchGooglePlaces = async (textQuery) => {
  try {
    const response = await api.post(endpoints.places('/query'), {
      query: textQuery,
    });
    const normalizedResults = normalizePlaceSearchResponse(response.data);
    console.log('Backend API response:', response.data);
    console.log('Normalized place search results:', normalizedResults.length);
    return normalizedResults;
  } catch (error) {
    console.error('Error searching places:', error);
    throw error;
  }
};

export const fetchPlacesByIds = async (ids) => {
  try {
    const response = await api.get(`/api/places/v1?ids=${ids.join(',')}`);
    console.log('Places by IDs API response:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('Backend error response:', error.response.data); // Log backend error response
    } else if (error.request) {
      console.error('Error request:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    console.error('Error config:', error.config);
    throw error;
  }
};
