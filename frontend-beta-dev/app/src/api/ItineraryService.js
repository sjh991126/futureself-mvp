import axios from 'axios';
import { API_BASE_URL } from '.././config'; 
const API_URL = `${API_BASE_URL}/api/itineraries`;

export const getAllItineraries = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching itineraries', error);
    throw error;
  }
};

export const createItinerary = async (itinerary) => {
  try {
    const response = await axios.post(API_URL, itinerary);
    return response.data;
  } catch (error) {
    console.error('Error creating itinerary', error);
    throw error;
  }
};

export const updateItinerary = async (id, itinerary) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, itinerary);
    return response.data;
  } catch (error) {
    console.error('Error updating itinerary', error);
    throw error;
  }
};

export const deleteItinerary = async (id) => {
  try {
    await axios.delete(`${API_URL}/${id}`);
  } catch (error) {
    console.error('Error deleting itinerary', error);
    throw error;
  }
};

