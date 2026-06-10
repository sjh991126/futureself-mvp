// PhotoPicker.js - 향상된 사진 선택 컴포넌트
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Platform,
    Alert
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from '../../app/LoadingSpinner';

const PhotoPicker = ({ onClose, onMediaSelected }) => {
    const [media, setMedia] = useState([]);
    const [selectedMedia, setSelectedMedia] = useState([]);
    const [hasPermission, setHasPermission] = useState(null);
    const [album, setAlbum] = useState('Recents');
    const [albums, setAlbums] = useState([]);
    const [showAlbumSelector, setShowAlbumSelector] = useState(false);
    const [loading, setLoading] = useState(true);

    // 권한 요청 및 미디어 로드
    useEffect(() => {
        (async () => {
            setLoading(true);

            // 권한 요청
            const { status } = await MediaLibrary.requestPermissionsAsync();
            setHasPermission(status === 'granted');

            if (status === 'granted') {
                // 앨범 목록 가져오기
                const albumsResult = await MediaLibrary.getAlbumsAsync();
                setAlbums([{ title: 'Recents', id: 'recents' }, ...albumsResult]);

                // 최근 미디어 가져오기
                loadMediaFromAlbum('recents');
            } else {
                setLoading(false);
            }
        })();
    }, []);

    // 선택한 앨범에서 미디어 로드
    const loadMediaFromAlbum = async (albumId) => {
        setLoading(true);

        try {
            let assets;

            if (albumId === 'recents') {
                // 최근 항목 로드
                const { assets: recentAssets } = await MediaLibrary.getAssetsAsync({
                    mediaType: ['photo', 'video'],
                    sortBy: ['creationTime'],
                    first: 100
                });
                assets = recentAssets;
            } else {
                // 특정 앨범에서 로드
                const { assets: albumAssets } = await MediaLibrary.getAssetsAsync({
                    album: albumId,
                    mediaType: ['photo', 'video'],
                    sortBy: ['creationTime'],
                    first: 100
                });
                assets = albumAssets;
            }

            // 미디어 타입 데이터 추가
            const assetsWithType = assets.map(asset => {
                // 동영상 길이 정보 추가 (1분 이상인 경우 경고 표시)
                const isLongVideo = asset.mediaType === 'video' && asset.duration > 60;

                return {
                    ...asset,
                    isLongVideo,
                    disabled: isLongVideo // 1분 이상 비디오는 선택 불가
                };
            });

            setMedia(assetsWithType);
        } catch (error) {
            console.error('Error loading media:', error);
            Alert.alert('Error', 'Failed to load media from your library');
        } finally {
            setLoading(false);
        }
    };

    // 앨범 선택
    const handleAlbumSelect = (albumId, albumTitle) => {
        setAlbum(albumTitle);
        loadMediaFromAlbum(albumId);
        setShowAlbumSelector(false);
    };

    // 미디어 선택 토글
    const toggleSelect = (item) => {
        if (item.disabled) {
            Alert.alert(
                'Video Too Long',
                'Videos must be under 1 minute for TripLane Memories. Please select a shorter video.'
            );
            return;
        }

        if (selectedMedia.some(media => media.id === item.id)) {
            setSelectedMedia(selectedMedia.filter(media => media.id !== item.id));
        } else {
            setSelectedMedia([...selectedMedia, item]);
        }
    };

    // 다음 단계로 진행
    const handleNext = () => {
        if (selectedMedia.length === 0) {
            return;
        }

        const formattedMedia = selectedMedia.map(item => ({
            uri: item.uri,
            mediaType: item.mediaType,
            id: item.id,
            duration: item.duration
        }));    

        onMediaSelected(formattedMedia);
    };

    // 미디어 아이템 렌더링
    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.mediaContainer,
                item.disabled && styles.disabledMedia
            ]}
            onPress={() => toggleSelect(item)}
            disabled={item.disabled}
        >
            <Image
                source={{ uri: item.uri }}
                style={styles.media}
            />

            {/* 동영상인 경우 재생 아이콘 표시 */}
            {item.mediaType === 'video' && (
                <View style={styles.videoIndicator}>
                    <Ionicons name="play-circle" size={24} color="white" />
                    {/* 비디오 길이 표시 */}
                    <Text style={styles.videoDuration}>
                        {formatDuration(item.duration)}
                    </Text>
                </View>
            )}

            {/* 길이 제한 초과 동영상 경고 */}
            {item.isLongVideo && (
                <View style={styles.longVideoWarning}>
                    <Ionicons name="warning" size={18} color="white" />
                    <Text style={styles.warningText}>Too long</Text>
                </View>
            )}

            {/* 선택 표시기 */}
            {selectedMedia.some(media => media.id === item.id) && (
                <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedNumber}>
                        {selectedMedia.findIndex(media => media.id === item.id) + 1}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    // 비디오 길이를 포맷팅하는 함수 (초 -> 분:초)
    const formatDuration = (seconds) => {
        if (!seconds) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // 권한이 없는 경우
    if (hasPermission === false) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={onClose}>
                        <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}> Gallery</Text>
                </View>
                <View style={styles.permissionContainer}>
                    <Ionicons name="images-outline" size={64} color="#666" />
                    <Text style={styles.permissionText}>
                        Permission to access photos and videos is required.
                    </Text>
                    <TouchableOpacity style={styles.permissionButton}>
                        <Text style={styles.permissionButtonText}>Open Settings</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* 헤더 */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onClose}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Gallery</Text>
                <TouchableOpacity
                    style={styles.nextButton}
                    disabled={selectedMedia.length === 0}
                    onPress={handleNext}
                >
                    <Text style={[
                        styles.nextButtonText,
                        selectedMedia.length === 0 && styles.disabledText
                    ]}>Next</Text>
                </TouchableOpacity>
            </View>

            {/* 앨범 선택기 */}
            <View style={styles.albumHeader}>
                <TouchableOpacity
                    style={styles.albumButton}
                    onPress={() => setShowAlbumSelector(!showAlbumSelector)}
                >
                    <Text style={styles.albumText}>{album}</Text>
                    <Ionicons
                        name={showAlbumSelector ? "chevron-up" : "chevron-down"}
                        size={16}
                        color="white"
                    />
                </TouchableOpacity>

                {/* 선택된 미디어 카운터 */}
                {selectedMedia.length > 0 && (
                    <View style={styles.selectedCounter}>
                        <Text style={styles.selectedCounterText}>
                            {selectedMedia.length} selected
                        </Text>
                    </View>
                )}
            </View>

            {/* 앨범 선택 드롭다운 */}
            {showAlbumSelector && (
                <View style={styles.albumSelector}>
                    <FlatList
                        data={albums}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.albumItem}
                                onPress={() => handleAlbumSelect(item.id, item.title)}
                            >
                                <Text style={[
                                    styles.albumItemText,
                                    album === item.title && styles.activeAlbumText
                                ]}>
                                    {item.title}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            {/* 미디어 그리드 */}
            <FlatList
                data={media}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                numColumns={3}
                contentContainerStyle={styles.mediaList}
                initialNumToRender={21}
                maxToRenderPerBatch={21}
            />

            {/* 로딩 인디케이터 */}
            {loading && (
                <View style={styles.loadingContainer}>
                        <LoadingSpinner/>
                    </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 15,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    nextButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    nextButtonText: {
        color: '#3897f0',
        fontWeight: 'bold',
        fontSize: 16,
    },
    disabledText: {
        opacity: 0.5,
    },
    albumHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomColor: '#333',
        borderBottomWidth: 1,
    },
    albumButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    albumText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        marginRight: 5,
    },
    selectedCounter: {
        backgroundColor: '#3897f0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    selectedCounterText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    albumSelector: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 110 : 110 + StatusBar.currentHeight,
        left: 0,
        right: 0,
        backgroundColor: '#222',
        zIndex: 10,
        maxHeight: 200,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    albumItem: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#333',
    },
    albumItemText: {
        color: 'white',
        fontSize: 16,
    },
    activeAlbumText: {
        color: '#3897f0',
        fontWeight: 'bold',
    },
    mediaList: {
        paddingTop: 2,
    },
    mediaContainer: {
        width: '33.3%',
        aspectRatio: 1,
        padding: 1,
        position: 'relative',
    },
    disabledMedia: {
        opacity: 0.5,
    },
    media: {
        width: '100%',
        height: '100%',
    },
    videoIndicator: {
        position: 'absolute',
        bottom: 5,
        left: 5,
        flexDirection: 'row',
        alignItems: 'center',
    },
    videoDuration: {
        color: 'white',
        fontSize: 12,
        marginLeft: 3,
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    longVideoWarning: {
        position: 'absolute',
        top: 5,
        left: 5,
        backgroundColor: 'rgba(255, 0, 0, 0.7)',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        flexDirection: 'row',
        alignItems: 'center',
    },
    warningText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 3,
    },
    selectedIndicator: {
        position: 'absolute',
        top: 5,
        right: 5,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#3897f0',
        borderWidth: 2,
        borderColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedNumber: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    permissionText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    permissionButton: {
        backgroundColor: '#3897f0',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    permissionButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default PhotoPicker;