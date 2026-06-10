import axios from 'axios';
import api, { API_BASE_URL, TokenManager } from '../config';
import { uploadMultipleImagesToS3, UPLOAD_TYPES } from './image';
import { incrementUserPoints } from './userPoints';

const API_URL = `/api/community/v1/posts`;

// 이미지가 이미 업로드된 URL인지 확인하는 함수
const isAlreadyUploaded = (uri) => {
    if (typeof uri === 'object' && uri.imageUrl) {
        return uri.imageUrl.startsWith('http');
    }
    if (typeof uri === 'string') {
        return uri.startsWith('http');
    }
    return false;
};

// 이미지 URI에서 실제 URL을 추출하는 함수
const extractImageUrl = (imageData) => {
    if (typeof imageData === 'object' && imageData.imageUrl) {
        return imageData.imageUrl;
    }
    if (typeof imageData === 'string') {
        return imageData;
    }
    return null;
};

export const createNewPost = async (postData) => {
    try {
        console.log('Raw post data:', postData);
        
        let uploadedImageUrls = [];
        
        if (postData.images?.length > 0) {
            // 이미 업로드된 이미지와 새로 업로드해야 할 이미지 분리
            const alreadyUploadedImages = [];
            const needToUploadImages = [];
            
            postData.images.forEach(image => {
                if (isAlreadyUploaded(image)) {
                    alreadyUploadedImages.push(extractImageUrl(image));
                } else {
                    needToUploadImages.push(extractImageUrl(image));
                }
            });
            
            console.log('Already uploaded images:', alreadyUploadedImages);
            console.log('Need to upload images:', needToUploadImages);
            
            // 새로 업로드해야 할 이미지들만 업로드
            if (needToUploadImages.length > 0) {
                const newlyUploadedUrls = await uploadMultipleImagesToS3(needToUploadImages, UPLOAD_TYPES.POST);
                uploadedImageUrls = [...alreadyUploadedImages, ...newlyUploadedUrls];
            } else {
                uploadedImageUrls = alreadyUploadedImages;
            }
            
            console.log('Final uploaded image URLs:', uploadedImageUrls);
        }

        const formattedData = {
            ...postData,
            images: uploadedImageUrls
        };

        console.log('Formatted data being sent:', formattedData);
        
        const response = await api.post(API_URL, formattedData);

        console.log('API Response for new post:', response.data);
        
        // Award points after successful post upload
        try {
            await incrementUserPoints(10);
            console.log('Post upload points awarded: +10 points');
        } catch (pointsError) {
            console.warn('Points system not available, post uploaded successfully');
            // Don't throw here - post was successful, points update is secondary
        }
        
        return response.data;
    } catch (error) {
        console.error('Detailed API Error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            data: error.config?.data
        });
        
        // Throw a more user-friendly error message
        throw new Error(
            error.response?.data?.message || 
            error.message || 
            'Failed to create post. Please try again.'
        );
    }
};
