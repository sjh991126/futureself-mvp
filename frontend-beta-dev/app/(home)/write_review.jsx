import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Image, ScrollView, Keyboard, TouchableWithoutFeedback, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadReview } from '../src/api/review';
import AdjustableStar from '../../assets/components/adjustable_star_component';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import LoadingSpinner from './../LoadingSpinner';
import { LinearGradient } from 'expo-linear-gradient';
import { UPLOAD_TYPES, uploadMultipleImagesToS3 } from '../src/api/image';
import ConfirmationModal from '../../assets/components/ConfirmationModal';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from "../src/AppStateHandler";
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';

const WriteReview = () => {
    const { onGoBack } = useLocalSearchParams();
    const router = useRouter();
    const [placeId, setPlaceId] = useState('');
    const [title, setTitle] = useState('');
    const [reviewText, setReviewText] = useState('');
    const [reviewTitle, setReviewTitle] = useState('');
    const [rating, setRating] = useState(0);
    const [images, setImages] = useState([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [permissionModalVisible, setPermissionModalVisible] = useState(false);
    const [alertVisible, setAlertVisible] = useState(false);  // 추가된 alertVisible 상태
    const [alertMessage, setAlertMessage] = useState('');  // 경고 메시지 상태
    const setLastUsedFeature = useAppState();
    const { run: runPostReview, isRunning: isPostingReview } = useSingleFlightAction('review:post');

    useEffect(() => {
        setLastUsedFeature('Review');
    }, [setLastUsedFeature]);

    useEffect(() => {
        const getData = async () => {
            try {
                const placeId = await AsyncStorage.getItem('placeId');
                const title = await AsyncStorage.getItem('title');
                if (placeId !== null) setPlaceId(placeId);
                if (title !== null) setTitle(title);
            } catch (error) {
                console.error('Error retrieving data from AsyncStorage:', error);
            }
        };
        getData();
    }, []);

    const handlePostReview = async () => {
        await runPostReview(async () => {
            // 제목이나 리뷰 내용이 없으면 경고 표시
            if (!reviewTitle || !reviewText) {
                setAlertMessage('Please enter both the title and review content.');
                setAlertVisible(true);
                return;
            }

            setIsLoading(true);
            try {
                const imagesToUpload = images
                    .filter(img => !img.loading && img.uri)
                    .map(img => img.uri);
                const uploadedUrls = await uploadMultipleImagesToS3(imagesToUpload, UPLOAD_TYPES.REVIEW);
                console.log('All images uploaded successfully, URLs:', uploadedUrls);
                const uploadedImages = uploadedUrls.map(imageUrl => ({ imageUrl }));

                const review_content = {
                    title: reviewTitle,
                    content: reviewText,
                    rating: rating,
                    images: uploadedImages, // Use the array of uploaded image URLs
                };

                const response = await uploadReview(placeId, review_content);
                console.log('Review posted:', reviewText, rating, uploadedImages);

                // 정리 실패가 있어도 성공 후 화면 복귀는 보장
                try {
                    await AsyncStorage.multiRemove(['placeId', 'title']);
                } catch (storageError) {
                    console.warn('Failed to clear review draft keys:', storageError);
                }

                if (typeof router.canGoBack === 'function' && router.canGoBack()) {
                    router.back();
                } else {
                    router.replace('/homepage');
                }
            } catch (error) {
                console.error('Error posting review:', error);
                setAlertMessage('Failed to post review. Please try again.');
                setAlertVisible(true);
            } finally {
                setIsLoading(false);
            }
        });
    };

    const pickImages = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                setPermissionModalVisible(true);
                return;
            }

            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 1,
                preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Automatic,
            });

            if (!result.canceled && result.assets) {
                const placeholders = result.assets.map((_, index) => ({
                    uri: null,
                    loading: true,
                    id: Date.now() + index,
                }));

                setImages(prev => [...prev, ...placeholders]);

                const resizedImages = await Promise.all(
                    result.assets.map(async (asset, index) => {
                        try {
                            const resizedImage = await ImageManipulator.manipulateAsync(
                                asset.uri,
                                [{ resize: { width: 800 } }],
                                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                            );

                            return {
                                uri: resizedImage.uri,
                                loading: false,
                                id: placeholders[index].id,
                            };
                        } catch (error) {
                            console.error('Image resize error:', error);
                            return null;
                        }
                    })
                );

                setImages(prev => {
                    const updated = [...prev];
                    resizedImages.forEach((resized, index) => {
                        if (resized) {
                            const placeholderIndex = updated.findIndex(
                                img => img.id === placeholders[index].id
                            );
                            if (placeholderIndex !== -1) {
                                updated[placeholderIndex] = resized;
                            }
                        }
                    });
                    return updated;
                });
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert(
                'Unable to open this photo',
                'This image may still be in iCloud or not available locally on your iPhone. Please open it in Photos first so it downloads, then try again.'
            );
        }
    };

    const handleReviewTextChange = (text) => {
        if (text.length <= 500) {
            setReviewText(text);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container} pointerEvents={isLoading ? 'none' : 'auto'}>
                <SafeAreaView style={styles.contentContainer}>

                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <Ionicons name="chevron-back" size={26} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Leave Your Review</Text>
                    </View>
                    <View style={styles.reviewContainer}>
                        <Text style={styles.subHeader}>{title}</Text>
                        <View style={styles.ratingContainer}>
                            <AdjustableStar rating={rating} setRating={setRating} />
                        </View>
                        <TextInput
                            style={styles.titleInput}
                            placeholder="Title your review"
                            placeholderTextColor="#888"
                            value={reviewTitle}
                            onChangeText={setReviewTitle}
                        />
                        <TextInput
                            style={styles.textInput}
                            multiline
                            placeholder="Please write down your feelings about this place (max 500 characters)"
                            placeholderTextColor="#888"
                            value={reviewText}
                            onChangeText={handleReviewTextChange} // Use the new handler
                        />
                        {images.length > 0 && (
                            <ScrollView horizontal style={styles.imageContainer}>
                                {images.map((image, index) => (
                                    <View key={image.id || index} style={styles.imageWrapper}>
                                        {image.loading ? (
                                            <View style={styles.reviewImageLoading}>
                                                <ActivityIndicator size="small" color="#fff" />
                                                <Text style={styles.loadingText}>Processing...</Text>
                                            </View>
                                        ) : (
                                            <>
                                                <Image source={{ uri: image.uri }} style={styles.reviewImage} />
                                                <TouchableOpacity style={styles.removeImageButton} onPress={() => setImages(prev => prev.filter((_, i) => i !== index))}>
                                                    <FontAwesome name="times-circle" size={20} color="white" />
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                        <View style={styles.iconContainer}>
                            <TouchableOpacity style={styles.iconButton} onPress={pickImages}>
                                <FontAwesome name="image" size={24} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.postButton, (isLoading || isPostingReview) && { opacity: 0.6 }]}
                                onPress={handlePostReview}
                                disabled={isLoading || isPostingReview}
                            >
                                <LinearGradient
                                    colors={reviewText ? ['#81d8d0', '#5468ff'] : ['#ccc', '#ccc']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradientButton}
                                >
                                    <Text style={styles.postButtonText}>{(isLoading || isPostingReview) ? 'Posting...' : 'Post Review'}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ConfirmationModal
                        visible={permissionModalVisible}
                        title="No Permission"
                        message="Permission to access images was denied."
                        onConfirm={() => setPermissionModalVisible(false)}
                        confirmText="OK"
                        cancelText=''
                    />
                    <ConfirmationModal
                        visible={alertVisible}  // 추가된 alert modal
                        title="Incomplete Review"
                        message={alertMessage}
                        onConfirm={() => setAlertVisible(false)}
                        confirmText="OK"
                        cancelText=''
                    />
                </SafeAreaView >
                {isLoading && (
                    <View style={styles.loadingOverlay}>
                        <LoadingSpinner />
                    </View>
                )}
            </View >
        </TouchableWithoutFeedback>
    );
};

export default WriteReview;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    contentContainer: {
        flex: 1,
        width: '100%',
        backgroundColor: '#000',
        overflow: 'hidden',
    },
    backButton: {
        position: 'absolute',
        left: 4,
    },
    backButtonImage: {
        width: 24,
        height: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        paddingHorizontal: 10,
        position: 'relative',
    },
    reviewContainer: {
        paddingHorizontal: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        fontFamily: "Monsterrat-Bold",
        textAlign: "center",
    },
    subHeader: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
        textAlign: 'left', // Align text to the left
        marginTop: 30,
    },
    ratingContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start', // Align stars to the left
        marginTop: 10,
    },
    titleInput: {
        backgroundColor: 'black',
        color: 'white',
        borderColor: '#FFF',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 12,
        marginTop: 20,
        // textAlignVertical: 'top',
    },
    textInput: {
        backgroundColor: 'black',
        color: 'white',
        borderColor: '#FFF',
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginTop: 20,
        height: 300,
        textAlignVertical: 'top',
    },
    imageContainer: {
        flexDirection: 'row',
        marginTop: 20,
    },
    imageWrapper: {
        position: 'relative',
        marginRight: 10,
    },
    reviewImage: {
        width: 100,
        height: 100,
        borderRadius: 10,
    },
    reviewImageLoading: {
        width: 100,
        height: 100,
        borderRadius: 10,
        backgroundColor: '#2A2A2A',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    removeImageButton: {
        position: 'absolute',
        right: 1,
    },
    loadingText: {
        color: '#fff',
        fontSize: 12,
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
        marginLeft: 5 // Adjusted margin to move the button upwards
    },
    iconButton: {
        marginRight: 60, // Increased space between icon and button
    },
    postButton: {
        borderRadius: 40,
        flex: 0.55, // Shortened the width of the button
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 0,
        paddingVertical: 10,
    },
    gradientButton: {
        borderRadius: 40,
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 0,
        paddingVertical: 10,
    },
    postButtonText: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Montserrat-SemiBold',
        color: '#000',
        textAlign: 'center',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
});
