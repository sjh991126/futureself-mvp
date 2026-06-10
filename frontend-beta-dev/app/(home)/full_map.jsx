import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPlaces } from '../slices/placesSlice';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PencilIcon from '../../assets/icons/pencil_icon';
import { StyleSheet, View, Text, Animated, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Keyboard, Alert } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import BottomSheet, { BottomSheetFlatList, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CustomMarker from '../../assets/components/custom_marker';
import { useRouter } from 'expo-router';
import ImageViewing from 'react-native-image-viewing';
import { Handle, CustomBackground } from '../../assets/components/custom_handle';
import ReviewHandle from '../../assets/components/review_handle';
import GoogleReviews from '../../assets/components/google_reviews';
import ExternalHandle from '../../assets/components/external_handle';
import Icon from 'react-native-vector-icons/Ionicons';
import Star from '../../assets/components/star_component';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getTriplist } from '../src/api/my_triplist';
import { Ionicons } from '@expo/vector-icons';
import { TokenManager } from '../src/config';
import { placeViewS3 } from '../src/api/s3_upload';
import { placeView } from '../src/api/ViewCounts';
import { useAppState } from "../src/AppStateHandler";
import { fetchLocation } from '../slices/locationSlice';
import { togglePlaceLike } from '../src/api/LikeCheck';
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';
import * as chatService from './../src/api/chat';
import { getChatLogs } from './../src/api/chat';
import FilledHeart from '../../assets/icons/filled_heart';
import ShareModal from '../../assets/components/share_modal';
import { getPlaceDetail } from '../src/api/places';
import WebSocketService from '../src/api/WebSocketService';

const PlaceInfoSkeleton = () => (
    <View style={styles.bottomSheetContent}>
        <View style={styles.placeInfoContainer}>
            <View style={[styles.skeleton, { width: '70%', height: 24, marginBottom: 12 }]} />
        </View>
        <View style={[styles.skeleton, { width: '50%', height: 16, marginBottom: 8 }]} />
        <View style={[styles.skeleton, { width: '80%', height: 14, marginBottom: 16 }]} />

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {[1, 2, 3].map((i) => (
                <View key={i} style={[styles.skeleton, { width: 100, height: 100, borderRadius: 10 }]} />
            ))}
        </View>

        <View style={[styles.skeleton, { width: '100%', height: 60, marginBottom: 16 }]} />
    </View>
);

const resolvePlaceId = (place) => {
    if (!place) return null;
    return place.googleId || place.googleID || place.googleid || place.placeId || place.id || null;
};

const normalizePlace = (place) => {
    if (!place) return place;
    const normalizedPlaceId = resolvePlaceId(place);
    if (!normalizedPlaceId) return { ...place };
    return {
        ...place,
        googleId: normalizedPlaceId,
    };
};

