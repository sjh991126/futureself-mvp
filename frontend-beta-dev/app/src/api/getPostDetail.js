import axios from 'axios';
import { API_BASE_URL, TokenManager } from '../config';

const normalizeCommentLikes = (comment) => {
  if (!comment || typeof comment !== 'object') return comment;

  return {
    ...comment,
    isLiked: typeof comment.isLiked === 'boolean'
      ? comment.isLiked
      : (typeof comment.liked === 'boolean' ? comment.liked : false),
    numberOfLikes: typeof comment.numberOfLikes === 'number'
      ? comment.numberOfLikes
      : (typeof comment.totalLikes === 'number'
        ? comment.totalLikes
        : (typeof comment.likeCount === 'number' ? comment.likeCount : 0)),
    replies: Array.isArray(comment.replies)
      ? comment.replies.map(normalizeCommentLikes)
      : [],
  };
};

export const getPostDetail = async (postId) => {
  try {
    console.log('Getting token...'); // Debug log
    const token = await TokenManager.getAccessToken();
    console.log('Token received:', token ? 'Yes' : 'No'); // Debug log

    console.log('Making API request to:', `${API_BASE_URL}/api/community/v1/posts/${postId}`); // Debug log
    
    const response = await axios.get(`${API_BASE_URL}/api/community/v1/posts/${postId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('API Response status:', response.status); // Debug log
    console.log('API Response data:', response.data); // Debug log

    const data = response.data || {};
    return {
      ...data,
      isLiked: typeof data.isLiked === 'boolean'
        ? data.isLiked
        : (typeof data.liked === 'boolean' ? data.liked : false),
      numberOfLikes: typeof data.numberOfLikes === 'number'
        ? data.numberOfLikes
        : (typeof data.totalLikes === 'number'
          ? data.totalLikes
          : (typeof data.likeCount === 'number' ? data.likeCount : 0)),
      comments: Array.isArray(data.comments)
        ? data.comments.map(normalizeCommentLikes)
        : [],
    };
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
      }
    });
    throw error;
  }
};
