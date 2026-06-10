import axios from 'axios';
import { API_BASE_URL, TokenManager } from '../config';
import { uploadMultipleImagesToS3, UPLOAD_TYPES } from './image';

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

export const deletePost = async (postId) => {
    try {
        const token = await TokenManager.getAccessToken();
        await axios.delete(`${API_BASE_URL}/api/community/v1/posts/${postId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (error) {
        console.error('Error deleting post:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        if (error.response?.status === 409) {
            throw new Error('Cannot delete post with existing likes. Please remove likes first.');
        }
        throw error;
    }
};

export const editPost = async (postId, postData) => {
    if (!postId) {
        throw new Error('Post ID is required');
    }

    try {
        console.log('Raw edit post data:', postData);
        
        let uploadedImageUrls = [];
        
        if (postData.images?.length > 0) {
            // 이미 업로드된 이미지와 새로 업로드해야 할 이미지 분리
            const alreadyUploadedImages = [];
            const needToUploadImages = [];
            
            postData.images.forEach(image => {
                const extractedUrl = extractImageUrl(image);
                if (isAlreadyUploaded(image)) {
                    alreadyUploadedImages.push(extractedUrl);
                } else if (extractedUrl) {
                    needToUploadImages.push(extractedUrl);
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
            
            console.log('Final uploaded image URLs for edit:', uploadedImageUrls);
        }

        const formattedData = {
            ...postData,
            images: uploadedImageUrls
        };

        console.log('EditPost API called with:', {
            postId,
            formattedData,
            url: `${API_BASE_URL}/api/community/v1/posts/${postId}`
        });

        const token = await TokenManager.getAccessToken();
        if (!token) {
            throw new Error('No authentication token available');
        }

        const response = await axios.put(
            `${API_BASE_URL}/api/community/v1/posts/${postId}`,
            formattedData,
            {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Edit post response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error in editPost:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            config: error.config
        });
        throw error;
    }
};