export default function full_map() {
    const router = useRouter();
    const dispatch = useDispatch();
    const places = useSelector((state) => state.places.places);
    const isLoading = useSelector((state) => state.places.isLoading);
    const user = useSelector((state) => state.user.data);
    const location = useSelector((state) => state.location.data); // Get location data from Redux
    const setLastUsedFeature = useAppState();
    const [isImageViewerVisible, setImageViewerVisible] = useState(false);
    const [imageViewerIndex, setImageViewerIndex] = useState(0);
    const [imageUrlsArray, setImageUrlsArray] = useState([]);
    const [isPlaceLoading, setIsPlaceLoading] = useState(false);
    const [placeLoadError, setPlaceLoadError] = useState(null);

    const { latitude, longitude, placeId, selectedPlace: selectedPlaceParam, from } = useLocalSearchParams();

    const defaultLatitude = 22.2838;
    const defaultLongitude = 114.1374;

    const initialRegion = {
        latitude: latitude ? parseFloat(latitude) : defaultLatitude,
        longitude: longitude ? parseFloat(longitude) : defaultLongitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    const snapPoints = useMemo(() => ['50%', '78%'], []);
    const [selectedPlaceForTrip, setSelectedPlaceForTrip] = useState(null);
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [previousSelectedMarker, setPreviousSelectedMarker] = useState(null);
    const [currentSnapIndex, setCurrentSnapIndex] = useState(0);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [chatRooms, setChatRooms] = useState([]);
    const [sending, setSending] = useState(false);
    const [showLikeToast, setShowLikeToast] = useState(false);
    const toastOpacity = useRef(new Animated.Value(0)).current;

    const [bottomSheetSearchQuery, setBottomSheetSearchQuery] = useState('');
    const [isAddSheetVisible, setAddSheetVisible] = useState(false);
    const addSheetRef = useRef(null);
    const [selectedPlaceId, setSelectedPlaceId] = useState(null);
    const [filteredPlaces, setFilteredPlaces] = useState([]);
    const [activeTab, setActiveTab] = useState("Tab1");

    const [selectedPlace, setSelectedPlace] = useState(null);
    const selectedMarkerId = resolvePlaceId(selectedMarker);
    const likeActionKey = `place:like:${selectedMarkerId || placeId || 'unknown'}`;
    const { run: runToggleLike, isRunning: isLiking } = useSingleFlightAction(likeActionKey);
    const { run: runAddToTriplist, isRunning: isAddingToTriplist } = useSingleFlightAction('full-map:add-to-triplist');

    const mapRef = useRef(null);
    const webSocketService = useRef(new WebSocketService(router)).current;

    const [liked, setLiked] = useState(false);

    useEffect(() => {
        setLastUsedFeature('TrippyMap');
    }, [setLastUsedFeature]);

    useEffect(() => {
        dispatch(fetchPlaces());
    }, [dispatch]);

    useEffect(() => {
        setFilteredPlaces(places);
    }, [places]);

    useEffect(() => {
        const loadPlaceFromId = async () => {
            if (!placeId) return;

            setIsPlaceLoading(true);
            setPlaceLoadError(null);

            try {
                console.log('Loading place from ID:', placeId);
                const fullData = await getPlaceDetail(placeId);

                const normalizedFullData = normalizePlace(fullData);
                setSelectedPlace(normalizedFullData);
                setSelectedMarker(normalizedFullData);
                setSelectedPlaceForTrip(normalizedFullData);
                setLiked(fullData.isLiked || false);

                if (fullData.latitude && fullData.longitude && mapRef.current) {
                    mapRef.current.animateToRegion({
                        latitude: fullData.latitude,
                        longitude: fullData.longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                    }, 1000);
                }
            } catch (error) {
                console.error('Error loading place from ID:', error);
                setPlaceLoadError(error.message);
            } finally {
                setIsPlaceLoading(false);
            }
        };

        loadPlaceFromId();
    }, [placeId]);

    const [lists, setLists] = useState([]);
    const [filteredLists, setFilteredLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTripList, setSelectedTripList] = useState(null);

    useEffect(() => {
        const loadPlaceDetail = async () => {
            if (!selectedPlaceParam || placeId) return; // placeId 우선

            const place = JSON.parse(selectedPlaceParam);
            const hasFullData = place.imageUrls && Array.isArray(place.imageUrls) && place.imageUrls.length > 0;

            if (!hasFullData || !place.id) {
                setIsPlaceLoading(true);
                try {
                    const fullData = await getPlaceDetail(place.id);
                    const normalizedFullData = normalizePlace(fullData);
                    setSelectedPlace(normalizedFullData);
                    setSelectedMarker(normalizedFullData);
                    setSelectedPlaceForTrip(normalizedFullData);

                    if (fullData.latitude && fullData.longitude && mapRef.current) {
                        mapRef.current.animateToRegion({
                            latitude: fullData.latitude,
                            longitude: fullData.longitude,
                            latitudeDelta: 0.005,
                            longitudeDelta: 0.005,
                        }, 1000);
                    }
                } catch (error) {
                    console.error('Error loading place detail:', error);
                    if (place.id) {
                        const normalizedPlace = normalizePlace(place);
                        setSelectedPlace(normalizedPlace);
                        setSelectedMarker(normalizedPlace);
                        setSelectedPlaceForTrip(normalizedPlace);
                    }
                } finally {
                    setIsPlaceLoading(false);
                }
            } else {
                const normalizedPlace = normalizePlace(place);
                setSelectedPlace(normalizedPlace);
                setSelectedMarker(normalizedPlace);
                setSelectedPlaceForTrip(normalizedPlace);

                if (place.latitude && place.longitude && mapRef.current) {
                    mapRef.current.animateToRegion({
                        latitude: place.latitude,
                        longitude: place.longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                    }, 1000);
                }
            }
        };

        loadPlaceDetail();
    }, [selectedPlaceParam, placeId]);

    useEffect(() => {
        const fetchTripLists = async () => {
            try {
                const tripLists = await getTriplist();
                setLists(tripLists);
                setFilteredLists(tripLists);
            } catch (error) {
                console.error('Error fetching trip lists:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTripLists();
    }, []);

    useEffect(() => {
        const loadChatRooms = async () => {
            try {
                const rooms = await getChatLogs();
                setChatRooms(rooms);
            } catch (error) {
                console.error('Error loading chat rooms:', error);
            }
        };
        loadChatRooms();
    }, []);

    const handleShare = () => {
        setShareModalVisible(true);
    };


    useEffect(() => {
        dispatch(fetchLocation()); // Fetch user location
    }, [dispatch]);

    useEffect(() => {
        if (location && mapRef.current && !selectedPlace) { // Only update if no place is selected
            mapRef.current.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            }, 1000);
        }
    }, [location, selectedPlace]);

    useEffect(() => {
        if (selectedMarker) {
            console.log('Selected marker changed:', {
                id: selectedMarkerId,
                name: selectedMarker.name,
                isLiked: selectedMarker.isLiked
            });

            setLiked(selectedMarker.isLiked || false);
            setSelectedPlaceForTrip(selectedMarker);
        }
    }, [selectedMarker, selectedMarkerId]);

    const handleToggleLike = async () => {
        await runToggleLike(async () => {
            if (!selectedMarker) return;
            const likeTargetId = resolvePlaceId(selectedMarker) || placeId;

            if (!likeTargetId) {
                console.error('No place ID available');
                Alert.alert('Error', 'Cannot like this place');
                return;
            }

            const previousLiked = liked;
            const newLikedState = !liked;

            setLiked(newLikedState);

            setSelectedMarker(prev => ({
                ...prev,
                isLiked: newLikedState,
                numLikes: newLikedState
                    ? (prev.numLikes || 0) + 1
                    : Math.max((prev.numLikes || 0) - 1, 0)
            }));

            if (newLikedState) {
                showToast();
            }
            try {
                const data = await togglePlaceLike(likeTargetId);

                // 서버 응답으로 최종 동기화
                setLiked(data.liked);
                setSelectedMarker(prev => ({
                    ...prev,
                    isLiked: data.liked,
                    numLikes: data.totalLikes || prev.numLikes
                }));

            } catch (error) {
                console.error('Error toggling like:', error);

                // Rollback on error
                setLiked(previousLiked);
                setSelectedMarker(prev => ({
                    ...prev,
                    isLiked: previousLiked,
                    numLikes: previousLiked
                        ? (prev.numLikes || 0) + 1
                        : Math.max((prev.numLikes || 0) - 1, 0)
                }));

                Alert.alert('Error', 'Failed to update like status');
            }
        });
    };

    const renderStars = (rating) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;

        for (let i = 1; i <= fullStars; i++) {
            stars.push(<Star key={i} filled />);
        }

        if (hasHalfStar) {
            stars.push(<Star key={fullStars + 1} halfFilled />);
        }

        return stars;
    };

    const handleBottomSheetSearch = (query) => {
        setBottomSheetSearchQuery(query);
        setFilteredLists(lists.filter(tripList =>
            tripList && (
                (tripList.name && tripList.name.toLowerCase().includes(query.toLowerCase()))
            )
        ));
    };

    const handleAddPress = () => {
        setPreviousSelectedMarker(selectedMarker)
        setAddSheetVisible(true);
        setSelectedMarker(null);
    };

    const handleCancelPress = () => {
        setAddSheetVisible(false);
        setSelectedMarker(previousSelectedMarker);
        setSelectedPlaceId(null);
    };

    const handleTripListSelect = (tripListId) => {
        setSelectedTripList(tripListId === selectedTripList ? null : tripListId);
    };

    const handleSheetClose = () => {
        setSelectedMarker(null);
        // setSelectedPlace(null); // Reset the map
    };

    const handleMarkerPress = (marker) => {
        console.log('마커가 선택되었습니다:', marker);
        const normalizedMarker = normalizePlace(marker);
        setSelectedMarker(normalizedMarker);
        setSelectedPlaceForTrip(normalizedMarker); // 선택된 장소를 별도의 상태에 저장
    };

    const navigateToSearchPage = () => {
        console.log('search pressed');
        router.push({
            pathname: 'search_page',
            params: {}
        });
    };

    useEffect(() => {
        if (selectedPlace) {
            setFilteredPlaces([selectedPlace]);
        } else {
            // Logic to show Trippy 100 markers
            setFilteredPlaces(places.filter(place => place.markerType == 1));
        }
    }, [selectedPlace, places]);

    const showToast = () => {
        setShowLikeToast(true);

        // Fade in
        Animated.timing(toastOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        // Auto hide after 3 seconds
        setTimeout(() => {
            Animated.timing(toastOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setShowLikeToast(false);
            });
        }, 3000);
    };

    const navigateToLikedPlaces = () => {
        // Toast 닫기
        Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setShowLikeToast(false);
        });

        // 좋아요 목록 페이지로 이동
        router.push('/liked_places');
    };

    const handleSendToChat = async (selectedRoom) => {
        setSending(true);
        try {
            const targetRoomId = selectedRoom?.chatRoomId || selectedRoom?.roomId || selectedRoom?.id;
            if (!targetRoomId) {
                throw new Error('No chat room id available');
            }

            const placeMessage = {
                type: 'place_share',
                content: '',
                timestamp: new Date().toISOString(),
                placeData: {
                    placeId: resolvePlaceId(selectedMarker),
                    placeName: selectedMarker.name,
                    placeAddress: selectedMarker.shortFormattedAddress,
                    placeSummary: selectedMarker.summary,
                    placeRating: parseFloat(selectedMarker.rating),
                    imageUrls: selectedMarker.imageUrls || [],
                    googleid: resolvePlaceId(selectedMarker)
                }
            };
            await webSocketService.sendOneTimeMessage(targetRoomId, placeMessage);

            setShareModalVisible(false);
            Alert.alert('Success', 'Place shared successfully');

        } catch (error) {
            console.error('Error sending place:', error);
            Alert.alert('Error', 'Failed to share place');
        } finally {
            setSending(false);
        }
    };

    const handleTrippy100Press = () => {
        const trippyPlaces = places.filter(p =>
            p && p.markerType == 1 && p.latitude && p.longitude
        );

        if (trippyPlaces.length === 0 || !mapRef.current) return;

        // marker 목록 리셋
        setSelectedPlace(null);
        setSelectedMarker(null);
        setFilteredPlaces(trippyPlaces);

        const coordinates = trippyPlaces.map(p => ({
            latitude: p.latitude,
            longitude: p.longitude,
        }));

        mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: {
                top: 80,
                right: 60,
                bottom: 120, // bottom sheet 고려
                left: 60,
            },
            animated: true,
        });
    };

    const handleBackPress = () => {
        if (from === 'elastic_search') {
            router.push('/elastic_search');
        } else {
            router.back('/homepage');
        }
    };

    const sendViewDataToS3 = async (userId, placeId) => {
        const viewData = {
            userId,
            placeId,
            timestamp: new Date().toISOString(),
        };

        try {
            await placeViewS3(viewData);
        } catch (error) {
            console.error('Error sending view data to S3:', error);
        }
    };

    const renderHeartIcon = () => {
        if (liked) {
            return <FilledHeart style={styles.actionIcon} />;
        } else {
            return <Ionicons name="heart-outline" size={24} color="#fff" style={styles.actionIcon} />;
        }
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={Keyboard.dismiss}>
                <View style={styles.container}>
                    {currentSnapIndex !== 2 && (
                        <>
                            <TouchableOpacity style={styles.back} onPress={handleBackPress}>
                                <Ionicons name="chevron-back" size={26} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.searchContainerWrapper}
                                onPress={filteredPlaces.length !== 1 ? navigateToSearchPage : handleBackPress}
                            >
                                <View style={styles.searchContainer}>
                                    <Ionicons name="search" size={20} color="#000" />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Tap here to search locations"
                                        placeholderTextColor="#808080"
                                        editable={false}
                                        pointerEvents="none"
                                        value={selectedPlace ? selectedPlace.name : ''}
                                    />
                                </View>
                            </TouchableOpacity>
                        </>
                    )}
                    {/* {isLoading && places.length === 0 && (
                        <View style={styles.loadingTextContainer}>
                            <Text style={styles.loadingText}>
                                Loading places, please wait..
                            </Text>
                        </View>
                    )} */}
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        initialRegion={initialRegion}
                        showsUserLocation={true}
                        followsUserLocation={false}
                    >
                        {filteredPlaces.map((place) => {
                            return (
                                place && place.latitude && place.longitude && (
                                    <CustomMarker
                                        key={resolvePlaceId(place) || place.id}
                                        place={place}
                                        onPress={() => {
                                            handleMarkerPress(place);
                                        }}
                                        focused={selectedMarker && selectedMarkerId === resolvePlaceId(place)}
                                    />
                                )
                            );
                        })}
                    </MapView>
                    <View style={styles.filterContainer}>
                        <TouchableOpacity onPress={handleTrippy100Press}>

                            <LinearGradient
                                style={styles.filterButton}
                                start={{ x: 0, y: 1 }}
                                end={{ x: 0, y: 0 }}
                                colors={['#81d8d0', '#5468ff']}
                                locations={[0, 1]}
                                useAngle={true}
                                angle={45}
                                angleCenter={{ x: 0.5, y: 0.5 }}
                            >
                                <Text style={styles.filterText}>Trippy 100</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                    {(selectedMarker || isPlaceLoading) && (
                        <BottomSheet
                            snapPoints={snapPoints}
                            backgroundComponent={CustomBackground}
                            handleComponent={Handle}
                            onChange={(index) => setCurrentSnapIndex(index)}
                            enablePanDownToClose={true}
                            onClose={handleSheetClose}
                            style={styles.bottomSheet}
                            nestedScrollEnabled={true}
                        >
                            {isPlaceLoading ? (
                                <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
                                    <PlaceInfoSkeleton />
                                </BottomSheetScrollView>
                            ) : placeLoadError ? (
                                <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
                                    <View style={styles.errorContainer}>
                                        <Ionicons name="alert-circle-outline" size={60} color="#666" />
                                        <Text style={styles.errorText}>Failed to load place details</Text>
                                        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                                            <Text style={{ color: '#5468ff' }}>Go Back</Text>
                                        </TouchableOpacity>
                                    </View>
                                </BottomSheetScrollView>
                            ) : selectedMarker ? (
                                <BottomSheetScrollView
                                    contentContainerStyle={styles.bottomSheetContent}
                                    showsVerticalScrollIndicator={false}
                                >
                                    <View style={styles.placeInfoContainer}>
                                        <Text style={styles.placeName}>
                                            {selectedMarker.name}
                                        </Text>
                                        <View style={styles.placeActions}>
                                            <TouchableOpacity onPress={() => handleShare(selectedMarker)}>
                                                <Ionicons name="share-outline" size={24} color="#fff" style={styles.actionIcon} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={handleToggleLike}
                                                disabled={isLiking}
                                                style={isLiking ? { opacity: 0.6 } : undefined}
                                            >
                                                {renderHeartIcon()}
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={handleAddPress}>
                                                <Ionicons name="add-circle-outline" size={24} color="#fff" style={styles.actionIcon} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <View style={styles.ratingRow}>
                                        <View style={styles.ratingStatsGroup}>
                                            <Text style={styles.ratingText}>{selectedMarker.rating}</Text>
                                            {renderStars(selectedMarker.rating)}

                                            <View style={styles.statsRow}>
                                                <View style={styles.statItem}>
                                                    <Ionicons name="heart" size={14} color="#fff" style={{ marginRight: 4 }} />
                                                    <Text style={styles.statText}>{selectedMarker.numLikes || 0}</Text>
                                                </View>
                                                <Text style={styles.dotSeparator}>·</Text>
                                                <View style={styles.statItem}>
                                                    <Ionicons name="eye" size={14} color="#fff" style={{ marginRight: 4 }} />
                                                    <Text style={styles.statText}>{selectedMarker.viewCount || 0}</Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Review 버튼을 여기로 이동 */}
                                        {activeTab === "Tab1" && (
                                            <TouchableOpacity
                                                style={styles.reviewButton}
                                                onPress={async () => {
                                                    try {
                                                        await AsyncStorage.setItem('placeId', String(selectedMarkerId || ''));
                                                        await AsyncStorage.setItem('title', selectedMarker.name);
                                                        router.push('/write_review');
                                                    } catch (error) {
                                                        console.error('Error saving data to AsyncStorage:', error);
                                                    }
                                                }}
                                            >
                                                <PencilIcon size={14} style={{ marginRight: 6 }} />
                                                <Text style={styles.reviewButtonText}>Review</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <Text
                                        style={styles.addressText}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        {selectedMarker.shortFormattedAddress}
                                    </Text>
                                    <FlatList
                                        data={selectedMarker.imageUrls || []}
                                        horizontal
                                        keyExtractor={(item, index) => index.toString()}
                                        renderItem={({ item, index }) => (
                                            item ? (
                                                <TouchableOpacity onPress={() => {
                                                    setImageViewerIndex(index);
                                                    const images = selectedMarker.imageUrls || [];
                                                    setImageUrlsArray(images.map(url => ({ uri: url })));
                                                    setImageViewerVisible(true);
                                                }}>
                                                    <ExpoImage
                                                        source={{ uri: item }}
                                                        style={styles.markerImage}
                                                        contentFit="cover"
                                                        cachePolicy="memory-disk"
                                                        transition={150}
                                                    />
                                                </TouchableOpacity>
                                            ) : null
                                        )}
                                        contentContainerStyle={styles.imageScrollView}
                                        style={styles.imageList}
                                    />

                                    <Text style={styles.summaryText}>{selectedMarker.summary}</Text>

                                    <View style={styles.divider} />

                                    {/* Header buttons */}
                                    <View style={styles.tabContainer} nestedScrollEnabled={true}>
                                        <View style={styles.tabHeader}>
                                            <TouchableOpacity
                                                style={styles.tabButton}
                                                onPress={() => { setActiveTab("Tab1"); console.log(activeTab) }}
                                            >
                                                <Text style={[
                                                    styles.tabButtonText,
                                                    activeTab === "Tab1" && styles.tabActiveText,
                                                ]}>Trippy</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.tabButton}
                                                onPress={() => { setActiveTab("Tab2"); console.log(activeTab) }}
                                            >
                                                <Text style={[
                                                    styles.tabButtonText,
                                                    activeTab === "Tab2" && styles.tabActiveText,
                                                ]}>   Google</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.tabButton}
                                                onPress={() => { setActiveTab("Tab3"); console.log(activeTab) }}
                                            >
                                                <Text style={[
                                                    styles.tabButtonText,
                                                    activeTab === "Tab3" && styles.tabActiveText,
                                                ]}>Instagram</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.tabContent}>
                                            {/* Trippy Reviews */}
                                            {activeTab === "Tab1" && selectedMarkerId && (
                                                <ReviewHandle
                                                    key={`trippy-${selectedMarkerId}`}
                                                    id={selectedMarkerId}
                                                    name={selectedMarker?.name || ''}
                                                    googleid={selectedMarkerId}
                                                />
                                            )}

                                            {/* Google Reviews */}
                                            {activeTab === "Tab2" && selectedMarkerId && (
                                                <GoogleReviews
                                                    key={`google-${selectedMarkerId}`}
                                                    googleid={selectedMarkerId}
                                                />
                                            )}

                                            {/* Instagram */}
                                            {activeTab === "Tab3" && selectedMarker?.name && (
                                                <ExternalHandle
                                                    key={`instagram-${selectedMarker.name}`}
                                                    location_query={selectedMarker.name}
                                                />
                                            )}
                                        </View>
                                    </View>
                                </BottomSheetScrollView>
                            ) : null}
                        </BottomSheet>
                    )}
                    <ImageViewing
                        images={imageUrlsArray}
                        imageIndex={imageViewerIndex}
                        visible={isImageViewerVisible}
                        onRequestClose={() => setImageViewerVisible(false)}
                    />
                    <ShareModal
                        visible={shareModalVisible}
                        onClose={() => setShareModalVisible(false)}
                        onSend={handleSendToChat}
                        chatRooms={chatRooms}
                    />
                    {isAddSheetVisible && (
                        <BottomSheet
                            ref={addSheetRef}
                            index={0}
                            snapPoints={['55%', '80%']}
                            enableDynamicSizing={false}
                            backgroundComponent={CustomBackground}
                            handleComponent={Handle}
                            enablePanDownToClose={true}
                            enableHandlePanningGesture={true}
                            enableContentPanningGesture={true}
                            onClose={() => setAddSheetVisible(false)}
                        >
                            <View style={styles.addSheetHeader}>
                                <TouchableOpacity onPress={handleCancelPress}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>

                                <Text style={styles.addSheetTitle}>Add to Triplist</Text>

                                <TouchableOpacity
                                    onPress={() => runAddToTriplist(async () => {
                                        if (!selectedTripList) return;
                                        const placeToAdd = selectedPlaceForTrip || selectedMarker || selectedPlace;
                                        const tripList = lists.find(list => list.tripListId === selectedTripList);
                                        const userId = user.userId;
                                        await sendViewDataToS3(userId, placeToAdd.googleId || placeToAdd.id);
                                        setAddSheetVisible(false);
                                        router.push({
                                            pathname: '/list_details',
                                            params: {
                                                from: 'full_map',
                                                tripListId: selectedTripList,
                                                tripDetails: JSON.stringify(tripList),
                                                selectedPlace: JSON.stringify(placeToAdd),
                                                isEditMode: 'true',
                                            },
                                        });
                                    })}
                                    disabled={!selectedTripList || isAddingToTriplist}
                                >
                                    {selectedTripList && !isAddingToTriplist ? (
                                        <LinearGradient
                                            colors={['#81d8d0', '#5468ff']}
                                            style={styles.addHeaderButtonGradient}
                                        >
                                            <Text style={styles.addHeaderButtonText}>Add</Text>
                                        </LinearGradient>
                                    ) : (
                                        <View style={styles.addHeaderButtonDisabled}>
                                            <Text style={styles.addHeaderButtonTextDisabled}>Add</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* FlatList with Header */}
                            <BottomSheetFlatList
                                data={filteredLists}
                                keyExtractor={(item) => item.tripListId.toString()}
                                contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 20 }}
                                showsVerticalScrollIndicator={false}
                                ListHeaderComponent={
                                    <View>
                                        {/* Search */}
                                        <View style={styles.bottomSheetSearchContainer}>
                                            <Ionicons name="search" size={20} color="#000" />
                                            <TextInput
                                                style={styles.bottomSheetSearchInput}
                                                placeholder="Search"
                                                placeholderTextColor="#808080"
                                                value={bottomSheetSearchQuery}
                                                onChangeText={handleBottomSheetSearch}
                                                returnKeyType="done"
                                                onSubmitEditing={Keyboard.dismiss}
                                            />
                                        </View>
                                    </View>
                                }
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.listItem}
                                        onPress={() => handleTripListSelect(item.tripListId)}
                                    >
                                        <ExpoImage
                                            style={styles.listImage}
                                            source={{ uri: item.imageUrl }}
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                            transition={150}
                                        />
                                        <View style={styles.listTextContainer}>
                                            <Text style={styles.listTitle}>{item.name}</Text>
                                            <Text style={styles.numItems}>
                                                {item.totalPlaceCount} place
                                                {item.totalPlaceCount !== 1 ? 's' : ''}
                                            </Text>
                                        </View>
                                        {selectedTripList === item.tripListId ? (
                                            <LinearGradient
                                                colors={['#81d8d0', '#5468ff']}
                                                style={styles.checkIconGradient}
                                                useAngle={true}
                                                angle={270}
                                            >
                                                <Ionicons name="checkmark" size={18} color="black" />
                                            </LinearGradient>
                                        ) : (
                                            <View style={styles.addButtonIcon}>
                                                <Ionicons name="add" size={18} color="white" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        </BottomSheet>
                    )}
                    {showLikeToast && (
                        <Animated.View
                            style={[
                                styles.likeToast,
                                { opacity: toastOpacity }
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.likeToastContent}
                                onPress={navigateToLikedPlaces}
                                activeOpacity={0.8}
                            >
                                <View style={styles.likeToastTextContainer}>
                                    <Text style={styles.likeToastTitle}>Saved to Liked Places</Text>
                                    <Text style={styles.likeToastSubtitle}>Tap to view all</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </View>
            </TouchableOpacity>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    back: {
        position: 'absolute',
        top: 60,
        left: 20,
        width: 42,
        height: 42,
        borderRadius: 6,
        backgroundColor: "#000",
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    searchContainerWrapper: {
        position: 'absolute',
        top: 60,
        left: 70,
        right: 20,
        zIndex: 1000,
    },
    searchContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        height: 42,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        fontSize: 14,
        color: '#000',
        flex: 1,
        marginLeft: 8,
    },
    imageContainer: {
        backgroundColor: '#000',
        marginRight: 10,
    },
    reviewImage: {
        width: 18,
        height: 18,
        overflow: "hidden"
    },
    bottomSheet: {
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        nestedScrollEnabled: true,
    },
    bottomSheetContent: {
        flex: 1,
        padding: 10,
    },
    placeInfoContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginTop: 5,
        marginBottom: 9,
    },
    placeName: {
        fontSize: 20,
        fontWeight: '700',
        color: 'white',
        flex: 1,
        marginRight: 12,
    },
    placeActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionIcon: {
        marginLeft: 10,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    ratingText: {
        // fontFamily: "Monsterrat-SemiBold",
        fontSize: 14,
        color: 'white',
        marginRight: 5,
    },
    addressText: {
        // fontFamily: "Monsterrat-SemiBold",
        fontSize: 12,
        color: 'white',
        marginTop: 5,
    },
    imageScrollView: {
        paddingVertical: 10,
    },
    imageList: {
        flexGrow: 0,
        height: 120,
        marginVertical: 10,
        marginBottom: 10,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    ratingStatsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        marginBottom: 2,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    dotSeparator: {
        color: 'rgba(255,255,255,0.6)',
        marginHorizontal: 6,
        fontSize: 14,
        fontWeight: '600',
    },
    reviewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#25282D',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 14,
    },
    reviewButtonText: {
        fontSize: 12,
        marginLeft: 8,
        fontWeight: '600',
        color: '#fff',
    },
    reviewHandle: {
        container: { marginTop: 10 },
        reviewButton: { marginBottom: 10 },
        reviewButtonText: { fontSize: 16 },
    },
    markerImage: {
        width: 100,
        height: 100,
        borderRadius: 10,
        marginRight: 10,
    },
    flatList: {
        marginBottom: 10
    },
    bottomSheetSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 6,
        paddingHorizontal: 13,
        marginVertical: 10,
    },
    bottomSheetSearchIcon: {
        marginRight: 10,
    },
    bottomSheetSearchInput: {
        flex: 1,
        height: 42,
        fontSize: 14,
        color: '#000',
        marginLeft: 8,
    },
    filterIcon: {
        marginLeft: 10,
    },
    listContainer: {
        flexGrow: 1,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
        marginHorizontal: 10,
    },
    listImage: {
        width: 76,
        height: 76,
        borderRadius: 14,
    },
    listTextContainer: {
        marginLeft: 20,
        flex: 1,
        width: "100%"
    },
    listTitle: {
        color: '#fff',
        fontSize: 14,
        textAlign: "left",
        fontWeight: '600',
    },
    numItems: {
        fontSize: 12,
        color: "#fff",
        textAlign: "left"
    },
    selectButton: {
        width: 25,
        height: 25,
        borderRadius: 15,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    unselectedButton: {
        width: 25,
        height: 25,
        borderRadius: 15,
        backgroundColor: 'black',
        borderWidth: 2,
        borderColor: 'white',
    },
    selectedButtonGradient: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButton: {
        position: 'absolute',
        bottom: 35,
        left: '50%', // Center horizontally
        marginLeft: -30,
        width: 100,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    addButtonIcon: {
        backgroundColor: 'black',
        borderColor: 'white',
        borderWidth: 0.5, // Reduce border width for a smaller outline
        borderRadius: 15,
        padding: 5,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonWhiteBackground: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    addButtonTextBlack: {
        fontSize: 16,
        fontWeight: '600',
        color: 'black',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addSheetContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 10,
        backgroundColor: 'transparent',
    },
    addSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingTop: 10,
        marginHorizontal: 20,
    },
    checkIconGradient: {
        width: 30,
        height: 30,
        borderRadius: 15,
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterContainer: {
        position: 'absolute',
        top: 120, // Adjust this value as needed to position below the text input
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        zIndex: 1000,
    },
    filterButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginHorizontal: 5,
    },
    filterText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    loadingTextContainer: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    loadingText: {
        color: '#000D26',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    tabContainer: {
        flex: 1,
        marginTop: 10,
    },
    tabHeader: {
        flexDirection: "row",
        justifyContent: "space-evenly",
        marginBottom: 16,
    },
    tabButton: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 5,
        backgroundColor: "#0000", // Darker background for inactive tabs
        minWidth: 80,  // Ensure buttons have enough width
    },
    tabButtonText: {
        fontSize: 16,
        color: "#737373",
        fontWeight: "bold",
        textAlign: 'center',
    },
    tabActiveText: {
        color: "#fff",
        fontWeight: "bold",
        textAlign: 'center',
        textDecorationLine: 'underline',
    },
    tabContent: {
        flex: 1,
        width: '100%',
        height: '100%'
    },
    tabContentView: {
        flex: 1,
        width: '100%',
        paddingBottom: 20, // Add some bottom padding
    },
    summaryText: {
        fontSize: 15,
        color: 'white',
        fontWeight: '600',
        marginBottom: 12,
    },
    divider: {
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    likeToast: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        zIndex: 9999,
    },
    likeToastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    likeToastTextContainer: {
        flex: 1,
    },
    likeToastTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    likeToastSubtitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        fontWeight: '400',
    },
    addSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingTop: 10,
        marginHorizontal: 20,
    },
    cancelText: {
        fontSize: 12,
        fontWeight: '500',
        color: 'white',
    },
    addSheetTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
    },
    addHeaderButtonGradient: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 20,
    },
    addHeaderButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 13,
    },
    addHeaderButtonDisabled: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 20,
    },
    addHeaderButtonTextDisabled: {
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '600',
        fontSize: 13,
    },
    skeleton: {
        backgroundColor: '#333',
        borderRadius: 8,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    errorText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
    },
});
