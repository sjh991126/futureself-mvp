import { File } from 'expo-file-system';
import api, { API_BASE_URL, TokenManager } from '.././config';

export const uploadPostImage = async (imageUri) => {
    try {
        // 새로운 File API 사용
        const file = new File(imageUri);
        const fileSize = await file.size;

        const token = await TokenManager.getAccessToken();

        const formData = new FormData();
        formData.append('image', {
            uri: imageUri,
            name: `posts_${Date.now()}.jpg`,
            type: 'image/jpeg',
            size: fileSize,
        });

        const response = await api.post(`/api/posts/upload/image`, formData,
            {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const data = await response.json();
        return data.url;
    } catch (error) {
        console.error('Error in uploadPostImage:', error);
        throw error;
    }
};