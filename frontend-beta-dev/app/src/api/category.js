import api, { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/categories`;

export const fetchCategories = async () => {
    try {
        const response = await api.get(API_URL);
        return response.data;
    } catch (error) {
        console.error('Error fetching categories:', error.response ? error.response.data : error.message);
        throw error;
    }
};
