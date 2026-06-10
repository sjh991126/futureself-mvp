import axios from 'axios';
import api, { API_BASE_URL } from '.././config'; 
import { endpoints } from './endpoints';

const API_URL = `${API_BASE_URL}${endpoints.places()}`;
const API_URL_T100 = endpoints.places('/marker1');

// 기존 함수들
export const loadPlaces = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    console.error('Error getting places', error);
    throw error;
  }
};

export const load100Places = async () => {
  try {
    const response = await api.get(API_URL_T100);
    return response.data;
  } catch (error) {
    console.error('Error getting places', error);
    throw error;
  }
};

export const getPlaceDetail = async (googleId) => {
  try {
    const response = await api.get(endpoints.places(`/${googleId}`));
    return response.data;
  } catch (error) {
    console.error('Error getting place detail:', error);
    throw error;
  }
};
