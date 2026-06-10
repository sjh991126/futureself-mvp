import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
    Keyboard,
    TouchableWithoutFeedback,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { LinearGradient } from 'expo-linear-gradient';
import ConfirmationModal from '../../assets/components/ConfirmationModal';
import { TokenManager } from '../src/config';
import { useSelector } from 'react-redux';
import { createNewPost } from '../src/api/newPost';
import { editPost } from '../src/api/PostEditDelete';
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';
import { uploadMultipleImagesToS3 } from '../src/api/image';

const Post = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const isEditMode = params.mode === 'edit';
    const [user, setUser] = useState('');
    const [title, setTitle] = useState(params.initialTitle || '');
    const [content, setContent] = useState(params.initialContent || '');
    const [images, setImages] = useState([]);
    const [selectedTags, setSelectedTags] = useState(
        params.initialTopic ? [params.initialTopic] : []
    );
    const [permissionModalVisible, setPermissionModalVisible] = useState(false);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const location = useSelector((state) => state.location.city);
    const [isLoading, setIsLoading] = useState(false);
    const [currentDate, setCurrentDate] = useState('');
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const isUploadingImages = images.some(img => img.loading);
    const { run: runSubmitPost, isRunning: isSubmittingPost } = useSingleFlightAction('community:post-submit');

    const tags = ['companion', 'weather', 'location', 'questions'];

    useEffect(() => {
        const checkUser = async () => {
            try {
                const userData = await TokenManager.getUserData();
                if (userData) {
                    setUser(userData);
                } else {
                    router.push('/login');
                }
            } catch (error) {
                console.error('Error checking user:', error);
                router.push('/login');
            }
        };
        checkUser();
    }, []);

    useEffect(() => {
        const date = new Date();
        const options = {
            month: 'short',
            day: 'numeric'
        };
        const formattedDate = date.toLocaleDateString('en-US', options);
        setCurrentDate(formattedDate);
    }, []);

    useEffect(() => {
        if (isEditMode) {
            console.log('Initializing edit mode with data:', {
                title: params.initialTitle,
                content: params.initialContent,
                topic: params.initialTopic,
                location: params.initialLocation
            });
        }
    }, [isEditMode]);

    const toggleTag = (tag) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
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
                aspect: [1, 1],
                preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Automatic,
            });

            if (!result.canceled && result.assets) {
                const newImages = result.assets.slice(0, 3 - images.length);

                const placeholders = newImages.map((_, index) => ({
                    uri: null,
                    loading: true,
                    id: Date.now() + index
                }));

                setImages(prev => [...prev, ...placeholders]);

                const resizedImages = await Promise.all(
                    newImages.map(async (asset, index) => {
                        try {
                            const resizedImage = await ImageManipulator.manipulateAsync(
                                asset.uri,
                                [{ resize: { width: 800 } }],
                                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                            );
                            return {
                                uri: resizedImage.uri,
                                loading: false,
                                id: placeholders[index].id
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
                    return updated.slice(0, 3);
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

    const renderImagePreview = () => (
        <View style={styles.imagePreviewContainer}>
            {images.map((item, index) => (
                <View key={item.id || index} style={styles.imagePreviewWrapper}>
                    {item.loading ? (
                        // 로딩 중 UI
                        <View style={styles.imagePreviewLoading}>
                            <ActivityIndicator size="small" color="#fff" />
                            <Text style={styles.loadingText}>Processing...</Text>
                        </View>
                    ) : (
                        <>
                            <Image source={{ uri: item.uri }} style={styles.imagePreview} />
                            <TouchableOpacity
                                style={styles.removeImageButton}
                                onPress={() => setImages(prev => prev.filter((_, i) => i !== index))}
                            >
                                <Ionicons name="close-circle" size={24} color="#fff" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            ))}
        </View>
    );

    const handleBack = () => {
        if (title || content || images.length > 0) {
            setShowExitConfirm(true);
        } else {
            router.back();
        }
    };

    const handlePost = async () => {
        await runSubmitPost(async () => {
            if (!title || !content) {
                setAlertMessage('Please enter both title and content.');
                setAlertVisible(true);
                return;
            }

            if (selectedTags.length === 0) {
                setAlertMessage('Please select at least one tag.');
                setAlertVisible(true);
                return;
            }

            try {
                setIsLoading(true);

                // 이미지 처리 중 에러 처리
                let uploadedImageUrls = [];

                if (images.length > 0) {
                    try {
                        const imagesToUpload = images
                            .filter(img => !img.loading && img.uri)
                            .map(img => img.uri);

                        uploadedImageUrls = await uploadMultipleImagesToS3(
                            imagesToUpload,
                            UPLOAD_TYPES.POST
                        );
                    } catch (imageError) {
                        console.error('Image upload failed:', imageError);
                        setAlertMessage('Image upload failed. Please try again.');
                        setAlertVisible(true);
                        setIsLoading(false);
                        return;
                    }
                }

                const postData = {
                    topic: selectedTags[0],
                    title: title.trim(),
                    content: content.trim(),
                    location: location || 'Unknown Location',
                    images: uploadedImageUrls
                };

                if (isEditMode) {
                    await editPost(params.postId, postData);
                } else {
                    await createNewPost(postData);
                }

                router.push('community_home');
            } catch (error) {
                console.error('Post submission error:', error);
                setAlertMessage(
                    `Failed to ${isEditMode ? 'edit' : 'create'} post: ${error.message || 'Unknown error'}`
                );
                setAlertVisible(true);
            } finally {
                setIsLoading(false);
            }
        });
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <Ionicons name="chevron-back" size={26} color="white" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.userInfo}>
                        {user.imageUrl ? (
                            <ExpoImage
                                source={{ uri: user.imageUrl }}
                                style={styles.userImage}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                onError={(e) => console.log('Failed to load image', e?.error)}
                            />
                        ) : (
                            <View style={[styles.userImage, styles.defaultProfileImage]}>
                                <Ionicons name="person" size={20} color="#888" />
                            </View>
                        )}
                        <View>
                            <Text style={styles.userName}>{user.name || 'Loading...'}</Text>
                            <Text style={[styles.location, { marginTop: 3 }]}>
                                {currentDate} {location || 'Unknown Location'}
                            </Text>
                        </View>
                    </View>
                </View>

                <ScrollView style={styles.content}>
                    <View style={styles.tagContainer}>
                        {tags.map((tag) => (
                            <TouchableOpacity
                                key={tag}
                                onPress={() => toggleTag(tag)}
                            >
                                <LinearGradient
                                    style={[styles.tag]}
                                    colors={selectedTags.includes(tag) ? ['#5468ff', '#81d8d0'] : ['#333', '#333']}
                                    locations={[0, 1]}
                                    useAngle={true}
                                    angle={45}
                                >
                                    <Text style={[
                                        styles.tagText,
                                        selectedTags.includes(tag) && styles.selectedTagText
                                    ]}>
                                        {tag}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        placeholder="Title your post"
                        placeholderTextColor="#888"
                        value={title}
                        onChangeText={setTitle}
                        selectionColor="#fff"
                        style={[
                            styles.titleInput,
                            {
                                color: title ? '#fff' : '#666',
                                fontWeight: title ? '600' : 'normal'
                            }
                        ]}
                    />

                    <TextInput
                        multiline
                        placeholder="- What would you like to share with other travelers?
- Registered posts may be exposed in search engine results."
                        placeholderTextColor="#888"
                        value={content}
                        onChangeText={setContent}
                        selectionColor="#fff"
                        style={[
                            styles.contentInput,
                            {
                                color: content ? '#fff' : '#666',
                                fontWeight: content ? '600' : 'normal'
                            }
                        ]}
                    />
                    {renderImagePreview()}

                    {/* <View style={styles.imagePreviewContainer}>
                        {images.map((uri, index) => (
                            <View key={index} style={styles.imagePreviewWrapper}>
                                <Image source={{ uri }} style={styles.imagePreview} />
                                <TouchableOpacity
                                    style={styles.removeImageButton}
                                    onPress={() => setImages(prev => prev.filter((_, i) => i !== index))}
                                >
                                    <Ionicons name="close-circle" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View> */}
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.imageButton} onPress={pickImages}>
                        <Ionicons name="image" size={24} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.postButton,
                            (isLoading || isUploadingImages || isSubmittingPost) && styles.disabledButton
                        ]}
                        onPress={handlePost}
                        disabled={isLoading || isUploadingImages || isSubmittingPost}
                    >
                        <Text style={styles.postButtonText}>
                            {isLoading || isSubmittingPost ? 'Sending...' : isUploadingImages ? 'Processing...' : 'Post'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <ConfirmationModal
                    visible={permissionModalVisible}
                    title="No Permission"
                    message="Permission to access images was denied."
                    onConfirm={() => setPermissionModalVisible(false)}
                    confirmText="OK"
                    cancelText=""
                />
                <ConfirmationModal
                    visible={alertVisible}
                    title="Failed uploading your Post"
                    message={alertMessage}
                    onConfirm={() => setAlertVisible(false)}
                    confirmText="OK"
                    cancelText=""
                />
                <ConfirmationModal
                    visible={showExitConfirm}
                    title="Discard Post?"
                    message="Your changes will be lost"
                    onConfirm={() => router.back()}
                    onCancel={() => setShowExitConfirm(false)}
                    confirmText="Discard"
                    cancelText="Keep Editing"
                />
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        padding: 16,
    },
    headerTop: {
        marginBottom: 13,
    },
    backButton: {
        marginRight: 16,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    userName: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    location: {
        color: '#fff',
        fontSize: 12,
    },
    content: {
        flex: 1,
        padding: 16,
        paddingTop: 8,
    },
    tagContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        justifyContent: 'space-between',
    },
    tag: {
        backgroundColor: '#25282d',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginRight: 4,
        height: 32,
    },
    selectedTag: {
        backgroundColor: '#5468ff',
    },
    tagText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: "600",
        textAlign: "left"
    },
    selectedTagText: {
        color: 'white',
    },
    titleInput: {
        color: '#666',
        fontSize: 14,
        marginBottom: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderStyle: "solid",
        borderColor: "#fff",
        borderWidth: 1,
        height: 50,
    },
    contentInput: {
        color: '#666',
        fontSize: 14,
        height: 306,
        textAlignVertical: 'top',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderStyle: "solid",
        borderColor: "#fff",
        borderWidth: 1,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    imageButton: {
        padding: 8,
    },
    postButton: {
        backgroundColor: '#25282d',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 24,
    },
    postButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    defaultProfileImage: {
        backgroundColor: "#ccc",
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.5,
    },
    imagePreviewContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 10,
        gap: 10,
    },
    imagePreviewWrapper: {
        position: 'relative',
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    removeImageButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#000',
        borderRadius: 12,
    },
    imagePreviewLoading: {
        width: 100,
        height: 100,
        borderRadius: 8,
        backgroundColor: 'rgba(84, 104, 255, 0.1)',
        borderWidth: 1,
        borderColor: '#fff',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        fontSize: 11,
        marginTop: 6,
        fontWeight: '500',
    },
});

export default Post;
