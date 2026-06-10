import axios from 'axios';
import { API_BASE_URL, TokenManager } from '../config';

const inFlightPostLikes = new Map();

const normalizePostId = (postId) => {
  if (postId === null || postId === undefined) return '';
  return String(postId).trim();
};

export const likePost = async (postId) => {
  const normalizedPostId = normalizePostId(postId);
  if (!normalizedPostId) {
    throw new Error('Invalid post id for like');
  }

  if (inFlightPostLikes.has(normalizedPostId)) {
    return inFlightPostLikes.get(normalizedPostId);
  }

  const requestPromise = (async () => {
  try {
    const token = await TokenManager.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await axios.post(
      `${API_BASE_URL}/api/community/v1/posts/${normalizedPostId}/like`,
      {},  // empty body for POST request
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data || {};
    return {
      liked: typeof data.liked === 'boolean'
        ? data.liked
        : (typeof data.isLiked === 'boolean' ? data.isLiked : undefined),
      totalLikes: typeof data.totalLikes === 'number'
        ? data.totalLikes
        : (typeof data.numberOfLikes === 'number'
          ? data.numberOfLikes
          : (typeof data.likeCount === 'number' ? data.likeCount : undefined)),
      raw: data,
    };
  } catch (error) {
    console.error('Error liking post:', error);
    throw error;
  }
  })();

  inFlightPostLikes.set(normalizedPostId, requestPromise);
  try {
    return await requestPromise;
  } finally {
    inFlightPostLikes.delete(normalizedPostId);
  }
};
