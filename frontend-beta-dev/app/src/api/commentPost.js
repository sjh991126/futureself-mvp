import axios from 'axios';
import { API_BASE_URL, TokenManager } from '../config';

export const commentPost = async (postId, content, parentCommentId = null) => {
  try {
    const token = await TokenManager.getAccessToken();
    
    const response = await axios.post(
      `${API_BASE_URL}/api/community/v1/comments`,
      {
        postId,
        parentCommentId,
        content
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error posting comment:', error);
    throw error.response?.data || error.message;
  }
};
