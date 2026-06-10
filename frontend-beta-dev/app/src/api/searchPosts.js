import axios from 'axios';
import { API_BASE_URL, TokenManager } from '../config';

const API_URL = `${API_BASE_URL}/api/search/v1/posts`;

export const searchPosts = async (keyword) => {
  try {
    let token = await TokenManager.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    console.log('Search Debug - Token:', token.substring(0, 10) + '...');
    console.log('Search Debug - API_BASE_URL:', API_BASE_URL);

    const encodedKeyword = encodeURIComponent(keyword.trim());
    const url = `${API_URL}?keyword=${encodedKeyword}`;

    console.log('Search Debug - Request Details:', {
      baseUrl: API_BASE_URL,
      fullUrl: url,
      encodedKeyword,
      originalKeyword: keyword
    });

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log('Search Debug - Response:', {
      status: response.status,
      headers: response.headers,
      data: response.data
    });

    if (!response.data || !Array.isArray(response.data.content)) {
      throw new Error('Invalid response format from server');
    }

    return response.data.content.map(post => ({
      id: post.id.toString(),
      userId: post.user.userId,
      userName: post.user.userName,
      userImage: post.user.imageUrl,
      location: post.location || '',
      title: post.title || '',
      content: post.content || '',
      topic: post.topic || 'General',
      numberOfLikes: post.numberOfLikes || 0,
      numberOfComments: (post.comments?.length || 0) + (post.comments?.reduce((sum, comment) => sum + (comment.replies?.length || 0), 0) || 0),
      datetime: post.datetime || new Date().toISOString(),
      images: post.images || [],
    }));

  } catch (error) {
    console.error('Search Posts Error Details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        baseURL: error.config?.baseURL,
      }
    });
    throw error;
  }
};
