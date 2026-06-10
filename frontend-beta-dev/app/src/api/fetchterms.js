import api from '.././config'; 
import { endpoints } from './endpoints';

export const fetchTerms = async (tncNumber) => {
    try {
        const response = await api.get(endpoints.tnc(`/${tncNumber}`));
        const data = await response.data;
        console.log('fetchterms', data);
        return data;
    } catch (error) {
        console.error('Error fetching terms:', error);
        throw(error);
    }
};
