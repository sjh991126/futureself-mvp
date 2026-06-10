import AWS from 'aws-sdk';
import { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } from '@env';
import { resetCache } from './category_triplists';

const S3_BUCKET = 'trippy-s3-bucket';
const REGION = 'ap-southeast-1';

AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: REGION,
});

const s3 = new AWS.S3();

export const placeViewS3 = async (newLog) => {
    const logFileKey = 'logs/trippy100Logs/logs.json'; // Updated folder path
    try {
        console.log('Attempting to upload view data')
        // Fetch the existing file content
        let existingLogs = [];
        try {
            const data = await s3.getObject({ Bucket: S3_BUCKET, Key: logFileKey }).promise();
            existingLogs = JSON.parse(data.Body.toString('utf-8'));
        } catch (error) {
            if (error.code !== 'NoSuchKey') {
                throw error;
            }
        }

        // Append the new log data
        existingLogs.push(newLog);

        // Upload the updated content back to S3
        const params = {
            Bucket: S3_BUCKET,
            Key: logFileKey,
            Body: JSON.stringify(existingLogs),
            ContentType: 'application/json',
        };

        await s3.upload(params).promise();
        console.log('View data uploaded successfully');
    } catch (error) {
        console.error('Error uploading view data:', error);
    }
};

export const logPlaceSearch = async (userId, itemId, itemName, searchQuery, itemType) => {
    const date = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    const searchLog = {
        userId,
        itemId,
        itemName,
        searchQuery,
        itemType,
        timestamp: new Date().toISOString(),
    };
    const logFileKey = `logs/placeSearchLogs/${date}.json`; // Updated folder path

    try {
        let existingLogs = [];
        try {
            const data = await s3.getObject({ Bucket: S3_BUCKET, Key: logFileKey }).promise();
            existingLogs = JSON.parse(data.Body.toString('utf-8'));
        } catch (error) {
            if (error.code !== 'NoSuchKey') {
                throw error;
            }
        }

        existingLogs.push(searchLog);

        const params = {
            Bucket: S3_BUCKET,
            Key: logFileKey,
            Body: JSON.stringify(existingLogs),
            ContentType: 'application/json',
        };

        await s3.upload(params).promise();
        console.log('Place search logged successfully');
    } catch (error) {
        console.error('Error logging place search:', error);
    }
};

export const logUserActivity = async (userId, location) => {
    const date = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    const activityLog = {
        userId,
        location,
        timestamp: new Date().toISOString(),
    };
    const logFileKey = `logs/activityLogs/${date}.json`; // Updated folder path

    try {
        let existingLogs = [];
        try {
            const data = await s3.getObject({ Bucket: S3_BUCKET, Key: logFileKey }).promise();
            existingLogs = JSON.parse(data.Body.toString('utf-8'));
        } catch (error) {
            if (error.code !== 'NoSuchKey') {
                throw error;
            }
        }

        existingLogs.push(activityLog);

        const params = {
            Bucket: S3_BUCKET,
            Key: logFileKey,
            Body: JSON.stringify(existingLogs),
            ContentType: 'application/json',
        };

        await s3.upload(params).promise();
        console.log('User activity logged successfully');
    } catch (error) {
        console.error('Error logging user activity:', error);
    }
};

export const logAppExit = async (userId, location, lastUsedFeature) => {
    const date = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    const exitLog = {
        userId,
        location,
        lastUsedFeature,
        timestamp: new Date().toISOString(),
    };
    const logFileKey = `logs/appExitLogs/${date}.json`; // Updated folder path

    try {
        let existingLogs = [];
        try {
            const data = await s3.getObject({ Bucket: S3_BUCKET, Key: logFileKey }).promise();
            existingLogs = JSON.parse(data.Body.toString('utf-8'));
        } catch (error) {
            if (error.code !== 'NoSuchKey') {
                throw error;
            }
        }

        existingLogs.push(exitLog);

        const params = {
            Bucket: S3_BUCKET,
            Key: logFileKey,
            Body: JSON.stringify(existingLogs),
            ContentType: 'application/json',
        };

        await s3.upload(params).promise();
        console.log('App exit logged successfully');
        
        // Reset the categories cache when app exits
        // This will help with testing by ensuring fresh data on next app start
        try {
            await resetCache();
            console.log('Categories cache reset on app exit');
        } catch (cacheError) {
            console.error('Error resetting categories cache:', cacheError);
        }
    } catch (error) {
        console.error('Error logging app exit:', error);
    }
};

export const logChatInteraction = async (userId, sendMessage, receiveMessage) => {
    const date = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    const interactionLog = {
        userId,
        sendMessage,
        receiveMessage,
        timestamp: new Date().toISOString(),
    };
    const logFileKey = `logs/chatLogs/${date}.json`; // Updated folder path

    try {
        let existingLogs = [];
        try {
            const data = await s3.getObject({ Bucket: S3_BUCKET, Key: logFileKey }).promise();
            existingLogs = JSON.parse(data.Body.toString('utf-8'));
        } catch (error) {
            if (error.code !== 'NoSuchKey') {
                throw error;
            }
        }

        existingLogs.push(interactionLog);

        const params = {
            Bucket: S3_BUCKET,
            Key: logFileKey,
            Body: JSON.stringify(existingLogs),
            ContentType: 'application/json',
        };

        await s3.upload(params).promise();
        console.log('Chat interaction logged successfully');
    } catch (error) {
        console.error('Error logging chat interaction:', error);
    }
};

export const logCategoryInteraction = async (userId, categoryId) => {
    const date = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    const interactionLog = {
        userId,
        categoryId,
        timestamp: new Date().toISOString(),
    };
    const logFileKey = `logs/categoryLogs/${date}.json`; // Updated folder path

    try {
        let existingLogs = [];
        try {
            const data = await s3.getObject({ Bucket: S3_BUCKET, Key: logFileKey }).promise();
            existingLogs = JSON.parse(data.Body.toString('utf-8'));
        } catch (error) {
            if (error.code !== 'NoSuchKey') {
                throw error;
            }
        }

        existingLogs.push(interactionLog);

        const params = {
            Bucket: S3_BUCKET,
            Key: logFileKey,
            Body: JSON.stringify(existingLogs),
            ContentType: 'application/json',
        };

        await s3.upload(params).promise();
        console.log('Category interaction logged successfully');
    } catch (error) {
        console.error('Error logging category interaction:', error);
    }
};