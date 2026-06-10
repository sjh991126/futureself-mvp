import api, { API_BASE_URL, TokenManager } from '../config'; 

const LIKE_API_URL = `${API_BASE_URL}/api/like/v1/places`;
const inFlightLikeToggles = new Map();

const normalizeLikePlaceId = (googleId) => {
  if (googleId === null || googleId === undefined) return '';
  return String(googleId).trim();
};

// 장소 좋아요 토글
export const togglePlaceLike = async (googleId) => {
  const normalizedGoogleId = normalizeLikePlaceId(googleId);
  if (!normalizedGoogleId) {
    throw new Error('Invalid place id for like toggle');
  }

  // Global single-flight guard: same place ID cannot toggle concurrently.
  if (inFlightLikeToggles.has(normalizedGoogleId)) {
    return inFlightLikeToggles.get(normalizedGoogleId);
  }

  const requestPromise = (async () => {
  try {
    const response = await api.put(`/api/like/v1/places/${normalizedGoogleId}`, null);
    console.log(`Toggled like for ${normalizedGoogleId}:`, response.data);
    return response.data; // { liked: true, totalLikes: 42 }
  } catch (error) {
    console.error('Toggle Like Failed:', error);
    throw error;
  }
  })();

  inFlightLikeToggles.set(normalizedGoogleId, requestPromise);
  try {
    return await requestPromise;
  } finally {
    inFlightLikeToggles.delete(normalizedGoogleId);
  }
};

// 좋아요한 장소 목록 조회
export const getLikedPlaces = async (page = 0, size = 20, sort = 'createdAt,DESC') => {
  try {
    const token = await TokenManager.getAccessToken();
    const response = await api.get(`/api/like/v1/places?page=${page}&size=${size}&sort=${sort}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    console.log('Liked places fetched:', response.data);
    return response.data; 
  } catch (error) {
    console.error('Fetching liked places failed:', error);
    throw error;
  }
};
