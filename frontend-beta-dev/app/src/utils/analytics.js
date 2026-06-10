// utils/analytics.js
import analytics from '@react-native-firebase/analytics';

export const logEvent = async (eventName, params = {}) => {
    try {
        await analytics().logEvent(eventName, params);
    } catch (error) {
        console.error('Analytics error:', error);
    }
};

export const setUserProperties = async (properties) => {
    try {
        await analytics().setUserProperties(properties);
    } catch (error) {
        console.error('Analytics error:', error);
    }
};

export const setUserId = async (userId) => {
    try {
        await analytics().setUserId(userId);
    } catch (error) {
        console.error('Analytics error:', error);
    }
};