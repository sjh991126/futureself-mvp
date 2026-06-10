import axios from 'axios';
import {API_BASE_URL, TokenManager} from './../config';
const API_URL = `${API_BASE_URL}/api/triplists/v1`;

export const updateTripList = async (tripDetails, type) => {
    const restructuredTripData = {
        ...tripDetails,
        imageUrl: tripDetails.imageUrl, // Ensure imageUrl is included
        itinerary: tripDetails.itinerary.map(day => ({
            places: day.places.map(place => place.id)
        }))
    };
    console.log('Original tripDetails:', tripDetails);
    console.log('Restructured tripDetails:', restructuredTripData);
    try {
        const token = await TokenManager.getAccessToken();

        let response; 

        if (type === 'add_place') {
            console.log('Sending request to:', API_URL);
            response = await axios.put(
                API_URL,
                tripDetails, // Use restructuredTripData to ensure the correct format
                {
                    headers: {
                        Authorization: 'Bearer ' + token, // Include the token in the header
                    },
                }
            );
        } else if (type === 'edit_triplist') {
            console.log('Sending request to:', API_URL);
            response = await axios.put(
                API_URL,
                restructuredTripData,
                {
                    headers: {
                        Authorization: 'Bearer ' + token, // Include the token in the header
                    },
                }
            );
        }

        console.log('Response status:', response.status);
        console.log('Response data:', response.data);

        if (response.status !== 200) { 
            throw new Error('Failed to update trip list');
        }
        return response.data; 
    } catch (error) {
        console.error('Error updating trip list:', error);
        throw error;
    }
};
