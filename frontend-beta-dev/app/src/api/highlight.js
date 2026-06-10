import api, { API_BASE_URL, TokenManager } from '../config';
import { uploadImageToS3, UPLOAD_TYPES } from './image';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';

export const createHighlight = async (highlightData) => {
    console.log('=== createHighlight start ===');
    console.log('highlightData:', highlightData);

    try {
        console.log('Getting access token...');
        const token = await TokenManager.getAccessToken();
        console.log('Token retrieved successfully');

        console.log('Making POST request to /api/highlights/v1');
        const response = await api.post('/api/highlights/v1', highlightData);

        console.log('API response:', response.data);
        console.log('=== createHighlight success ===');

        return response.data;
    } catch (error) {
        console.error('=== createHighlight failed ===');
        console.error('Error:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        throw error;
    }
};

export const uploadHighlightMedia = async (highlightId, mediaFiles, tripListId) => {
    console.log('=== uploadHighlightMedia start ===');
    console.log('highlightId:', highlightId);
    console.log('tripListId:', tripListId);
    console.log('mediaFiles count:', mediaFiles.length);

    try {
        const token = await TokenManager.getAccessToken();
        const formData = new FormData();

        // tripListId 필수 파라미터 추가 (명세서 요구사항)
        formData.append('tripListId', tripListId.toString());

        // 미디어 파일들 처리
        for (let i = 0; i < mediaFiles.length; i++) {
            const mediaItem = mediaFiles[i];
            console.log(`Processing media ${i + 1}/${mediaFiles.length}:`, mediaItem);

            let processedUri = mediaItem.uri;

            // iOS photo library URI 처리
            if (mediaItem.uri.startsWith('ph://')) {
                if (mediaItem.mediaType === 'IMAGE') {
                    console.log('Converting photo library URI for image...');
                    const manipulatedImage = await ImageManipulator.manipulateAsync(
                        mediaItem.uri,
                        [],
                        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
                    );
                    processedUri = manipulatedImage.uri;
                } else if (mediaItem.mediaType === 'VIDEO') {
                    console.log('Converting photo library URI for video...');
                    const filename = `temp_video_${Date.now()}.mp4`;
                    const filepath = `${FileSystem.documentDirectory}${filename}`;

                    const asset = await MediaLibrary.getAssetInfoAsync(mediaItem.id);
                    if (asset.localUri) {
                        await FileSystem.copyAsync({
                            from: asset.localUri,
                            to: filepath
                        });
                        processedUri = filepath;
                    } else {
                        throw new Error('Unable to access video file');
                    }
                }
            }

            // 파일 정보 확인
            const fileInfo = await FileSystem.getInfoAsync(processedUri);
            if (!fileInfo.exists) {
                throw new Error(`File does not exist: ${processedUri}`);
            }

            // FormData에 파일 추가
            const fileName = mediaItem.mediaType === 'VIDEO' 
                ? `highlight_video_${Date.now()}_${i}.mp4`
                : `highlight_image_${Date.now()}_${i}.jpg`;

            const contentType = mediaItem.mediaType === 'VIDEO' ? 'video/mp4' : 'image/jpeg';

            formData.append('files', {
                uri: processedUri,
                name: fileName,
                type: contentType,
                size: fileInfo.size,
            });

            console.log(`File ${i + 1} prepared:`, { fileName, contentType, size: fileInfo.size });
        }

        const response = await api.post(`/api/media/v1/highlights/${highlightId}`, formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
            },
        });

        console.log('미디어 업로드 응답:', response.data);

        // 임시 파일들 정리
        for (const mediaItem of mediaFiles) {
            if (mediaItem.uri.startsWith('ph://')) {
                // 변환된 임시 파일들 삭제
                const tempFiles = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
                const tempVideoFiles = tempFiles.filter(file => file.startsWith('temp_video_'));
                for (const tempFile of tempVideoFiles) {
                    try {
                        await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${tempFile}`, { idempotent: true });
                    } catch (cleanupError) {
                        console.warn('Failed to cleanup temp file:', tempFile, cleanupError);
                    }
                }
            }
        }

        console.log('=== uploadHighlightMedia success ===');
        return response.data; // 업로드된 미디어 URL 배열 반환

    } catch (error) {
        console.error('=== uploadHighlightMedia failed ===');
        console.error('Error:', error);
        console.error('Error response:', error.response?.data);
        throw error;
    }
};

export const createHighlightWithMedia = async (placeName, tripListId, isPublic, mediaFiles) => {
    console.log('=== createHighlightWithMedia start ===');

    try {
        // 1단계: 빈 highlight 생성
        console.log('Step 1: Creating empty highlight...');
        const highlightData = {
            placeName,
            tripListId,
            isPublic,
            mediaItems: [] // 빈 배열로 시작
        };

        const createdHighlight = await createHighlight(highlightData);
        console.log('Empty highlight created:', createdHighlight);

        // 2단계: 미디어 파일 업로드
        console.log('Step 2: Uploading media files...');
        const uploadedUrls = await uploadHighlightMedia(createdHighlight.id, mediaFiles, tripListId);
        console.log('Media files uploaded:', uploadedUrls);

        console.log('=== createHighlightWithMedia success ===');
        return {
            highlight: createdHighlight,
            mediaUrls: uploadedUrls
        };

    } catch (error) {
        console.error('=== createHighlightWithMedia failed ===');
        throw error;
    }
};

export const uploadMediaToS3 = async (mediaItem) => {
    console.warn('⚠️ uploadMediaToS3 is deprecated. Use createHighlightWithMedia or uploadHighlightMedia instead.');
    
    // 기존 코드와의 호환성을 위해 일단 유지하되, 새로운 방식 사용 권장
    console.log('=== uploadMediaToS3 start (deprecated) ===');

    try {
        if (mediaItem.mediaType === 'IMAGE') {
            console.log('Processing image upload...');

            let processedUri = mediaItem.uri;

            // iOS photo library URI 처리
            if (mediaItem.uri.startsWith('ph://')) {
                console.log('Converting photo library URI for image...');

                const manipulatedImage = await ImageManipulator.manipulateAsync(
                    mediaItem.uri,
                    [],
                    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
                );
                processedUri = manipulatedImage.uri;
                console.log('Image converted URI:', processedUri);
            }

            const { uploadImageToS3, UPLOAD_TYPES } = require('./image');
            return await uploadImageToS3(processedUri, UPLOAD_TYPES.HIGHLIGHT);
        } else if (mediaItem.mediaType === 'VIDEO') {
            // 비디오는 새로운 방식으로 처리 불가하므로 에러
            throw new Error('Video upload through uploadMediaToS3 is no longer supported. Please use uploadHighlightMedia instead.');
        } else {
            throw new Error(`Unsupported media type: ${mediaItem.mediaType}`);
        }
    } catch (error) {
        console.error('Error in uploadMediaToS3:', error);
        throw error;
    }
};

export const getHighlightsByUser = async (userId) => {
    const token = await TokenManager.getAccessToken();
    const response = await api.get(`/api/highlights/v1/user/${userId}/by-place`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
};

export const getHighlightsByTripList = async (tripListId) => {
    const token = await TokenManager.getAccessToken();
    const response = await api.get(`/api/highlights/v1/triplist/${tripListId}/by-place`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
};

export const getHighlightStory = async (highlightId, startIndex = 0) => {
    const response = await api.get(`/api/highlights/v1/story/${highlightId}?startIndex=${startIndex}`);
    return response.data;
};

export const getUserStories = async (userId) => {
    const token = await TokenManager.getAccessToken();
    const response = await api.get(`/api/highlights/v1/user/${userId}/stories`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
};

export const updateHighlight = async (highlightId, updateData) => {
    const token = await TokenManager.getAccessToken();
    const response = await api.put(`/api/highlights/v1/${highlightId}`, updateData, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
};

export const deleteHighlight = async (highlightId) => {
    const token = await TokenManager.getAccessToken();
    await api.delete(`/api/highlights/v1/${highlightId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

export const getPlaceHighlightDetail = async (placeName, userId) => {
    const token = await TokenManager.getAccessToken();
    const response = await api.get(`/api/highlights/v1/place/${encodeURIComponent(placeName)}/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
};

export const getHighlightById = async (highlightId) => {
    const token = await TokenManager.getAccessToken();
    const response = await api.get(`/api/highlights/v1/${highlightId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
};
