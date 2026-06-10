// CreateHighlight.js - 하이라이트 생성 컴포넌트
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// import Modal from 'react-native-modal';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createHighlightWithMedia } from '../src/api/highlight';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';

// 장소 데이터
const LOCATIONS = {
    "Entire Hong Kong": ['Hong Kong'],
    "Hong Kong Island": [
        'Kennedy Town', 'Sheung Wan', 'Central', 'Admiralty',
        'Eastern', 'Southern', 'Wanchai', 'Causeway Bay',
        'Northpoint'
    ],
    "Kowloon": [
        "Kowloon City", "Kwun Tong", "Sham Shui Po", 'Wong Tai Sin',
        'Yau Tsim Mong'
    ],
    "The New Territories": [
        'Lantau West', 'Lantau East', 'Lamma', 'Tsing Yi',
        'Kwai Tsing', 'North', 'Sai Kung', 'Sha Tin',
        'Tai Po', 'Tsuen Wan', 'Tuen Mun', 'Yuen Long'
    ],
};

const CreateHighlight = () => {
    const navigation = useNavigation();
    const route = useRoute();

    const [isPublic, setIsPublic] = useState(true);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [thumbnailIndex, setThumbnailIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showPlaceSelector, setShowPlaceSelector] = useState(false);
    const [mediaWithDescriptions, setMediaWithDescriptions] = useState([]);
    const { selectedMedia, tripListId } = route.params || {};
    const { run: runCreateHighlight, isRunning: isCreatingHighlight } = useSingleFlightAction('library:create-highlight');

    useEffect(() => {
        console.log('Raw selectedMedia:', selectedMedia);
        console.log('Type of selectedMedia:', typeof selectedMedia);

        if (selectedMedia) {
            let processedMedia;

            try {
                // Handle both string and object cases
                if (typeof selectedMedia === 'string') {
                    processedMedia = JSON.parse(selectedMedia);
                } else {
                    processedMedia = selectedMedia;
                }

                console.log('Processed media:', processedMedia);

                // Ensure it's an array
                if (Array.isArray(processedMedia)) {
                    const mediaWithDesc = processedMedia.map(media => ({
                        ...media,
                        description: '',
                        mediaType: media.mediaType === 'video' ? 'VIDEO' : 'IMAGE'
                    }));

                    console.log('Final media with descriptions:', mediaWithDesc);
                    setMediaWithDescriptions(mediaWithDesc);
                } else {
                    console.error('Processed media is not an array:', processedMedia);
                }
            } catch (error) {
                console.error('Error processing selectedMedia:', error);
            }
        }
    }, []);

    const handleBack = () => {
        navigation.goBack();
    };

    const handleCreate = async () => {
        await runCreateHighlight(async () => {
            console.log('=== handleCreate start ===');
            console.log('selectedPlace:', selectedPlace);
            console.log('mediaWithDescriptions:', mediaWithDescriptions);
            console.log('tripListId:', tripListId);

            if (!selectedPlace) {
                console.log('No place selected, showing alert');
                Alert.alert('Error', 'Please select a place for this highlight');
                return;
            }

            if (mediaWithDescriptions.length === 0) {
                console.log('No media selected, showing alert');
                Alert.alert('Error', 'Please select at least one photo or video');
                return;
            }

            console.log('Validation passed, starting creation process');
            setLoading(true);

            try {
                const result = await createHighlightWithMedia(
                    selectedPlace,
                    parseInt(tripListId), // 숫자로 변환
                    isPublic,
                    mediaWithDescriptions // 미디어 파일들을 직접 전달
                );

                console.log('Highlight creation completed:', result);

                // 성공 시 하이라이트 업데이트 플래그 설정
                await AsyncStorage.setItem('highlightUpdated', 'true');

                Alert.alert(
                    'Success',
                    'Your highlight has been created successfully!',
                    [{
                        text: 'OK', onPress: () => {
                            console.log('User pressed OK, navigating back');
                            navigation.goBack();
                        }
                    }]
                );

                console.log('=== handleCreate completed successfully ===');

            } catch (error) {
                console.error('=== handleCreate failed ===');
                console.error('Error details:', error);
                console.error('Error stack:', error.stack);

                let errorMessage = 'Failed to create highlight. Please try again.';

                // 더 구체적인 에러 메시지 제공
                if (error.response?.data?.error) {
                    errorMessage = error.response.data.error;
                } else if (error.message) {
                    errorMessage = error.message;
                }

                Alert.alert('Error', errorMessage);
            } finally {
                console.log('Setting loading to false');
                setLoading(false);
                console.log('=== handleCreate finished ===');
            }
        });
    };

    useEffect(() => {
        console.log('mediaWithDescriptions state:', mediaWithDescriptions);
        if (mediaWithDescriptions.length > 0) {
            console.log('First media item URI:', mediaWithDescriptions[0].uri);
        }
    }, [mediaWithDescriptions]);

    const handleMediaDescriptionChange = (text, index) => {
        const updatedMedia = [...mediaWithDescriptions];
        updatedMedia[index].description = text;
        setMediaWithDescriptions(updatedMedia);
    };

    const handleThumbnailSelect = (index) => {
        setThumbnailIndex(index);
    };

    const handleSelectPlace = (place) => {
        setSelectedPlace(place);
        setShowPlaceSelector(false);
    };


    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : null}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create New Highlight</Text>
                <TouchableOpacity
                    onPress={handleCreate}
                    style={[styles.createButton, (loading || isCreatingHighlight) && styles.createButtonDisabled]}
                    disabled={loading || isCreatingHighlight}
                >
                    <Text style={styles.createButtonText}>{(loading || isCreatingHighlight) ? 'Creating...' : 'Create'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollContainer}>
                <View style={styles.formContainer}>
                    {/* 썸네일 선택 */}
                    <Text style={styles.sectionTitle}>Thumbnail</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.thumbnailContainer}
                    >
                        {mediaWithDescriptions.map((media, index) => {
                            console.log(`Media ${index}:`, media); // Debug each media item
                            return (
                                <TouchableOpacity
                                    key={`thumb-${index}`}
                                    onPress={() => handleThumbnailSelect(index)}
                                    style={[
                                        styles.thumbnailItem,
                                        thumbnailIndex === index && styles.selectedThumbnail
                                    ]}
                                >
                                    <Image
                                        source={{ uri: media.uri }}
                                        style={styles.thumbnailImage}
                                        resizeMode="cover"
                                        onError={(error) => {
                                            console.log('Image error for media:', media);
                                            console.log('Error details:', error.nativeEvent);
                                        }}
                                        onLoad={() => console.log('Image loaded successfully for index:', index)}
                                        onLoadStart={() => console.log('Image loading started for index:', index)}
                                        onLoadEnd={() => console.log('Image loading ended for index:', index)}
                                    />
                                    {media.mediaType === 'VIDEO' && (
                                        <View style={styles.videoIndicator}>
                                            <Ionicons name="play-circle" size={20} color="white" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )
                        })}
                    </ScrollView>

                    {/* 장소 선택 */}
                    <Text style={styles.sectionTitle}>Place</Text>
                    <TouchableOpacity
                        style={styles.placeSelector}
                        onPress={() => setShowPlaceSelector(true)}
                    >
                        <Text style={selectedPlace ? styles.placeText : styles.placeholderText}>
                            {selectedPlace || 'Select a place for this highlight'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#fff" />
                    </TouchableOpacity>

                    {/* 공개 여부 */}
                    <View style={styles.privacyContainer}>
                        <Text style={styles.sectionTitle}>Privacy</Text>
                        <View style={styles.privacyOptions}>
                            <TouchableOpacity
                                style={[
                                    styles.privacyOption,
                                    isPublic && styles.selectedPrivacyOption
                                ]}
                                onPress={() => setIsPublic(true)}
                            >
                                <Text style={styles.privacyOptionText}>Public</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.privacyOption,
                                    !isPublic && styles.selectedPrivacyOption
                                ]}
                                onPress={() => setIsPublic(false)}
                            >
                                <Text style={styles.privacyOptionText}>Private</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* 미디어 설명 (선택사항) */}
                    {/* <Text style={styles.sectionTitle}>Descriptions (Optional)</Text>
                    {mediaWithDescriptions.map((media, index) => (
                        <View key={`desc-${index}`} style={styles.mediaDescriptionContainer}>
                            <Image source={{ uri: media.uri }} style={styles.mediaThumb} />
                            <TextInput
                                style={styles.descriptionInput}
                                placeholder="Add a description..."
                                placeholderTextColor="#999"
                                value={media.description}
                                onChangeText={(text) => handleMediaDescriptionChange(text, index)}
                                multiline
                            />
                        </View>
                    ))} */}
                </View>
            </ScrollView >

            {/* 장소 선택 모달 */}
              <Modal
                visible={showPlaceSelector}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPlaceSelector(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select a Place</Text>
                        <ScrollView style={styles.placesScrollView}>
                            {Object.entries(LOCATIONS).map(([region, places]) => (
                                <View key={region} style={styles.regionContainer}>
                                    <Text style={styles.regionTitle}>{region}</Text>
                                    {places.map((place) => (
                                        <TouchableOpacity
                                            key={place}
                                            style={styles.placeItem}
                                            onPress={() => handleSelectPlace(place)}
                                        >
                                            <Text style={styles.placeItemText}>{place}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowPlaceSelector(false)}
                        >
                            <Text style={styles.closeButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            {/* 로딩 표시 */}
            {
                loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#3897f0" />
                        <Text style={styles.loadingText}>Creating highlight...</Text>
                    </View>
                )
            }
        </KeyboardAvoidingView >
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
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingHorizontal: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    createButton: {
        padding: 8,
    },
    createButtonDisabled: {
        opacity: 0.5,
    },
    createButtonText: {
        color: '#3897f0',
        fontSize: 16,
        fontWeight: 'bold',
    },
    scrollContainer: {
        flex: 1,
    },
    formContainer: {
        padding: 15,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 15,
    },
    thumbnailContainer: {
        height: 100, // Make sure container has a height
        marginVertical: 10,
    },
    thumbnailItem: {
        marginRight: 10,
        borderRadius: 8,
        overflow: 'hidden',
    },
    thumbnailImage: {
        width: 80,  // Ensure image has specific dimensions
        height: 80,
        borderRadius: 8,
        backgroundColor: '#333', // Add background color for loading state
    },
    selectedThumbnail: {
        borderColor: '#3897f0',
        borderWidth: 2,
    },
    input: {
        backgroundColor: '#333',
        color: 'white',
        padding: 12,
        borderRadius: 5,
        marginBottom: 15,
    },
    placeSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#333',
        padding: 12,
        borderRadius: 5,
        marginBottom: 15,
        alignItems: 'center',
    },
    placeText: {
        color: 'white',
        fontSize: 16,
    },
    placeholderText: {
        color: '#999',
        fontSize: 16,
    },
    privacyContainer: {
        marginBottom: 15,
    },
    privacyOptions: {
        flexDirection: 'row',
        backgroundColor: '#333',
        borderRadius: 5,
        overflow: 'hidden',
    },
    privacyOption: {
        flex: 1,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedPrivacyOption: {
        backgroundColor: '#1f1f1f',
    },
    privacyOptionText: {
        color: 'white',
        fontSize: 16,
    },
    mediaDescriptionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    mediaThumb: {
        width: 60,
        height: 60,
        borderRadius: 5,
        marginRight: 10,
    },
    descriptionInput: {
        flex: 1,
        backgroundColor: '#333',
        color: 'white',
        padding: 12,
        borderRadius: 5,
        height: 60,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#222',
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        padding: 20,
        maxHeight: '70%',
    },
    modalTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    placesScrollView: {
        marginBottom: 20,
    },
    regionContainer: {
        marginBottom: 15,
    },
    regionTitle: {
        color: '#3897f0',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    placeItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    placeItemText: {
        color: 'white',
        fontSize: 16,
    },
    closeButton: {
        backgroundColor: '#333',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
    },
    closeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: 'white',
        fontSize: 16,
        marginTop: 10,
    },
    videoIndicator: {
        position: 'absolute',
        bottom: 5,
        left: 5,
    },
});

export default CreateHighlight;
