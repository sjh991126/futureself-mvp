import axios from 'axios';
import api, { API_BASE_URL } from '.././config'; 
const API_URL = `${API_BASE_URL}/api/search/v1`;

export const searchAll = async (query) => {
    console.log(`${API_URL}/query`);
  try {
    const response = await api.post(`${API_URL}/query`, {
      query: query
    }); 
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting r', error);
    throw error;
  }
};