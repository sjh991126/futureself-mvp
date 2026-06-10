import axios from 'axios';
import { API_BASE_URL } from '.././config'; 
const API_URL = `${API_BASE_URL}/api/v1/signup`;

export const signupUser = async (newUser) => {
  try {
    const response = await axios.post(API_URL, newUser);
    return response.data;
  } catch (error) {
    console.error('Error signing up the user', error);
    throw error;
  }
};
