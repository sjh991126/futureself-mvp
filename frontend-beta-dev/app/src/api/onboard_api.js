import axios from 'axios';
import { API_BASE_URL, TokenManager } from '../config';

const API_URLS = {
    groupTypes: `${API_BASE_URL}/api/users/v1/signup/groupTypes/`,
    gender: `${API_BASE_URL}/api/users/v1/signup/gender/`,
    foodPrefs: `${API_BASE_URL}/api/users/v1/signup/foodPrefs/`,
    country: `${API_BASE_URL}/api/users/v1/signup/country/`,
    hobbies: `${API_BASE_URL}/api/users/v1/signup/hobbies/`,
    birthday: `${API_BASE_URL}/api/users/v1/signup/birthday/`
};

// Generic function to handle POST requests with data in URL
const postDataWithUrl = async (baseUrl, data, isQueryParam = false) => {
    try {
        const token = await TokenManager.getAccessToken();
        
        // Determine URL format based on isQueryParam flag
        const url = isQueryParam 
            ? `${baseUrl}?${data}`
            : `${baseUrl}${encodeURIComponent(data)}`;
        
        console.log(`Request URL: ${url}`);
        console.log(`Request Headers:`, {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        const response = await axios.post(url, null, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });

        console.log(`Response Status: ${response.status}`);
        console.log(`Response Data:`, response.data);
        return response.data;
    } catch (error) {
        if (error.response) {
            console.error(`Error Status: ${error.response.status}`);
            console.error(`Error Data:`, error.response.data);
        } else {
            console.error(`Error Message: ${error.message}`);
        }
        throw error;
    }
};

export const onboardGroupTypes = async (groupTypesString) => {
    return await postDataWithUrl(API_URLS.groupTypes, `groupTypes=${groupTypesString}`, true);
};

export const onboardGender = async (genderString) => {
    return await postDataWithUrl(API_URLS.gender, genderString);
};

export const onboardFoodPrefs = async (foodPrefsString) => {
    return await postDataWithUrl(API_URLS.foodPrefs, `foodPrefs=${foodPrefsString}`, true);
};

export const onboardCountry = async (countryString) => {
    return await postDataWithUrl(API_URLS.country, countryString);
};

export const onboardHobbies = async (hobbiesString) => {
    return await postDataWithUrl(API_URLS.hobbies, `hobbies=${hobbiesString}`, true);
};

export const onboardBirthday = async (birthdayString) => {
    return await postDataWithUrl(API_URLS.birthday, birthdayString);
};
