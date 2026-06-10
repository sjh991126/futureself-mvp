import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions, TextInput, Modal, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Alert } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { Color } from "./profileStyles";
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { UPLOAD_TYPES, uploadImageToS3 } from '../src/api/image';
import { editUserProfile } from '../src/api/user';
import LoadingSpinner from './../LoadingSpinner';
import { TokenManager } from '../src/config';
import ConfirmationModal from '../../assets/components/ConfirmationModal';
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';

const { width, height } = Dimensions.get('window');
const scale = Math.min(width, height) / 375;
const responsiveSize = (size) => Math.round(size * scale);

const editProfile = ({ route }) => {
    const params = useLocalSearchParams();
    const { initialName, initialImageUrl } = params;
    const [name, setName] = useState(initialName || '');
    const [selectedImage, setSelectedImage] = useState(initialImageUrl || null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [alertVisible, setAlertVisible] = useState(false);
    const { run: runSaveProfile, isRunning: isSaveProfileRunning } = useSingleFlightAction('profile:edit-save');

    const handleImagePicker = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
                preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Automatic,
            });

            if (!result.canceled && result.assets.length > 0) {
                const resizedImage = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 800 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );
                setSelectedImage(resizedImage.uri);
                console.log('Resized image URI:', resizedImage.uri);
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert(
                'Unable to open this photo',
                'This image may still be in iCloud or not available locally on your iPhone. Please open it in Photos first so it downloads, then try again.'
            );
        }
    };

    const handleSave = async () => {
        await runSaveProfile(async () => {
            if (!name) {
                setAlertVisible(true);
                return;
            }
            setIsLoading(true);

            try {
                let imageUrl = '';
                if (selectedImage != initialImageUrl) {
                    console.log('Uploading image...');
                    imageUrl = await uploadImageToS3(selectedImage, UPLOAD_TYPES.PROFILE);
                    console.log('Image uploaded successfully, URL:', imageUrl);
                } else {
                    imageUrl = initialImageUrl;
                }

                const newUser = {
                    name: name,
                    imageUrl: imageUrl
                };

                console.log('Sending user data:', newUser);
                const userResponse = await editUserProfile(newUser);
                console.log('User edit response:', userResponse);

                await TokenManager.storeUserData(userResponse);

                if (userResponse) {
                    router.push('/profile')
                }

            } catch (error) {
                console.error('Error in handleSave:', error);
                if (error.response) {
                    console.error('Error response:', error.response);
                    console.error('Error response data:', error.response.data);
                }
                alert(`Failed to register user or update profile image: ${error.message}`);
            } finally {
                setIsLoading(false);
            }
        });
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior="padding">
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <SafeAreaView style={styles.container} pointerEvents={isLoading ? 'none' : 'auto'}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <Ionicons name="chevron-back" size={26} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Profile Setting</Text>
                    </View>

                    <View style={styles.profileImageContainer}>
                        <TouchableOpacity onPress={handleImagePicker}>
                            <View style={styles.profileImagePlaceholder}>
                                {selectedImage ? (
                                    <Image source={{ uri: selectedImage }} style={styles.profileImage} />
                                ) : (
                                    <Ionicons name="camera" size={responsiveSize(40)} color="#888" />
                                )}
                            </View>
                        </TouchableOpacity>
                        <Text onPress={handleImagePicker} style={styles.editCoverText}>Edit Cover</Text>
                    </View>

                    <View style={styles.infoContainer}>
                        <InfoItem
                            label="Name"
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter your name"
                            inputStyle={styles.input}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, (isLoading || isSaveProfileRunning) && { opacity: 0.6 }]}
                        onPress={handleSave}
                        disabled={isLoading || isSaveProfileRunning}
                    >
                        <Text style={styles.saveButtonText}>{(isLoading || isSaveProfileRunning) ? 'Saving...' : 'Save'}</Text>
                    </TouchableOpacity>
                    {isLoading && (
                        <View style={styles.loadingOverlay}>
                            <LoadingSpinner />
                        </View>
                    )}
                    <ConfirmationModal
                        visible={alertVisible}
                        title="Your name is empty"
                        message="Please enter your name."
                        onConfirm={() => setAlertVisible(false)}
                        confirmText="OK"
                        cancelText=''
                    />
                </SafeAreaView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

const InfoItem = ({ label, value, onChangeText, placeholder, editable = true, inputStyle }) => (
    <View style={styles.infoItem}>
        <Text style={styles.infoLabel}>{label}</Text>
        <TextInput
            style={[styles.infoInput, inputStyle]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#888"
            editable={editable}
        />
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        zIndex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10
    },
    backButton: {
        marginRight: responsiveSize(16),
    },
    headerTitle: {
        color: 'white',
        fontSize: responsiveSize(18),
        fontWeight: 'bold',
        alignSelf: 'center',
    },
    headerRight: {
        width: responsiveSize(40),
    },
    profileImageContainer: {
        alignItems: 'center',
        marginVertical: responsiveSize(30),
    },
    profileImage: {
        width: responsiveSize(130),
        height: responsiveSize(130),
        borderRadius: responsiveSize(65),
    },

    profileImagePlaceholder: {
        width: responsiveSize(130),
        height: responsiveSize(130),
        borderRadius: responsiveSize(65),
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ABB7C2',
        overflow: 'hidden',
    },
    editCoverText: {
        color: '#81D8D0',
        marginTop: responsiveSize(15),
        fontSize: 14,
        fontWeight: 600,
        alignSelf: 'center'
    },
    infoContainer: {
        marginVertical: responsiveSize(10),
        borderTopWidth: 0.5,
        borderTopColor: '#333',
    },
    input: {
        flex: 1,
        color: Color.colorWhite,
        paddingLeft: 30,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: responsiveSize(16),
        paddingHorizontal: responsiveSize(16),
        borderBottomWidth: 0.5,
        borderBottomColor: '#333',
    },
    infoLabel: {
        color: 'white',
        fontSize: responsiveSize(16),
        width: responsiveSize(100), // Fixed width for alignment
    },
    infoInput: {
        flex: 1,
        color: '#888',
        fontSize: responsiveSize(16),
        marginLeft: responsiveSize(8),
    },
    accountTypeButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    accountTypeText: {
        color: Color.colorWhite,
        fontSize: responsiveSize(16),
        marginRight: responsiveSize(8),
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#222',
        borderRadius: responsiveSize(10),
        padding: responsiveSize(10),
        width: '50%',
    },
    modalOption: {
        paddingVertical: responsiveSize(15),
    },
    modalOptionLine: {
        borderBottomWidth: 2,
        borderBottomColor: '#333',
    },
    modalOptionText: {
        color: 'white',
        fontSize: responsiveSize(16),
        textAlign: 'center',
    },
    saveButton: {
        backgroundColor: 'white',
        borderRadius: responsiveSize(20),
        paddingVertical: responsiveSize(8),
        paddingHorizontal: responsiveSize(24),
        alignSelf: 'center',
        marginTop: responsiveSize(50),
    },
    saveButtonText: {
        color: 'black',
        fontSize: responsiveSize(14),
        fontWeight: "600"
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

export default editProfile;
