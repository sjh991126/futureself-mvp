import React, { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { View, Alert, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, Modal, TouchableWithoutFeedback, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, Marker } from 'react-native-maps';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import moment from 'moment';
import { LinearGradient } from 'expo-linear-gradient';
import { TokenManager } from "../src/config";
import { deleteTriplist } from '../src/api/delete_triplist';
import { updateTripList } from '../src/api/update_triplist';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator'; import { UPLOAD_TYPES, uploadImageToS3 } from "../src/api/image";
import ConfirmationModal from "../../assets/components/ConfirmationModal";
import CollaborateModal from "../../assets/components/CollaborateModal";
import { useAppState } from "../src/AppStateHandler";
import CalendarManualScreen from "../(plan)/CalendarManualScreen";
import DateIconWhite from '../../assets/icons/calendar_white.jsx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTripList } from "../src/api/triplist";
import { updateTripListPrivacy } from '../src/api/updateTripListPrivacy';
import { getChatRoomByTripListId } from '../src/api/chat';
import * as chatService from "../src/api/chat";
import ShareModal from "../../assets/components/share_modal";
import MenuModal from "../../assets/components/menu_modal";
import { fetchTripListById } from "../src/api/triplist";
import SkeletonLoader from "../../assets/components/SkeletonLoader";
import PhotoPicker from "../../assets/components/photopicker";
import HighlightViewer from "./highlightviewer";
import { getHighlightsByTripList, createHighlight } from "../src/api/highlight";
import WebSocketService from "../src/api/WebSocketService";

const OptimizedTextInput = React.memo(({ initialValue, isEditMode, onSave }) => {
    const [inputValue, setInputValue] = useState(initialValue);
    const inputRef = useRef(null);

    useEffect(() => {
        setInputValue(initialValue);
    }, [initialValue]);

    const handleChangeText = useCallback((text) => {
        setInputValue(text);
    }, []);

    const handleBlur = useCallback(() => {
        if (inputValue !== initialValue) {
            onSave(inputValue);
        }
    }, [inputValue, initialValue, onSave]);

    return (
        <TextInput
            ref={inputRef}
            style={isEditMode ? styles.titleInput : styles.title}
            value={inputValue}
            onChangeText={handleChangeText}
            onBlur={handleBlur}
            multiline={false}
            editable={isEditMode}
        // onFocus={() => {
        //     if (!isEditMode && inputRef.current) {
        //         inputRef.current.blur();
        //     }
        // }}
        />
    );
});


const ListDetails = () => {
    const router = useRouter();
    const { tripListId, isEditMode: initialEditMode, from, id, name, selectedPlace } = useLocalSearchParams();

    const [user, setUser] = useState('');
    const [allPlaces, setAllPlaces] = useState([]);
    const [tripDetails, setTripDetails] = useState(null);
    const [selectedDay, setSelectedDay] = useState(1);
    const [initialRegion, setInitialRegion] = useState(null);
    const [mapRegion, setMapRegion] = useState(null);
    const mapRef = useRef(null);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [placesToRemove, setPlacesToRemove] = useState([]);
    const [allPlacesFlat, setAllPlacesFlat] = useState([]);
    const [permissionModalVisible, setPermissionModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [isCollaborateModalVisible, setIsCollaborateModalVisible] = useState(false);
    const [backModalVisible, setBackModalVisible] = useState(false);
    const [originalData, setOriginalData] = useState([]);
    const [listUserId, setListUserId] = useState(null);
    const [listUserName, setListUserName] = useState(null);
    const [listUserImage, setListUserImage] = useState(null);
    const setLastUsedFeature = useAppState();
    const [listName, setListName] = useState(null);
    const [listImage, setListImage] = useState(null);
    const [currentListImage, setCurrentListImage] = useState(listImage || null);
    const [newListName, setNewListName] = useState(listName || '');
    const [collaborators, setCollaborators] = useState(null);
    const [alertVisible, setAlertVisible] = useState(false);
    const [dateState, setDateState] = useState({
        current: { start: null, end: null },
        temp: { start: null, end: null }
    });
    const [isLoading, setIsLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');
    const [privacyUpdateMessage, setPrivacyUpdateMessage] = useState('');
    const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
    const [truncateWarningVisible, setTruncateWarningVisible] = useState(false);
    const [pendingTruncateRange, setPendingTruncateRange] = useState({});
    const [privacyConfirmationVisible, setPrivacyConfirmationVisible] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [chatRoom, setChatRoom] = useState(null);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [chatRooms, setChatRooms] = useState([]);
    const [placeHighlights, setPlaceHighlights] = useState([]);
    const [selectedHighlight, setSelectedHighlight] = useState(null);
    const [showHighlightViewer, setShowHighlightViewer] = useState(false);
    const [highlightsLoading, setHighlightsLoading] = useState(false);
    const [showPhotoPickerModal, setShowPhotoPickerModal] = useState(false);
    const [originalTripDetails, setOriginalTripDetails] = useState(null);
    const notificationTimeoutRef = useRef(null);
    const chatNavRef = useRef(false);
    const webSocketService = useRef(new WebSocketService(router)).current;
    const currentUserId = user?.id || user?.userId || null;
    const isTripOwner = currentUserId != null && listUserId != null && String(currentUserId) === String(listUserId);
    const isTripCollaborator = useMemo(() => {
        if (!currentUserId || !Array.isArray(collaborators)) return false;

        return collaborators.some((collaborator) => {
            const collaboratorId =
                collaborator?.collaboratorId ??
                collaborator?.userId ??
                collaborator?.id;

            return collaboratorId != null && String(collaboratorId) === String(currentUserId);
        });
    }, [collaborators, currentUserId]);
    const showChatButton = useMemo(() =>
        (isTripOwner || isTripCollaborator) && !!chatRoom,
        [chatRoom, isTripCollaborator, isTripOwner]
    );

    useEffect(() => {
        console.log('=== Checking selectedPlace ===');
        console.log('selectedPlace param:', selectedPlace);
        console.log('tripDetails exists:', !!tripDetails);
        console.log('tripDetails itinerary:', tripDetails?.itinerary?.length);

        if (tripDetails?.itinerary?.length > 0 &&
            selectedPlace &&
            typeof selectedPlace === 'string' &&
            selectedPlace !== 'null' &&
            selectedPlace !== 'undefined' &&
            selectedPlace.trim() !== '') {

            console.log('Attempting to add selectedPlace...');

            try {
                const placeToAdd = JSON.parse(selectedPlace);
                console.log('Parsed placeToAdd:', placeToAdd);

                const placeIdentifier = placeToAdd?.id || placeToAdd?.googleId;

                if (!placeIdentifier) {
                    throw new Error('Selected place does not have an "id" or "googleId" property');
                }

                const isDuplicate = tripDetails.itinerary[0].places.some(
                    place => {
                        const existingId = place.id || place.googleId;
                        return existingId === placeIdentifier;
                    }
                );

                if (!isDuplicate) {
                    const normalizedPlace = {
                        ...placeToAdd,
                        id: placeToAdd.id || placeToAdd.googleId
                    };

                    const updatedTripDetails = {
                        ...tripDetails,
                        itinerary: tripDetails.itinerary.map((day, index) => {
                            if (index === 0) {
                                return {
                                    ...day,
                                    places: [normalizedPlace, ...day.places]
                                };
                            }
                            return day;
                        })
                    };

                    setTripDetails(updatedTripDetails);
                    setIsEditMode(true);
                    console.log('Place added successfully:', normalizedPlace);
                } else {
                    console.log('Place already exists in Day 1');
                }

            } catch (error) {
                console.error('Error adding selected place:', error);
            } finally {
                router.setParams({ selectedPlace: '' });
            }
        }
    }, [tripDetails, selectedPlace]);

    const ensureWebSocketConnection = useCallback(async () => {
        if (webSocketService.isConnected()) {
            return true;
        }

        const accessToken = await TokenManager.getAccessToken();
        const userData = user || await TokenManager.getUserData();
        const username = userData?.userName || userData?.username || userData?.name;

        if (!accessToken || !username) {
            throw new Error('Missing websocket credentials');
        }

        await webSocketService.connect(username, accessToken);
        return true;
    }, [user, webSocketService]);

    const flatListData = useMemo(() => {
        if (!tripDetails?.itinerary) return [];

        return tripDetails.itinerary.flatMap((day, dayIndex) => {
            const date = moment(tripDetails.startDate).add(dayIndex, 'days');
            return [
                { type: 'dayHeader', date: date.format('MMMM Do'), dayIndex },
                ...day.places.map(place => ({ ...place, type: 'place', dayIndex })),
                { type: 'addButton', dayIndex }
            ];
        });
    }, [tripDetails?.itinerary, tripDetails?.startDate]);

    useEffect(() => {
        let timeoutId;
        if (successMessage) {
            timeoutId = setTimeout(() => {
                setSuccessMessage('');
            }, 3000);
        }
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [successMessage]);

    const formatDate = (date) => {
        return date ? moment(date).format('MMM D, YYYY') : '';
    };

    // const fetchHighlights = useCallback(async () => {
    //     if (!tripDetails?.tripListId) return;

    //     try {
    //         console.log('=== Fetching highlights ===');
    //         console.log('TripListId:', tripDetails.tripListId);
    //         setHighlightsLoading(true);

    //         const highlightsData = await getHighlightsByTripList(tripDetails.tripListId);
    //         console.log('Raw highlights data:', JSON.stringify(highlightsData, null, 2));

    //         if (highlightsData?.placeHighlights) {
    //             console.log('Number of place highlights:', highlightsData.placeHighlights.length);
    //             highlightsData.placeHighlights.forEach((ph, index) => {
    //                 console.log(`Place ${index}: ${ph.placeName}, Highlights count: ${ph.highlights?.length}`);
    //             });
    //         }

    //         setPlaceHighlights(highlightsData.placeHighlights || []);
    //     } catch (error) {
    //         console.error('Error fetching highlights:', error);
    //         setPlaceHighlights([]);
    //     } finally {
    //         setHighlightsLoading(false);
    //     }
    // }, [tripDetails?.tripListId]);

    const getDateRangeText = () => {
        if (dateState.temp.start && dateState.temp.start === dateState.temp.end) {
            return formatDate(dateState.temp.start);
        } else if (dateState.temp.start && dateState.temp.end) {
            return `${formatDate(dateState.temp.start)} - ${formatDate(dateState.temp.end)}`;
        } else {
            return 'Add custom date range';
        }
    };

    const handleSaveListName = useCallback((newName) => {
        console.log("New list name updated to:", newName);
        setNewListName(newName);
        setTripDetails(prevDetails => ({
            ...prevDetails,
            name: newName
        }));
    }, []);

    // Log the isPublic value to verify its correctness
    useEffect(() => {
        console.log('isPublic value:', tripDetails?.isPublic); // Correct property name
    }, [tripDetails]);

    useEffect(() => {
        setLastUsedFeature('TripListDetails');
    }, [setLastUsedFeature]);

    useEffect(() => {
        setIsEditMode(initialEditMode === 'true' || initialEditMode === true); // Ensure it's a boolean
    }, [initialEditMode]);

    const handleBack = () => {
        setIsEditMode(false);
        setBackModalVisible(false);

        // 편집 전 원본 상태로 복원
        if (originalTripDetails) {
            setTripDetails(originalTripDetails);
            setNewListName(originalTripDetails.name);
            setListName(originalTripDetails.name);
            setDateState({
                current: {
                    start: originalTripDetails.startDate,
                    end: originalTripDetails.endDate
                },
                temp: {
                    start: originalTripDetails.startDate,
                    end: originalTripDetails.endDate
                }
            });
            setAllPlaces(originalTripDetails.itinerary.flatMap(day => day.places));
            setCurrentListImage(originalTripDetails.imageUrl);

            // 백업 데이터 초기화
            setOriginalTripDetails(null);
        }
    };

    const handleBackPress = () => {
        console.log('Navigating from:', from);
        if (isEditMode) {
            setBackModalVisible(true);
        }
        else if (from === 'elastic_search') {
            router.push('/elastic_search');
        }
        else if (from === 'full_map') {
            router.push('/list');
        } else if (from === 'categories') {
            router.push({
                pathname: '/categories',
                params: { id: id, name: name }
            });
        } else if (from === 'list') {
            router.push('/list');
        } else if (from === 'createtriplist') {
            router.push('/list');
        } else if (from === 'profile') {
            router.push('/profile');
        } else if (from === 'add_place') {
            router.push('/list');
        } else if (from === 'noti') {
            router.push('/homepage');
        }
        else {
            router.push('/list');
        }
    };

    const handleAddCollaborator = (newCollaborator) => {
        if (Array.isArray(collaborators) && !collaborators.some(collab => collab.collaboratorId === newCollaborator.collaboratorId)) {
            setCollaborators([...collaborators, newCollaborator]);
        } else if (!Array.isArray(collaborators)) {
            setCollaborators([newCollaborator]);
        }
        setIsCollaborateModalVisible(false);
    };

    const handleAddNewPlace = (dayIndex) => {
        const updatedTripDetails = JSON.stringify(tripDetails);
        router.push({
            pathname: '/add_place',
            params: {
                day: dayIndex + 1,
                tripData: updatedTripDetails,
                from: 'list_details',
            }
        });
    };

    const renderCollaboratorImages = (collaborators, tripOwnerId, tripOwnerImage) => {
        const maxDisplay = 3;
        let updatedCollaborators = [...collaborators];

        updatedCollaborators = [
            ...updatedCollaborators,
            { collaboratorId: tripOwnerId, collaboratorImageUrl: tripOwnerImage }
        ];

        // const centerImageIndex = Math.min(1, updatedCollaborators.length - 1);
        const centerImageIndex = 1;
        const tripOwnerIndex = updatedCollaborators.findIndex(collab => collab.collaboratorId === tripOwnerId);

        if (tripOwnerIndex !== -1 && tripOwnerIndex !== centerImageIndex) {
            const [tripOwner] = updatedCollaborators.splice(tripOwnerIndex, 1);
            updatedCollaborators.splice(centerImageIndex, 0, tripOwner);
        }

        return (
            <View style={styles.collaboratorContainer}>
                {updatedCollaborators.slice(0, maxDisplay).map((collaborator, index) => (
                    collaborator.collaboratorImageUrl ? (
                        <ExpoImage
                            key={index}
                            source={{ uri: collaborator.collaboratorImageUrl }}
                            style={[
                                styles.collaboratorImage,
                                index === centerImageIndex ? styles.centerImage : {},
                                { zIndex: index === centerImageIndex ? 3 : maxDisplay - index }
                            ]}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                    ) : (
                        <View key={index} style={[
                            styles.profileIconContainer,
                            index === centerImageIndex ? styles.centerImage : {},
                            { zIndex: index === centerImageIndex ? 3 : maxDisplay - index }
                        ]}>
                            <Ionicons name="person" size={16} color="#888" />
                        </View>
                    )
                ))}
                {updatedCollaborators.length > maxDisplay && (
                    <View style={[styles.extraCollaborators, { zIndex: 0 }]}>
                        <Text style={styles.extraCollaboratorsText}>+{updatedCollaborators.length - maxDisplay}</Text>
                    </View>
                )}
            </View>
        );
    };

    useEffect(() => {
        const loadTripDetails = async () => {
            if (!tripListId) {
                console.error('tripListId is missing');
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const tripData = await fetchTripListById(tripListId);

                if (tripData) {
                    setTripDetails(tripData);
                    setOriginalTripDetails(JSON.parse(JSON.stringify(tripData)));
                    setListUserId(tripData.user.id);
                    setListUserName(tripData.user.name);
                    setListUserImage(tripData.user.imageUrl);
                    setListName(tripData.name);
                    setNewListName(tripData.name);
                    setListImage(tripData.imageUrl);
                    setCollaborators(tripData.collaborators);
                    setDateState(prev => ({
                        ...prev,
                        current: { start: tripData.startDate, end: tripData.endDate },
                        temp: { start: tripData.startDate, end: tripData.endDate }
                    }));

                    if (tripData.itinerary.length > 0) {
                        const flattenedPlaces = tripData.itinerary.flatMap((day, dayIndex) =>
                            day.places.map(place => ({ ...place, dayIndex }))
                        );
                        setAllPlacesFlat(flattenedPlaces);

                        const places = tripData.itinerary.flatMap(day => day.places);
                        setAllPlaces(places);

                        const firstPlace = tripData.itinerary[0].places[0];
                        if (firstPlace) {
                            const initialRegion = {
                                latitude: firstPlace.latitude,
                                longitude: firstPlace.longitude,
                                latitudeDelta: 0.005,
                                longitudeDelta: 0.005,
                            };
                            setInitialRegion(initialRegion);
                            setMapRegion(initialRegion);
                        }

                        if (!tripData.imageUrl && firstPlace?.imageUrls?.length > 0) {
                            setCurrentListImage(firstPlace.imageUrls[0]);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading trip details:', error);
                // setError('Failed to load trip details');
            } finally {
                setIsLoading(false);
            }
        };

        loadTripDetails();
    }, [tripListId]);

    // useEffect(() => {
    //     if (tripDetails?.tripListId && !isLoading) {
    //         fetchHighlights();
    //     }
    // }, [tripDetails?.tripListId, isLoading, fetchHighlights]);

    useEffect(() => {
        const fetchChatRoom = async () => {
            console.log('tripdetails: ', tripDetails);
            if (!tripDetails || !tripDetails.tripListId) {
                console.error("No tripListId provided or tripDetails is not initialized");
                return;
            }
            try {
                const room = await getChatRoomByTripListId(tripDetails.tripListId);
                setChatRoom(room);
                console.log("Chat room fetched successfully:", room);
            } catch (error) {
                console.error("Failed to fetch chat room:", error);
            }
        };

        // Only fetch if tripDetails is available and tripListId exists
        if (tripDetails && tripDetails.tripListId) {
            fetchChatRoom();
        }
    }, [tripDetails]);


    useEffect(() => {
        const checkUser = async () => {
            try {
                const userData = await TokenManager.getUserData();
                if (userData) {
                    console.log('User data from TokenManager:', userData);
                    console.log('Setting user to:', userData);
                    setUser(userData);
                }
            } catch (error) {
                console.error('Error retrieving user data or token:', error);
            }
        };
        checkUser();
    }, []);

    // useFocusEffect(
    //     useCallback(() => {
    //         const checkForHighlightUpdates = async () => {
    //             const highlightUpdated = await AsyncStorage.getItem('highlightUpdated');
    //             if (highlightUpdated === 'true') {
    //                 console.log('Detected highlight update, refreshing highlights...');

    //                 await fetchHighlights(); // 분리된 함수 사용
    //                 await AsyncStorage.removeItem('highlightUpdated');
    //             }
    //         };

    //         checkForHighlightUpdates();
    //     }, [fetchHighlights])
    // );

    // 하이라이트 클릭 핸들러
    const handleHighlightPress = (placeHighlight) => {
        // 첫 번째 하이라이트를 선택
        const firstHighlight = placeHighlight.highlights[0];
        if (firstHighlight) {
            console.log('Selected highlight:', firstHighlight); // 디버깅용
            setSelectedHighlight(firstHighlight);
            setShowHighlightViewer(true);
        }
    };


    // 새 하이라이트 추가 핸들러
    const handleAddHighlight = () => {
        setShowPhotoPickerModal(true);
    };

    // 포토 피커 닫기 핸들러
    const handlePhotoPickerClose = () => {
        setShowPhotoPickerModal(false);
    };

    // 미디어 선택 완료 핸들러
    const handleMediaSelected = async (selectedMedia) => {
        setShowPhotoPickerModal(false);

        router.push({
            pathname: '/createhighlight',
            params: {
                selectedMedia: JSON.stringify(selectedMedia),
                tripListId: tripDetails.tripListId,
                returnTo: 'list_details' // 돌아올 화면 지정
            },
        });
    };


    // 하이라이트 뷰어 닫기 핸들러
    const handleCloseViewer = () => {
        setShowHighlightViewer(false);
        setSelectedHighlight(null);
    };

    const updateMapRegion = (dayIndex) => {
        if (tripDetails && tripDetails.itinerary[dayIndex] && tripDetails.itinerary[dayIndex].places.length > 0) {
            const firstPlace = tripDetails.itinerary[dayIndex].places[0];
            const newRegion = {
                latitude: firstPlace.latitude,
                longitude: firstPlace.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            };
            setMapRegion(newRegion);
            mapRef.current?.animateToRegion(newRegion, 1000);
        }
    };

    const setSelectedDayAndUpdateMap = (dayIndex) => {
        setSelectedDay(dayIndex);
        updateMapRegion(dayIndex - 1);
    };

    const CustomMarker = ({ coordinate, index }) => (
        <Marker coordinate={coordinate}>
            <View style={styles.marker}>
                <Text style={styles.markerText}>{index + 1}</Text>
            </View>
        </Marker>
    );

    const handleRemovePlace = (dayIndex, placeId) => {
        console.log('handleRemovePlace - dayIndex:', dayIndex, 'placeId:', placeId);
        console.log('Current tripDetails:', JSON.stringify(tripDetails, null, 2));
        setPlacesToRemove([...placesToRemove, { dayIndex, placeId }]);
        console.log('places to remove', placesToRemove);
        const updatedTripDetails = JSON.parse(JSON.stringify(tripDetails));
        updatedTripDetails.itinerary[dayIndex].places = updatedTripDetails.itinerary[dayIndex].places.filter(
            place => place.id != placeId
        );
        console.log('updated trip list:', updatedTripDetails);
        setTripDetails(updatedTripDetails);
        setAllPlaces(updatedTripDetails.itinerary.flatMap(day => day.places));
    };



    const handleChangeListImage = async () => {
        try {
            // Request permission to access the media library
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                setPermissionModalVisible(true);
                return;
            }

            // Launch the image picker
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 1,
                preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Automatic,
            });

            // If the user didn't cancel the image picker
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newImageUri = result.assets[0].uri;
                console.log('Selected image URI:', newImageUri); // Debugging line

                // Resize the image before uploading
                const resizedImage = await ImageManipulator.manipulateAsync(
                    newImageUri,
                    [{ resize: { width: 1024 } }],  // Resize to a width of 800px
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }  // Compress and save as JPEG
                );

                if (resizedImage.uri) {

                    console.log('Uploading resized image...');
                    const uploadedImageUrl = await uploadImageToS3(resizedImage.uri, UPLOAD_TYPES.TRIPLIST);
                    console.log('Image uploaded successfully, URL:', uploadedImageUrl);

                    // Temporarily update the current list image
                    setCurrentListImage(uploadedImageUrl);

                    // Update tripDetails with the new image URL
                    const updatedTripDetails = {
                        ...tripDetails,
                        imageUrl: uploadedImageUrl,
                    };
                    setTripDetails(updatedTripDetails);

                    console.log('Updated tripDetails:', updatedTripDetails); // Debugging line
                }
            } else {
                // console.log('Image selection was canceled or no valid assets found.'); // Debugging line
            }
        } catch (error) {
            console.error('Error in handleChangeListImage:', error);
            Alert.alert(
                'Unable to open this photo',
                'This image may still be in iCloud or not available locally on your iPhone. Please open it in Photos first so it downloads, then try again.'
            );
        }
    };

    const renderItem = ({ item, drag, isActive }) => {
        switch (item.type) {
            case 'dayHeader':
                return (
                    <View style={styles.dayHeader}>
                        <Text style={styles.dayTitle}>Day {item.dayIndex + 1}: {item.date}</Text>
                    </View>
                );
            case 'place':
                return (
                    <ScaleDecorator>
                        <TouchableOpacity
                            onLongPress={isEditMode ? drag : null}
                            disabled={isActive}
                            style={[styles.placeItem, isActive && styles.activeItem]}
                            onPress={() => {
                                router.push({
                                    pathname: '/place_details',
                                    params: {
                                        placeId: item.id,
                                    },
                                });
                            }}
                        >
                            {isEditMode && (
                                <TouchableOpacity
                                    onLongPress={drag}
                                    style={styles.dragIconContainer}
                                >
                                    <Ionicons name="reorder-three-outline" size={24} color="#fff" style={styles.dragIcon} />
                                </TouchableOpacity>
                            )}
                            <ExpoImage
                                style={styles.placeImage}
                                source={{ uri: item.imageUrls[0] }}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={150}
                            />
                            <View style={styles.placeTextContainer} pointerEvents="none">
                                <Text style={styles.placeTitle}>{item.name}</Text>
                                <Text style={styles.placeAddress}>{item.shortFormattedAddress}</Text>
                                <Text style={styles.placeRating}>Rating: {item.rating} ★</Text>
                            </View>
                            {isEditMode && (
                                <TouchableOpacity onPress={() => handleRemovePlace(item.dayIndex, item.id)}>
                                    <Ionicons name="remove-circle-outline" size={24} color="red" />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                    </ScaleDecorator>
                );
            case 'addButton':
                return isEditMode ? (
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => handleAddNewPlace(item.dayIndex)}
                    >
                        <Ionicons name="add" size={20} color="#000" />
                        <Text style={styles.addButtonText}>Add New Place</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.divider} />
                );
        }
    };

    const renderDateButton = () => {
        const isDateSelected = dateState.current.start && dateState.current.end;
        const dateText = getDateRangeText();

        return (
            <TouchableOpacity
                onPress={() => isEditMode && toggleCalendar()}  // Open calendar only in edit mode
                style={isEditMode || isDateSelected ? styles.dateButton : [styles.dateButton, styles.dateButtonUnselected]}
            >
                <LinearGradient
                    colors={isEditMode || isDateSelected ? ['#5468FF', '#81D8D0'] : ['#000000', '#000000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.dateButton}
                >
                    <View style={styles.dateButtonContent}>
                        <DateIconWhite width={24} height={24} />
                        <Text style={[styles.dropdownText, { color: isEditMode || isDateSelected ? 'white' : 'black' }]} numberOfLines={1} ellipsizeMode='tail'>
                            {dateText}
                        </Text>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    const sanitizeItinerary = (itinerary) => {
        // Ensure each day in the itinerary has a 'places' array
        return itinerary.map(day => ({
            ...day,
            places: day.places || []
        }));
    };

    const handleDateRangeSelect = (start, end) => {
        const startMoment = moment(start);
        const endMoment = moment(end);
        const newRangeLength = endMoment.diff(startMoment, 'days') + 1;
        const currentRangeLength = tripDetails.itinerary.length;

        // Sanitize itinerary before using it
        const sanitizedItinerary = sanitizeItinerary(tripDetails.itinerary);

        if (newRangeLength < currentRangeLength) {
            // Check if the extra days are empty
            const hasEmptyEndDays = sanitizedItinerary.slice(newRangeLength).every(day => day.places.length === 0);

            if (hasEmptyEndDays) {
                // Truncate without warning
                updateDateRange(start, end, sanitizedItinerary.slice(0, newRangeLength));
            } else {
                // Show warning modal for truncation, and pass newRangeLength
                setTruncateWarningVisible(true);
                setPendingTruncateRange({ start, end, newRangeLength });
            }
        } else if (newRangeLength > currentRangeLength) {
            // Extend itinerary by adding empty days at the end
            const updatedItinerary = [
                ...sanitizedItinerary,
                ...Array(newRangeLength - currentRangeLength).fill({ places: [] })
            ];
            updateDateRange(start, end, updatedItinerary);
        } else {
            // Same range length, directly update
            updateDateRange(start, end, sanitizedItinerary);
        }
    };

    const updateDateRange = (start, end, itinerary) => {
        const updatedTripDetails = {
            ...tripDetails,
            startDate: start,
            endDate: end,
            itinerary
        };
        setTripDetails(updatedTripDetails);
        setDateState(prev => ({
            ...prev,
            temp: { start, end }
        }));
    };

    // Truncate confirmation handler
    const handleTruncateConfirm = () => {
        const { start, end, newRangeLength } = pendingTruncateRange;
        const sanitizedItinerary = sanitizeItinerary(tripDetails.itinerary);
        updateDateRange(start, end, sanitizedItinerary.slice(0, newRangeLength));
        setTruncateWarningVisible(false);
    };

    const handleSaveDateRange = () => {
        const updatedTripDetails = {
            ...tripDetails,
            startDate: dateState.temp.start,
            endDate: dateState.temp.end,
        };
        setTripDetails(updatedTripDetails);
    };

    const toggleCalendar = () => {
        setCalendarOpen(prevState => !prevState);
    };

    const navigateToFullMap = () => {
        router.push({
            pathname: '/triplist',
            params: {
                tripData: JSON.stringify(tripDetails),
                selectedDay: selectedDay,
                isEditMode: isEditMode,
                from: 'list_details'
            }
        });
    };

    const renderHeader = () => (
        <>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBackPress} style={styles.iconContainer}>
                    <Ionicons name="chevron-back" size={26} color="white" />
                </TouchableOpacity>

                {/* Empty space or flex to center the title or elements if needed */}
                <View style={styles.headerSpacer} />

                {showChatButton && (

                    <TouchableOpacity
                        onPress={() => {
                            if (chatNavRef.current) return;
                            chatNavRef.current = true;
                            setTimeout(() => { chatNavRef.current = false; }, 600);
                            router.push({
                                pathname: '/chatscreen',
                                params: { roomId: chatRoom.id || chatRoom.chatRoomId, roomName: listName }
                            });
                        }}
                        style={styles.iconContainer}>
                        <Ionicons name="chatbubble-outline" size={26} color="white" />
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.listImageContainer}>
                <ExpoImage
                    style={styles.listImage}
                    source={{ uri: currentListImage || listImage }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                    onError={(error) => console.log('Image Load Error:', error)}
                />
                {isEditMode && (
                    <TouchableOpacity style={styles.editOverlay} onPress={handleChangeListImage}>
                        <Ionicons name="add-circle-outline" size={50} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.titleContainer}>
                <OptimizedTextInput
                    initialValue={newListName}
                    isEditMode={isEditMode}
                    onSave={handleSaveListName}
                />
                {!isEditMode && (
                    <TouchableOpacity onPress={() => setIsMenuVisible(true)}>
                        <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.profileContainer}>
                {(collaborators && collaborators.length > 0) ? (
                    <View>
                        {renderCollaboratorImages(collaborators, listUserId, listUserImage)}
                    </View>
                ) : (
                    <>
                        {listUserImage ? (
                            <ExpoImage
                                style={styles.profileImage}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                source={{ uri: listUserImage }}
                                onError={(e) => console.log('Failed to load image', e?.error)}
                            />
                        ) : (
                            <View style={styles.profileIconContainer}>
                                <Ionicons name="person" size={16} color="#888" />
                            </View>
                        )}
                    </>
                )}
                {/* {listUserName &&
                    <Text style={styles.profileName}>{listUserName}</Text>
                } */}
                {listUserName &&
                    <Text style={styles.profileName}>
                        {collaborators && collaborators.length > 0
                            ? `${listUserName} + ${collaborators.length} others`
                            : listUserName
                        }
                    </Text>
                }
            </View>

            {/* 하이라이트 목록 */}
            {/* {highlightsLoading ? (
                <View style={styles.highlightsLoadingContainer}>
                    <ActivityIndicator size="small" color="#007AFF" />
                </View>
            ) : (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.highlightsContainer}
                >
                    {placeHighlights.map((placeHighlight, index) => (
                        <TouchableOpacity
                            key={`highlight-${placeHighlight.placeId}-${index}`}
                            style={styles.highlightItem}
                            onPress={() => handleHighlightPress(placeHighlight)}
                        >
                            <View style={styles.highlightCircle}>
                                <LinearGradient
                                    colors={['#5468FF', '#81D8D0']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.highlightGradientBorder}
                                >
                                    <View style={styles.highlightImageContainer}>
                                        <ExpoImage
                                            source={{
                                                uri: placeHighlight.highlights[0]?.coverImageUrl ||
                                                    placeHighlight.highlights[0]?.mediaItems[0]?.mediaUrl
                                            }}
                                            style={styles.highlightImage}
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                            transition={150}
                                        />
                                    </View>
                                </LinearGradient>
                            </View>
                            <Text style={styles.highlightText} numberOfLines={1}>
                                {placeHighlight.placeName}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                        style={styles.emptyHighlightItem}
                        onPress={handleAddHighlight}
                    >
                        <View style={styles.newHighlightCircle}>
                            <Ionicons name="add" size={26} color="#fff" />
                        </View>
                        <Text style={styles.highlightText}>New</Text>
                    </TouchableOpacity>
                </ScrollView>
            )} */}

            {/* 사진/동영상 선택 모달 */}
            {/* <Modal
                visible={showPhotoPickerModal}
                animationType="slide"
                onRequestClose={handlePhotoPickerClose}
            >
                <PhotoPicker onClose={handlePhotoPickerClose} onMediaSelected={handleMediaSelected} />
            </Modal> */}

            {/* 하이라이트 뷰어 모달 */}
            {/* {selectedHighlight && (
                <Modal
                    visible={showHighlightViewer}
                    animationType="fade"
                    transparent={false}
                    onRequestClose={handleCloseViewer}
                >
                    <HighlightViewer
                        highlight={selectedHighlight}
                        onClose={handleCloseViewer}
                    />
                </Modal>
            )} */}

            {renderDateButton()}
            {
                calendarOpen && isEditMode && (
                    <View style={styles.calendarContainer}>
                        <CalendarManualScreen
                            onSelectRange={handleDateRangeSelect}
                            startDateProp={dateState.temp.start}
                            endDateProp={dateState.temp.end}
                            onClose={toggleCalendar}
                        />
                    </View>
                )
            }
            <View style={styles.mapContainer}>
                {initialRegion && (
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        initialRegion={initialRegion}
                        region={mapRegion}
                    >
                        {tripDetails && tripDetails.itinerary[selectedDay - 1]?.places.length > 0 && (
                            <Polyline
                                coordinates={tripDetails.itinerary[selectedDay - 1].places.map(place => ({
                                    latitude: place.latitude,
                                    longitude: place.longitude,
                                }))}
                                strokeColor="#000000"
                                strokeWidth={2}
                                lineDashPattern={[4]}
                            />
                        )}
                        {filteredPlaces?.map((place, index) => (
                            <CustomMarker
                                key={index}
                                coordinate={{
                                    latitude: place.latitude,
                                    longitude: place.longitude
                                }}
                                index={index}
                            />
                        ))}
                    </MapView>
                )}
                <View style={styles.filterButtonsContainer}>
                    {tripDetails && tripDetails.itinerary.map((_, dayIndex) => (
                        <TouchableOpacity
                            key={dayIndex}
                            onPress={() => setSelectedDayAndUpdateMap(dayIndex + 1)}
                        >
                            <LinearGradient
                                colors={selectedDay === dayIndex + 1 ? ['#5468ff', '#81d8d0'] : ['#000000', '#000000']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[
                                    styles.filterButton,
                                    selectedDay === dayIndex + 1 && styles.filterButtonSelected
                                ]}
                            >
                                <Text style={[
                                    styles.filterButtonText,
                                    selectedDay === dayIndex + 1 && styles.filterButtonTextSelected
                                ]}>
                                    Day {dayIndex + 1}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity onPress={navigateToFullMap} style={styles.expandIcon}>
                    <Ionicons name="expand" size={28} color="#000" style={styles.expandIconImage} />
                </TouchableOpacity>
            </View>
        </>
    );

    const filteredPlaces = tripDetails && selectedDay !== 'All' ?
        tripDetails.itinerary[selectedDay - 1].places :
        allPlaces;

    const handleMenuOptionSelect = async (option) => {
        console.log(`Selected option: ${option}`);
        setIsMenuVisible(false);

        if (option === 'Collaborate with friends') {
            setIsCollaborateModalVisible(true);
        } else if (option === 'Edit TripList') {
            setIsEditMode(true); // Enable edit mode
        } else if (option === 'Add to My Trips') {
            setIsLoading(true);
            const placeIDs = tripDetails.itinerary.map(day => ({
                places: day.places.map(place => place.id)
            }));

            try {
                const tripData = {
                    name: listName,
                    startDate: dateState.current.start,
                    endDate: dateState.current.end,
                    imageUrl: listImage,
                    itinerary: placeIDs
                };

                await createTripList(tripData);
                setIsLoading(false);
                setSuccessMessage('Trip added to your trips successfully!');
            } catch (error) {
                setIsLoading(false);
                console.error('Error adding trip:', error);
            }
        } else if (option === 'Save Changes') {
            setIsEditMode(false);

            if (newListName == '') {
                setAlertVisible(true);
                return;
            }

            const updatedTripDetails = {
                ...tripDetails,
                name: newListName,
                startDate: dateState.temp.start || tripDetails.startDate,
                endDate: dateState.temp.end || tripDetails.endDate,
            };
            console.log("updated trip details", updatedTripDetails)

            setTripDetails(updatedTripDetails);

            try {
                const type = 'edit_triplist';
                await updateTripList(updatedTripDetails, type);
                await AsyncStorage.setItem('listUpdated', 'true');
                if (updatedTripDetails.collaborators) {
                    await AsyncStorage.setItem('updatedCategory', "Collaborate");
                } else {
                    await AsyncStorage.setItem('updatedCategory', "Personal");
                }
                setListName(newListName)
                // setDateRange({ start: updatedTripDetails.startDate, end: updatedTripDetails.endDate });
                setPlacesToRemove([]); // Clear the places to remove after successful save
            } catch (error) {
                console.error('Error saving trip list:', error);
                Alert.alert('Error', 'Failed to save changes. Please try again.');
                setIsEditMode(true);

                // 저장 실패 시 원본 상태로 복원하거나 서버에서 다시 로드
                if (originalTripDetails) {
                    setTripDetails(originalTripDetails);
                    setDateState(prev => ({
                        ...prev,
                        temp: { start: originalTripDetails.startDate, end: originalTripDetails.endDate }
                    }));
                    setNewListName(originalTripDetails.name);
                    setAllPlaces(originalTripDetails.itinerary.flatMap(day => day.places));
                } else {
                    // originalTripDetails가 없는 경우에만 서버에서 다시 로드
                    try {
                        const freshTripData = await fetchTripListById(tripListId);
                        if (freshTripData) {
                            setTripDetails(freshTripData);
                            setDateState(prev => ({
                                ...prev,
                                temp: { start: freshTripData.startDate, end: freshTripData.endDate }
                            }));
                            setNewListName(freshTripData.name);
                            setAllPlaces(freshTripData.itinerary.flatMap(day => day.places));
                        }
                    } catch (reloadError) {
                        console.error('Error reloading trip details:', reloadError);
                    }
                }
            }
        } else if (option === 'Delete TripList') {
            setDeleteModalVisible(true);
        } else if (option === 'Make TripList public' || option === 'Make TripList private') {
            setPrivacyConfirmationVisible(true);
        } else if (option === 'Share') {
            try {
                const rooms = await chatService.getChatLogs();
                setChatRooms(rooms);
                setShareModalVisible(true);
            } catch (error) {
                console.error('Error loading chat rooms:', error);
                Alert.alert('Error', 'Failed to load chat rooms');
            }
        }
    };

    const handleShare = async (selectedRoom) => {
        try {
            await ensureWebSocketConnection();

            const tripMessage = {
                type: 'trip_share',
                content: '',
                timestamp: new Date().toISOString(),
                tripData: {
                    tripListId: tripDetails.tripListId,
                    name: tripDetails.name,
                    imageUrl: tripDetails.imageUrl,
                    totalDays: tripDetails.itinerary.length,
                    totalPlaces: tripDetails.itinerary.reduce(
                        (sum, day) => sum + day.places.length, 0
                    ),
                    startDate: tripDetails.startDate,
                    endDate: tripDetails.endDate,
                    user: tripDetails.user,
                    collaborators: tripDetails.collaborators || []
                }
            };
            webSocketService.sendChatMessage(
                selectedRoom.chatRoomId,
                tripMessage
            );

            setShareModalVisible(false);
            Alert.alert('Success', 'Trip list shared successfully');

        } catch (error) {
            console.error('Error sharing trip:', error);
            Alert.alert('Error', 'Failed to share trip list');
        }
    };

    const confirmDelete = async () => {
        try {
            console.log(tripDetails.tripListId)
            await deleteTriplist(tripDetails.tripListId);
            await AsyncStorage.setItem('listUpdated', 'true');
            await AsyncStorage.removeItem('updatedCategory');

            setDeleteModalVisible(false);
            setTimeout(() => {
                router.replace('/list');
            }, 100);
        } catch (error) {
            console.error('Error deleting TripList:', error);
        }
    }

    const isValidDrag = (fromIndex, toIndex, data) => {
        const fromItem = data[fromIndex];
        const toItem = data[toIndex];

        // If trying to move a place above a day header or below an add button
        if (fromItem.type === 'place') {
            if (toIndex === 0 || (toItem.type === 'dayHeader' && toIndex < fromIndex)) {
                console.log('Invalid drag: Attempted to move place above day header');
                return false;
            }
            // if (toItem.type === 'addButton') {
            //     console.log('Invalid drag: Attempted to move place below add button');
            //     return false;
            // }
        }

        return true;
    };

    const handleDragEnd = ({ data, from, to }) => {
        try {
            // if (!isValidDrag(from, to, originalData)) {
            if (!isValidDrag(from, to, data)) {
                console.log('Invalid drag detected. Rolling back changes.');
                return;
            }

            let currentDayIndex = -1;
            const newItinerary = [];
            let currentDayPlaces = [];

            data.forEach(item => {
                if (item.type === 'dayHeader') {
                    if (currentDayIndex !== -1) {
                        // Add the current day's places (even if empty) to the itinerary
                        newItinerary.push({ places: currentDayPlaces });
                    }
                    currentDayIndex = item.dayIndex;
                    currentDayPlaces = [];
                } else if (item.type === 'place') {
                    item.dayIndex = currentDayIndex;
                    currentDayPlaces.push(item);
                }
            });

            // Add the last day's places to the itinerary
            if (currentDayPlaces.length > 0 || currentDayIndex !== -1) {
                newItinerary.push({ places: currentDayPlaces });
            }

            // Ensure the itinerary matches the original day structure with placeholders for empty days
            const originalDayIndices = originalData
                .filter(item => item.type === 'dayHeader')
                .map(item => item.dayIndex);

            const completeItinerary = originalDayIndices.map(dayIndex => {
                const foundDay = newItinerary.find((day, index) => day.places[0]?.dayIndex === dayIndex);
                return foundDay || { places: [] }; // Maintain day index and add empty days as needed
            });

            setTripDetails(prevData => ({
                ...prevData,
                itinerary: completeItinerary
            }));

        } catch (error) {
            console.error('Error during drag and drop:', error);
        }
    };

    const confirmPrivacyChange = async () => {
        const newIsPublic = !tripDetails.isPublic;
        try {
            await updateTripListPrivacy(tripDetails.tripListId, newIsPublic);
            setTripDetails(prevDetails => ({
                ...prevDetails,
                isPublic: newIsPublic
            }));
            console.log(`TripList privacy updated to: ${newIsPublic ? 'public' : 'private'}`);

            // Show notification
            if (notificationTimeoutRef.current) {
                clearTimeout(notificationTimeoutRef.current);
            }
            setNotificationMessage(`TripList is now ${newIsPublic ? 'public' : 'private'}.`);
            notificationTimeoutRef.current = setTimeout(() => setNotificationMessage(''), 3000);

        } catch (error) {
            console.error('Error updating trip list privacy:', error);
        } finally {
            setPrivacyConfirmationVisible(false);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <SkeletonLoader />
            </SafeAreaView>
        );
    }

    if (!tripDetails) {
        return (
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>No trip details available</Text>
            </SafeAreaView>
        );
    }

    return (
        // <KeyboardAvoidingView style={styles.container} behavior="padding">
        <SafeAreaView style={styles.container}>
            <View style={{ flex: 1 }}>
                {/* Notification Message */}
                {notificationMessage && (
                    <View style={styles.notificationContainer}>
                        <Text style={styles.notificationText}>{notificationMessage}</Text>
                    </View>
                )}

                {/* 성공 메시지 표시 */}
                {successMessage ? (
                    <View style={styles.successMessageContainer}>
                        <Text style={styles.successMessageText}>{successMessage}</Text>
                    </View>
                ) : null}
                <DraggableFlatList
                    data={flatListData}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => {
                        if (item.type === 'place') return `place-${item.id}-${item.dayIndex}`;
                        if (item.type === 'dayHeader') return `header-${item.dayIndex}`;
                        if (item.type === 'addButton') return `add-${item.dayIndex}`;
                        return `item-${index}`;
                    }}
                    onDragBegin={(index) => {
                        setOriginalData([...flatListData]);
                        console.log('Drag started at index:', index);
                    }}
                    onDragEnd={handleDragEnd}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.draggableListContainer}
                    dragItemOverflow={true}
                    activationDistance={10}
                />
                {isEditMode && (
                    <LinearGradient
                        style={styles.floatingSaveButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        colors={['#5468ff', '#81d8d0']}
                    >
                        <TouchableOpacity
                            style={styles.floatingSaveContainer}
                            onPress={() => handleMenuOptionSelect('Save Changes')}
                        >
                            <Ionicons name="save-outline" size={24} color="#fff" style={styles.saveButtonIcon} />
                            <Text style={[styles.saveButtonText]}>Save</Text>

                        </TouchableOpacity>
                    </LinearGradient>
                )}

                {listUserId &&
                    <MenuModal
                        isVisible={isMenuVisible}
                        onClose={() => setIsMenuVisible(false)}
                        onOptionSelect={handleMenuOptionSelect}
                        listImage={currentListImage || listImage}
                        listName={listName}
                        isEditMode={isEditMode}
                        userId={user?.id || user?.userId}
                        triplistUserId={listUserId}
                        collaborators={collaborators}
                        isPublic={tripDetails?.isPublic}
                    />
                }
                <ConfirmationModal
                    visible={permissionModalVisible}
                    title="No Permission"
                    message="Permission to access images was denied."
                    onConfirm={() => setPermissionModalVisible(false)}
                    confirmText="OK"
                    cancelText=''
                />
                <ConfirmationModal
                    visible={deleteModalVisible}
                    title="Delete TripList"
                    message="Are you sure you want to delete this TripList?"
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteModalVisible(false)}
                    confirmText="Delete"
                    cancelText='Cancel'
                />
                <ConfirmationModal
                    visible={backModalVisible}
                    title="Leave Without Saving"
                    message={(
                        <Text>
                            Your trip list will not be saved.{"\n"}
                            Are you sure you want to stop editing?
                        </Text>
                    )}
                    onConfirm={() => handleBack()}
                    onCancel={() => setBackModalVisible(false)}
                    confirmText="Yes"
                    cancelText="Cancel"
                />
                {tripDetails &&
                    <CollaborateModal
                        isVisible={isCollaborateModalVisible}
                        onClose={() => setIsCollaborateModalVisible(false)}
                        tripListId={tripDetails.tripListId}
                        onCollaboratorAdded={handleAddCollaborator}
                    />
                }
                <ConfirmationModal
                    visible={alertVisible}
                    title="Your trip list name is empty"
                    message="Please enter the name of your trip list."
                    onConfirm={() => setAlertVisible(false)}
                    confirmText="OK"
                    cancelText=''
                />
                <ConfirmationModal
                    visible={privacyModalVisible}
                    title="Privacy Update"
                    message={privacyUpdateMessage}
                    onConfirm={() => setPrivacyModalVisible(false)}
                    confirmText="OK"
                    cancelText=''
                />
                <ConfirmationModal
                    visible={truncateWarningVisible}
                    title="Warning"
                    message="Your new date range is shorter than your current schedule. If you proceed, all activities outside the date range will be removed."
                    onConfirm={handleTruncateConfirm}
                    onCancel={() => setTruncateWarningVisible(false)}
                    confirmText="Proceed"
                    cancelText="Cancel"
                />
                <ConfirmationModal
                    visible={privacyConfirmationVisible}
                    title="Change Privacy"
                    message={`Are you sure you want to make this TripList ${tripDetails.isPublic ? 'private' : 'public'}?`}
                    onConfirm={confirmPrivacyChange}
                    onCancel={() => setPrivacyConfirmationVisible(false)}
                    confirmText="Yes"
                    cancelText="No"
                />
                <ShareModal
                    visible={shareModalVisible}
                    onClose={() => setShareModalVisible(false)}
                    onSend={handleShare}
                    chatRooms={chatRooms}
                />
            </View>
        </SafeAreaView>

    );
};

export default ListDetails;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: "space-between",
        alignItems: 'center',
        width: "100%",
        paddingHorizontal: 8,
        paddingVertical: 12,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        // marginVertical: 3
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
        flex: 1,
        textAlign: "left",
        paddingBottom: 4,
    },
    titleInput: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
        flex: 1,
        textAlign: "left",
        borderBottomWidth: 1,
        borderColor: '#ccc',
        paddingBottom: 3,
    },
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        marginTop: 10,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    profileIconContainer: {
        padding: 5,
        borderRadius: 20,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: "hidden",
    },
    profileName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: "700",
        marginLeft: 8,
        flex: 1,
    },
    listImageContainer: {
        position: 'relative',
        width: 250,
        height: 250,
        alignSelf: 'center',
        overflow: 'hidden',
    },
    editOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listImage: {
        width: '100%',
        height: '100%',
        bottom: 14,
        alignSelf: 'center'
    },
    mapContainer: {
        position: 'relative',
        width: '97%',
        height: 225,
        alignSelf: "center",
        marginTop: 5,
        marginVertical: 16,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 10,
    },
    marker: {
        backgroundColor: 'black',
        borderRadius: 15,
        padding: 5,
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
    },
    markerText: {
        color: 'white',
        fontWeight: 'bold',
    },
    dragIcon: {
        marginRight: 15,
        marginLeft: -10,
        color: '#fff',
    },
    moreIcon: {
        marginLeft: 10,
        color: '#fff',
    },
    draggableListContainer: {
        backgroundColor: '#000',
        paddingBottom: 20,
    },
    dayHeader: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        // backgroundColor: '#1a1a1a',
    },
    dayTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    calendarContainer: {
        borderColor: 'white',
        borderWidth: 1,
        paddingHorizontal: 28,
        borderRadius: 10,
        marginVertical: 6,
    },
    placeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        // backgroundColor: '#1a1a1a', 
        marginVertical: 5,
        borderRadius: 10,
    },
    placeImage: {
        width: 76,
        height: 76,
        borderRadius: 0,
        marginLeft: 10,
    },
    placeTextContainer: {
        flex: 1,
        marginHorizontal: 16,
    },
    placeTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        paddingBottom: 4,
    },
    placeAddress: {
        color: '#fff',
        fontSize: 12,
        paddingBottom: 4,

    },
    placeRating: {
        color: '#fff',
        fontSize: 12,
    },
    activeItem: {
        backgroundColor: '#333',
    },
    addButton: {
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 10,
        margin: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    addButtonText: {
        color: '#000',
        fontSize: 12,
        fontWeight: 600,
        textAlign: 'center', // Center text horizontally
    },
    filterButtonsContainer: {
        position: 'absolute',
        top: 10,
        left: 10,
        flexDirection: 'row',
        zIndex: 1,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginRight: 8,
    },
    filterButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    filterButtonTextSelected: {
        color: '#FFFFFF',
    },
    expandIcon: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 5,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    expandIconImage: {
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.20,
        shadowRadius: 1.41,
        elevation: 2,
    },
    dragIconContainer: {
        paddingLeft: 10,
    },
    divider: {
        height: 1,
        backgroundColor: '#ccc',
        marginVertical: 8,
        marginHorizontal: 10,
    },
    floatingSaveButton: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        borderRadius: 50,
        paddingHorizontal: 15,
        paddingVertical: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    floatingSaveContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    saveButtonIcon: {
        marginRight: 5,
    },
    saveButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Montserrat-SemiBold',
        color: '#fff',
    },
    collaboratorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // 가운데 정렬을 위해 추가
    },
    collaboratorImage: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginLeft: -8,
        borderWidth: 2,
        borderColor: '#000',
    },
    highlightsContainer: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    highlightItem: {
        alignItems: 'center',
        marginHorizontal: 3,
        width: 64,
    },
    highlightCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        padding: 2, // Space for gradient border
        marginBottom: 6,
    },
    highlightGradientBorder: {
        width: '100%',
        height: '100%',
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    highlightImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#000',
    },
    highlightImage: {
        width: '100%',
        height: '100%',
    },
    newHighlightCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#444',
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    highlightText: {
        fontSize: 13,
        fontWeight: '400',
        textAlign: 'center',
        color: '#fff',
        width: 75,
        opacity: 0.8,
    },
    emptyHighlights: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 100,
    },
    highlightsLoadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    highlightsLoadingText: {
        color: '#fff',
        marginLeft: 10,
        fontSize: 14,
    },
    emptyHighlightItem: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 70,
    },
    highlightCount: {
        color: '#ccc',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 2,
    },
    centerImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginLeft: -8,
        zIndex: 3,
        borderWidth: 3,
        borderColor: '#000',
    },
    headerSpacer: {
        flex: 1,
    },
    iconContainer: {
        padding: 5,
    },
    extraCollaborators: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#4a4a4a',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: -8,
        borderWidth: 2,
        borderColor: '#000',
    },
    extraCollaboratorsText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    dateButton: {
        borderRadius: 10,
        overflow: 'hidden',
        marginVertical: 10,
        marginHorizontal: 4,
    },
    dateButtonUnselected: {
        backgroundColor: '#FFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 45,
    },
    dateButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 45,
    },
    dropdownText: {
        flex: 1,
        fontSize: 12,
        marginLeft: 10,
    },
    successMessageContainer: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        zIndex: 10,
    },
    successMessageText: {
        color: '#ffffff',
        fontSize: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 10,
        borderRadius: 20,
    },
    notificationContainer: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    notificationText: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: '#fff',
        padding: 10,
        borderRadius: 20,
    },
});
