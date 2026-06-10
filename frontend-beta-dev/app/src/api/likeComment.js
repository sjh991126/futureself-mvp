import axios from 'axios';
import { API_BASE_URL, TokenManager } from '../config';

export const likeComment = async (commentId) => {
  try {
    const token = await TokenManager.getAccessToken();
    const response = await axios.post(
      `${API_BASE_URL}/api/community/v1/comments/${commentId}/like`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
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
    console.error('Error liking comment:', error);
    throw error.response?.data || error.message;
  }
};
