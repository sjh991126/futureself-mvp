import api from '../config';
import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

export const UPLOAD_TYPES = {
    PROFILE: 'profile',
    TRIPLIST: 'triplist',
    POST: 'post',
    REVIEW: 'review',
    CHAT: 'chat',
    HIGHLIGHT: 'highlight'
};

const sanitizeImageUri = (imageUri) => {
    if (typeof imageUri === 'object' && imageUri !== null) {
        if (imageUri.imageUrl) {
            return imageUri.imageUrl;
        }
        if (imageUri.uri) {
            return imageUri.uri;
        }
    }

    if (typeof imageUri === 'string') {
        return imageUri;
    }

    throw new Error('Invalid image URI format');
};

const isAlreadyUploaded = (uri) => {
    return uri && (uri.startsWith('http://') || uri.startsWith('https://'));
};

const ensureJpegUploadUri = async (uri) => {
    if (isAlreadyUploaded(uri)) {
        return uri;
    }

    try {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
            uri,
            [],
            {
                compress: 0.8,
                format: ImageManipulator.SaveFormat.JPEG,
            }
        );

        return manipulatedImage.uri;
    } catch (error) {
        console.error('Failed to normalize image to JPEG before upload:', error);
        throw error;
    }
};

export const uploadImageToS3 = async (imageUri, uploadType) => {
    try {
        const sanitizedUri = sanitizeImageUri(imageUri);

        if (isAlreadyUploaded(sanitizedUri)) {
            console.log('Image already uploaded, returning existing URL:', sanitizedUri);
            return sanitizedUri;
        }

        const normalizedUploadUri = await ensureJpegUploadUri(sanitizedUri);

        // 새로운 File API 사용
        const file = new File(normalizedUploadUri);
        const fileSize = await file.size;

        const formData = new FormData();
        formData.append('file', {
            uri: normalizedUploadUri,
            name: `${uploadType}_${Date.now()}.jpg`,
            type: 'image/jpeg',
            size: fileSize,
        });

        const response = await api.post(`/api/images/v1/upload/${uploadType}`, formData, {
            skipAuth: true,
            skipAuthRedirect: true,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        console.log('Upload successful, response data:', response.data);
        return await response.data;
    } catch (error) {
        console.error('Error in uploadImageToS3:', error);

        if (error.response) {
            console.error('Server responded with:', error.response.status, error.response.data);
        }

        throw error;
    }
};

// 나머지 함수들은 동일
export const uploadMultipleImagesToS3 = async (imageUris, uploadType = UPLOAD_TYPES.POST) => {
    try {
        const results = [];

        for (let i = 0; i < imageUris.length; i++) {
            const sanitizedUri = sanitizeImageUri(imageUris[i]);

            if (isAlreadyUploaded(sanitizedUri)) {
                console.log(`Image ${i} already uploaded, using existing URL:`, sanitizedUri);
                results.push(sanitizedUri);
                continue;
            }

            const uploadedUrl = await uploadImageToS3(sanitizedUri, uploadType);
            results.push(uploadedUrl);
        }

        return results;
    } catch (error) {
        console.error('Error in uploadMultipleImagesToS3:', error);
        throw error;
    }
};

export const uploadProfileImage = (imageUri) => uploadImageToS3(imageUri, UPLOAD_TYPES.PROFILE);
export const uploadPostImages = (imageUris) => uploadMultipleImagesToS3(imageUris, UPLOAD_TYPES.POST);
export const uploadReviewImages = (imageUris) => uploadMultipleImagesToS3(imageUris, UPLOAD_TYPES.REVIEW);
