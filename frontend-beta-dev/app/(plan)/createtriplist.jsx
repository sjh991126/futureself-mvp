import React, { useRef, useEffect, useMemo, useState } from 'react';
import { View, Animated, SafeAreaView, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Alert } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createTripList } from './../src/api/triplist';
import ConfirmationModal from '../../assets/components/ConfirmationModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { autosaveService } from '../src/api/autosave';
import { clearCurrentEditingDraft, setCurrentEditingDraft } from '../src/utils/editingDraftSession';
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';

const CreateTripList = () => {
    const router = useRouter();
    const [tripListName, setTripListName] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalTitle, setModalTitle] = useState('');
    const params = useLocalSearchParams();
    const currentDraftId = Array.isArray(params.draftId) ? params.draftId[0] : params.draftId;
    const tripData = useMemo(() => {
        if (!params.tripData) return null;
        try {
            return JSON.parse(params.tripData);
        } catch (e) {
            console.warn('Failed to parse tripData in createtriplist:', e);
            return null;
        }
    }, [params.tripData]);
    const [inputFocused, setInputFocused] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { run: runCreateTripList, isRunning: isCreateTripListRunning } = useSingleFlightAction('plan:create-triplist');
    const { run: runSaveDraft, isRunning: isSaveDraftRunning } = useSingleFlightAction('plan:save-draft');

    console.log('tripData:', JSON.stringify(tripData, (key, value) => {
        if (key === 'places') {
            return value;
        }
        return value;
    }, 2));

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const autoSaveTimer = useRef(null);

    const resolveItinerary = (base) => {
        if (Array.isArray(base?.itinerary)) {
            return base.itinerary;
        }

        if (base?.itineraryData) {
            try {
                const parsed = typeof base.itineraryData === 'string'
                    ? JSON.parse(base.itineraryData)
                    : base.itineraryData;
                if (Array.isArray(parsed?.itinerary)) {
                    return parsed.itinerary;
                }
            } catch (e) {
                console.warn('Failed to parse itineraryData in createtriplist autosave', e);
            }
        }

        return [];
    };

    const buildAutoSavePayload = (name = '') => {
        const base = tripData || {};
        const itinerary = resolveItinerary(base);

        return {
            tripListId: base.tripListId ?? null,
            name: name ?? '',
            categoryId: base.categoryId ?? null,
            imageUrl: base.imageUrl ?? null,
            startDate: base.startDate ?? null,
            endDate: base.endDate ?? null,
            isPublic: base.isPublic ?? false,
            itinerary,
        };
    };

    useEffect(() => {
        setCurrentEditingDraft(buildAutoSavePayload(tripListName || ''));
    }, [tripData, tripListName]);

    const autoSaveName = async (name) => {
        try {
            const payload = buildAutoSavePayload(name);
            await autosaveService.autoSave(payload);
        } catch (e) { console.warn('autosave name failed', e); }
    };

    const handleCreate = async () => {
        await runCreateTripList(async () => {
            if (isSubmitting) return;
            if (tripListName.trim() !== '') {
                try {
                    setIsSubmitting(true);
                    const baseRequest = buildAutoSavePayload(tripListName);
                    // AI 컨펌 출처 — 최종 생성에만 부착하고 autosave draft에는 넣지 않는다.
                    const aiRequestId = Array.isArray(params.aiRequestId)
                        ? params.aiRequestId[0]
                        : params.aiRequestId;
                    const requestData = aiRequestId
                        ? { ...baseRequest, sourceAiRequestId: aiRequestId }
                        : baseRequest;
                    if (!Array.isArray(requestData.itinerary)) {
                        console.error('Invalid tripData structure:', tripData);
                        setModalTitle('Invalid trip data');
                        setModalMessage('Please try again.');
                        setModalVisible(true);
                        return;
                    }
                    console.log("Request Data:", JSON.stringify(requestData, null, 2));

                    // Step 1: Create TripList
                    const createdTripList = await createTripList(requestData);
                    await AsyncStorage.setItem('listUpdated', 'true');
                    await AsyncStorage.setItem('updatedCategory', "Personal");
                    await AsyncStorage.removeItem('draftId');
                    if (currentDraftId) {
                        try {
                            await autosaveService.deleteDraft(currentDraftId);
                        } catch (e) {
                            console.error('Failed to delete draft after creation:', e);
                        }
                    }
                    clearCurrentEditingDraft();

                    console.log("Itinerary structure:", JSON.stringify(createdTripList, null, 2));

                    // Step 3: Redirect to list details
                    router.push({
                        pathname: 'list_details',
                        params: {
                            from: 'createtriplist',
                            tripListId: createdTripList.tripListId.toString(),
                            tripDetails: JSON.stringify(createdTripList)
                        }
                    });

                } catch (error) {
                    console.error('Error creating trip list or chat room:', error);
                    setModalTitle('Error');
                    setModalMessage('An error occurred while creating the trip list. Please try again.');
                    setModalVisible(true);
                } finally {
                    setIsSubmitting(false);
                }
            } else {
                setModalTitle('Error');
                setModalMessage('Please enter a name for your TripList.');
                setModalVisible(true);
            }
        });
    };

    useEffect(() => {
        return () => {
            if (autoSaveTimer.current) {
                const t = autoSaveTimer.current;
                clearTimeout(t);
                // 선택: 마지막 값 즉시 저장하고 나가고 싶다면
                // autoSaveName(tripListName);
            }
        };
    }, []);

    return (
        <KeyboardAvoidingView style={styles.container} behavior="padding">
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <SafeAreaView style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => {
                                Alert.alert(
                                    'Leave',
                                    'Save your changes as a draft?',
                                    [
                                        {
                                            text: 'Save Draft',
                                            onPress: async () => {
                                                try {
                                                    await autosaveService.autoSave(buildAutoSavePayload(tripListName || ''));
                                                    Alert.alert('Saved', 'Draft saved successfully.');
                                                } catch (e) {
                                                    console.warn(e);
                                                    Alert.alert('Failed', 'Could not save draft.');
                                                }
                                                router.back();
                                            }
                                        },
                                        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
                                        { text: 'Cancel', style: 'cancel' }
                                    ]
                                );
                            }}
                            style={styles.backButton}
                        >
                            <Ionicons name="chevron-back" size={26} color="white" />
                        </TouchableOpacity>
                    </View>
                    <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                        <Text style={styles.title}>Give your TripList a name</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={[styles.input, { borderBottomWidth: 0 }]}
                                placeholder="Name Your TripList"
                                placeholderTextColor="#666"
                                value={tripListName}
                                onChangeText={(t) => {
                                    setTripListName(t);
                                    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
                                    autoSaveTimer.current = setTimeout(() => autoSaveName(t), 800);
                                }}
                                onFocus={() => setInputFocused(true)}
                                onBlur={() => setInputFocused(false)}
                            />
                            <LinearGradient
                                colors={inputFocused ? ['#5468FF', '#81D8D0'] : ['gray', 'gray']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.gradientUnderline, { height: inputFocused ? 2 : 1 }]}
                            />
                        </View>

                        <TouchableOpacity onPress={handleCreate} disabled={isSubmitting || isCreateTripListRunning} style={[styles.createButton, (isSubmitting || isCreateTripListRunning) && { opacity: 0.6 }]}>
                            <LinearGradient
                                colors={['#5468FF', '#81D8D0']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={styles.gradientButton}
                            >
                                <Text style={styles.createButtonText}>{(isSubmitting || isCreateTripListRunning) ? 'Creating...' : 'Create'}</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => runSaveDraft(async () => {
                                try {
                                    const payload = buildAutoSavePayload(tripListName || '');
                                    await autosaveService.autoSave(payload);
                                    Alert.alert('Saved', 'Draft saved successfully.');
                                    router.push('/homepage');
                                } catch (e) {
                                    console.error(e);
                                    Alert.alert('Failed', 'Could not save draft.');
                                }
                            })}
                            style={[styles.createButton, { marginTop: 12 }]}
                            disabled={isSaveDraftRunning}
                            accessibilityRole="button"
                            accessibilityLabel="Skip and save as draft"
                        >
                            <LinearGradient
                                colors={['#333', '#333']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={styles.gradientButton}
                            >
                                <Text style={styles.createButtonText}>{isSaveDraftRunning ? 'Saving Draft...' : 'Skip & Save Draft'}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    <ConfirmationModal
                        visible={modalVisible}
                        title={modalTitle}
                        message={modalMessage}
                        onConfirm={() => setModalVisible(false)}
                        confirmText="OK"
                        cancelText=''
                    />
                </SafeAreaView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    backButton: {
        marginLeft: 10
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: 'white',
        marginBottom: 80,
        textAlign: 'center',
    },
    inputContainer: {
        width: '80%',
        position: 'relative',
        marginBottom: 48,
    },
    input: {
        borderBottomWidth: 1,
        color: 'white',
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
        paddingBottom: 4,
    },
    createButton: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 40,
    },
    gradientButton: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 40,
        alignItems: 'center',
    },
    createButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    gradientUnderline: {
        borderRadius: 1,

    },
});

export default CreateTripList;
