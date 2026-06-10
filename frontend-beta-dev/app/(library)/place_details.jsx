import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import { Keyboard, TextInput, Animated, Modal, Alert, View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import CustomGradientMarker from '../../assets/components/CustomGradientMarker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Star from '../../assets/components/star_component';
import ReviewHandle from '../../assets/components/review_handle';
import PencilIcon from '../../assets/icons/pencil_icon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GoogleReviews from '../../assets/components/google_reviews';
import ExternalHandle from '../../assets/components/external_handle';
import ImageViewing from 'react-native-image-viewing';
import { LinearGradient } from 'expo-linear-gradient';
import { Handle, CustomBackground } from '../../assets/components/custom_handle';
import { placeViewS3 } from '../src/api/s3_upload';
import BottomSheet, { BottomSheetScrollView, BottomSheetView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import api, { TokenManager } from '../src/config';
import { getTriplist } from '../src/api/my_triplist';
import FilledHeart from '../../assets/icons/filled_heart';
import { togglePlaceLike } from '../src/api/LikeCheck';
import { getChatLogs } from '../src/api/chat';
import ShareModal from '../../assets/components/share_modal';
import * as chatService from './../src/api/chat';
import LoadingSpinner from '../LoadingSpinner';
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';
import WebSocketService from '../src/api/WebSocketService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

const place_details = () => {
    const router = useRouter();
    const { placeId, placeAll } = useLocalSearchParams();

    const getInitialPlaceData = () => {
        if (!placeAll || typeof placeAll !== 'string') {
            return null;
        }

        try {
            const parsedPlace = JSON.parse(placeAll);
            return {
                ...parsedPlace,
                id: parsedPlace?.id || parsedPlace?.googleid || parsedPlace?.googleId || placeId,
                shortFormattedAddress: parsedPlace?.shortFormattedAddress || parsedPlace?.address || '',
                imageUrls: Array.isArray(parsedPlace?.imageUrls)
                    ? parsedPlace.imageUrls
                    : (parsedPlace?.imageUrl ? [parsedPlace.imageUrl] : []),
                isLiked: typeof parsedPlace?.isLiked === 'boolean' ? parsedPlace.isLiked : false,
                totalLikes: typeof parsedPlace?.totalLikes === 'number' ? parsedPlace.totalLikes : 0,
            };
        } catch (error) {
            console.error('Failed to parse placeAll param:', error);
            return null;
        }
    };

    const [placeData, setPlaceData] = useState(getInitialPlaceData);
    const [loading, setLoading] = useState(() => !getInitialPlaceData());

    const [isImageViewerVisible, setImageViewerVisible] = useState(false);
    const [imageViewerIndex, setImageViewerIndex] = useState(0);
    const [imageUrlsArray, setImageUrlsArray] = useState([]);
    const [isAddSheetVisible, setAddSheetVisible] = useState(false);
    const addSheetRef = useRef(null);
    const mapRef = useRef(null);
    const webSocketService = useRef(new WebSocketService(router)).current;

    const user = useSelector((state) => state.user.data);
    const [bottomSheetSearchQuery, setBottomSheetSearchQuery] = useState('');
    const [tripListsLoading, setTripListsLoading] = useState(true);
    const [filteredLists, setFilteredLists] = useState([]);
    const [selectedTripList, setSelectedTripList] = useState(null);
    const [lists, setLists] = useState([]);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [chatRooms, setChatRooms] = useState([]);
    const [sending, setSending] = useState(false);
    const [activeTab, setActiveTab] = useState("Tab1");

    const [showLikeToast, setShowLikeToast] = useState(false);
    const toastOpacity = useRef(new Animated.Value(0)).current;
    const likeActionKey = `place:like:${String(placeId || placeData?.id || 'unknown')}`;
    const { run: runToggleLike, isRunning: isLiking } = useSingleFlightAction(likeActionKey);

    useFocusEffect(
        useCallback(() => {
            const fetchPlaceDetail = async () => {
                if (!placeId) {
                    setLoading(false);
                    return;
                }

                try {
                    setLoading(true);
                    const token = await TokenManager.getAccessToken();
                    const response = await api.get(`/api/places/v1/${placeId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setPlaceData((prev) => ({
                        ...prev,
                        ...response.data,
                        isLiked: typeof response.data?.isLiked === 'boolean'
                            ? response.data.isLiked
                            : (typeof prev?.isLiked === 'boolean' ? prev.isLiked : false),
                        totalLikes: typeof response.data?.totalLikes === 'number'
                            ? response.data.totalLikes
                            : (typeof prev?.totalLikes === 'number' ? prev.totalLikes : 0),
                    }));
                    console.log('Place detail fetched:', response.data);
                } catch (error) {
                    console.error('Error fetching place details:', error);
                    // params 데이터가 있으면 그대로 사용
                    if (!placeData) {
                        Alert.alert('Error', 'Failed to load place details');
                    }
                } finally {
                    setLoading(false);
                }
            };

            fetchPlaceDetail();

        }, [placeId])
    );

    // 맵 초기 영역 - placeData가 있으면 해당 위치로, 없으면 기본 위치
    const initialRegion = {
        latitude: placeData?.latitude || 22.2838,
        longitude: placeData?.longitude || 114.1374,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
    };

    useEffect(() => {
        const fetchTripLists = async () => {
            try {
                const token = await TokenManager.getAccessToken();
                if (token) {
                    const tripLists = await getTriplist(token);
                    setLists(tripLists);
                    setFilteredLists(tripLists);
                    console.log('triplists', tripLists);
                } else {
                    console.error('No token found');
                }
            } catch (error) {
                console.error('Error fetching trip lists:', error);
            } finally {
                setTripListsLoading(false);
            }
        };

        fetchTripLists();
    }, []);

    useEffect(() => {
        const loadChatRooms = async () => {
            try {
                const rooms = await getChatLogs();
                console.log('rooms', rooms);
                setChatRooms(rooms);
            } catch (error) {
                console.error('Error loading chat rooms:', error);
            }
        };
        loadChatRooms();
    }, []);

    // placeData 로딩 완료 후 지도 위치 이동
    useEffect(() => {
        if (mapRef.current && placeData?.latitude && placeData?.longitude) {
            console.log('Animating map to:', placeData.latitude, placeData.longitude);
            setTimeout(() => {
                mapRef.current?.animateToRegion(
                    {
                        latitude: placeData.latitude,
                        longitude: placeData.longitude,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                    },
                    1000
                );
            }, 500);
        }
    }, [placeData]);

    const handleShare = () => {
        setShareModalVisible(true);
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
                    placeId: placeData.id,
                    placeName: placeData.name,
                    placeAddress: placeData.shortFormattedAddress,
                    placeSummary: placeData.summary,
                    placeRating: parseFloat(placeData.rating) || 0,
                    imageUrls: placeData.imageUrls || [],
                    googleid: placeData.id
                }
            };

            console.log('📤 Sending place share:', placeMessage);

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

    const handleToggleLike = async () => {
        await runToggleLike(async () => {
            const targetPlaceId = placeId || placeData?.id;
            if (!targetPlaceId) return;

            // 현재 상태 저장 (롤백용)
            const previousState = {
                isLiked: placeData.isLiked,
                totalLikes: placeData.totalLikes
            };

            // 즉시 UI 업데이트 (Optimistic Update)
            const newLikedState = !placeData.isLiked;
            setPlaceData(prev => ({
                ...prev,
                isLiked: newLikedState,
            }));

            // 토스트는 바로 표시
            if (newLikedState) {
                showToast();
            }

            // 백엔드 요청 (비동기)
            try {
                const data = await togglePlaceLike(targetPlaceId);

                // 서버 응답과 로컬 상태가 다르면 동기화
                if (data.liked !== newLikedState) {
                    console.warn('Server state mismatch, syncing...');
                    setPlaceData(prev => ({
                        ...prev,
                        isLiked: data.liked,
                        totalLikes: data.totalLikes || prev.totalLikes
                    }));
                }
            } catch (error) {
                console.error('Error toggling like status:', error);

                // 실패 시 롤백
                setPlaceData(prev => ({
                    ...prev,
                    isLiked: previousState.isLiked,
                    totalLikes: previousState.totalLikes
                }));

                Alert.alert('Error', 'Failed to update like status');
            }
        });
    };

    const showToast = () => {
        setShowLikeToast(true);

        Animated.timing(toastOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

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
        Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setShowLikeToast(false);
        });

        router.push('/liked_places');
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

    const handleAddPress = () => {
        setAddSheetVisible(true);
    };

    const handleCancelPress = () => {
        setAddSheetVisible(false);
    };

    const handleBottomSheetSearch = (query) => {
        setBottomSheetSearchQuery(query);
        setFilteredLists(lists.filter(tripList =>
            tripList && (
                (tripList.name && tripList.name.toLowerCase().includes(query.toLowerCase()))
            )
        ));
    };

    const handleTripListSelect = (tripListId) => {
        setSelectedTripList(tripListId === selectedTripList ? null : tripListId);
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
        if (placeData?.isLiked) {
            return <FilledHeart style={styles.actionIcon} />;
        } else {
            return <Ionicons name="heart-outline" size={24} color="#fff" style={styles.actionIcon} />;
        }
    };

    // 로딩 중일 때
    if (loading) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={styles.container}>
                    {/* Map Placeholder */}
                    <View style={[styles.map, { backgroundColor: '#1a1a1a' }]} />

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={26} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* BottomSheet with Skeleton */}
                    <BottomSheet
                        index={0}
                        snapPoints={['50%', '85%']}
                        backgroundComponent={CustomBackground}
                        handleComponent={Handle}
                        enablePanDownToClose={false}
                    >
                        <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
                            <PlaceInfoSkeleton />
                        </BottomSheetScrollView>
                    </BottomSheet>
                </View>
            </GestureHandlerRootView>
        );
    }

    // 데이터가 없을 때
    if (!placeData) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#fff', fontSize: 16 }}>Place not found</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <Text style={{ color: '#5468ff', fontSize: 14 }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                {/* Map */}
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={initialRegion}
                    showsUserLocation={true}
                    mapPadding={{
                        top: 100,
                        right: 50,
                        bottom: SCREEN_HEIGHT * 0.3 + 150,
                        left: 50,
                    }}
                >
                    {placeData?.latitude && placeData?.longitude && (
                        <CustomGradientMarker
                            place={{
                                id: placeData.id,
                                name: placeData.name,
                                latitude: placeData.latitude,
                                longitude: placeData.longitude,
                                markerType: placeData.markerType || 'place',
                                rating: placeData.rating,
                                types: placeData.types || [],
                                ...placeData
                            }}
                            onPress={() => {
                                console.log('Marker pressed:', placeData.name);
                            }}
                            focused={true}
                        />
                    )}
                </MapView>

                {/* Header - Back Button */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={26} color="white" />
                    </TouchableOpacity>
                </View>

                {/* BottomSheet */}
                <BottomSheet
                    index={0}
                    snapPoints={['50%', '85%']}
                    backgroundComponent={CustomBackground}
                    handleComponent={Handle}
                    enablePanDownToClose={false}
                    enableHandlePanningGesture={true}
                    enableContentPanningGesture={false}
                >
                    <BottomSheetScrollView
                        contentContainerStyle={styles.bottomSheetContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Place Info */}
                        <View style={styles.placeInfoContainer}>
                            <Text style={styles.placeName}>{placeData.name}</Text>
                            <View style={styles.placeActions}>
                                <TouchableOpacity onPress={handleShare}>
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

                        {/* Rating + Stats + Review 버튼 한 줄 정렬 */}
                        <View style={styles.ratingRow}>
                            <View style={styles.ratingStatsGroup}>
                                <Text style={styles.ratingText}>{placeData.rating || 0}</Text>
                                {renderStars(parseFloat(placeData.rating || 0))}

                                <View style={styles.statsRow}>
                                    <View style={styles.statItem}>
                                        <Ionicons name="heart" size={14} color="#fff" style={{ marginRight: 4 }} />
                                        <Text style={styles.statText}>{placeData.numLikes || 0}</Text>
                                    </View>
                                    <Text style={styles.dotSeparator}>·</Text>
                                    <View style={styles.statItem}>
                                        <Ionicons name="eye" size={14} color="#fff" style={{ marginRight: 4 }} />
                                        <Text style={styles.statText}>{placeData.viewCount || 0}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Review 버튼 */}
                            {activeTab === "Tab1" && (
                                <TouchableOpacity
                                    style={styles.reviewButton}
                                    onPress={async () => {
                                        try {
                                            await AsyncStorage.setItem('placeId', String(placeData.id));
                                            await AsyncStorage.setItem('title', String(placeData.name || ''));
                                            router.push('/write_review');
                                        } catch (error) {
                                            console.error('Error saving data to AsyncStorage:', error);
                                            Alert.alert('Error', 'Failed to open review screen.');
                                        }
                                    }}
                                >
                                    <PencilIcon size={14} style={{ marginRight: 6 }} />
                                    <Text style={styles.reviewButtonText}>Review</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Address */}
                        <Text style={styles.addressText} ellipsizeMode="tail">
                            {placeData.shortFormattedAddress}
                        </Text>

                        {/* Images */}
                        <FlatList
                            data={placeData.imageUrls || []}
                            horizontal
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item, index }) => (
                                item ? (
                                    <TouchableOpacity onPress={() => {
                                        setImageViewerIndex(index);
                                        setImageUrlsArray((placeData.imageUrls || []).map(url => ({ uri: url })));
                                        setImageViewerVisible(true);
                                    }}>
                                        <ExpoImage
                                            source={{ uri: item }}
                                            style={styles.placeImage}
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
                                            transition={200}
                                        />
                                    </TouchableOpacity>
                                ) : null
                            )}
                            contentContainerStyle={styles.imageScrollView}
                            style={styles.imageList}
                        />

                        {/* Summary */}
                        <Text style={styles.summaryText}>{placeData.summary}</Text>

                        <View style={styles.divider} />

                        {/* Tabs */}
                        <View style={styles.tabContainer}>
                            <View style={styles.tabHeader}>
                                <TouchableOpacity
                                    style={styles.tabButton}
                                    onPress={() => setActiveTab("Tab1")}
                                >
                                    <Text style={[
                                        styles.tabButtonText,
                                        activeTab === "Tab1" && styles.tabActiveText,
                                    ]}>Trippy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.tabButton}
                                    onPress={() => setActiveTab("Tab2")}
                                >
                                    <Text style={[
                                        styles.tabButtonText,
                                        activeTab === "Tab2" && styles.tabActiveText,
                                    ]}>Google</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.tabButton}
                                    onPress={() => setActiveTab("Tab3")}
                                >
                                    <Text style={[
                                        styles.tabButtonText,
                                        activeTab === "Tab3" && styles.tabActiveText,
                                    ]}>Instagram</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Tab Content */}
                            <View style={styles.tabContent}>
                                {/* 모든 탭을 미리 렌더링하고 display로 제어 */}
                                <View style={{ display: activeTab === "Tab1" ? 'flex' : 'none' }}>
                                    {placeId && (
                                        <ReviewHandle
                                            id={placeId}
                                            name={placeData?.name || ''}
                                            googleid={placeId}
                                        />
                                    )}
                                </View>

                                <View style={{ display: activeTab === "Tab2" ? 'flex' : 'none' }}>
                                    {placeId && (
                                        <GoogleReviews googleid={placeId} />
                                    )}
                                </View>

                                <View style={{ display: activeTab === "Tab3" ? 'flex' : 'none' }}>
                                    {placeData?.name && (
                                        <ExternalHandle location_query={placeData.name} />
                                    )}
                                </View>
                            </View>
                        </View>
                    </BottomSheetScrollView>
                </BottomSheet>

                {/* Image Viewer */}
                <ImageViewing
                    images={imageUrlsArray}
                    imageIndex={imageViewerIndex}
                    visible={isImageViewerVisible}
                    onRequestClose={() => setImageViewerVisible(false)}
                />

                {/* Share Modal */}
                <ShareModal
                    visible={shareModalVisible}
                    onClose={() => setShareModalVisible(false)}
                    onSend={handleSendToChat}
                    chatRooms={chatRooms}
                />

                {/* Add to TripList BottomSheet */}
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
                        {/* 고정 헤더 */}
                        <View style={styles.addSheetHeader}>
                            <TouchableOpacity onPress={handleCancelPress}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <Text style={styles.addSheetTitle}>Add to Triplist</Text>

                            <TouchableOpacity
                                onPress={async () => {
                                    if (selectedTripList) {
                                        const tripList = lists.find(list => list.tripListId === selectedTripList);
                                        const userId = user.userId;
                                        await sendViewDataToS3(userId, placeData.id);

                                        router.push({
                                            pathname: '/list_details',
                                            params: {
                                                from: 'place_details',
                                                tripListId: selectedTripList,
                                                tripDetails: JSON.stringify(tripList),
                                                selectedPlace: JSON.stringify(placeData),
                                                isEditMode: 'true',
                                            },
                                        });
                                    }
                                }}
                                disabled={!selectedTripList}
                            >
                                {selectedTripList ? (
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
        </GestureHandlerRootView>
    );
};

export default place_details;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 6,
        backgroundColor: "#000",
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomSheetContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    placeInfoContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginTop: 5,
        marginBottom: 10,
    },
    placeName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        flex: 1,
        marginRight: 12,
    },
    placeActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionIcon: {
        marginLeft: 10
    },
    ratingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    ratingStatsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        flex: 1,
        gap: 2,
        marginBottom: 2,
        paddingRight: 8,
    },
    ratingText: {
        fontSize: 14,
        color: 'white',
        fontWeight: '600',
        marginRight: 4,
    },
    addressText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 8,
    },
    imageList: {
        flexGrow: 0,
        height: 120,
    },
    imageScrollView: {
        paddingVertical: 10,
    },
    placeImage: {
        width: 100,
        height: 100,
        borderRadius: 10,
        marginRight: 10,
    },
    summaryText: {
        fontSize: 15,
        color: 'white',
        fontWeight: '600',
    },
    divider: {
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    tabContainer: {
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
        minWidth: 80,
    },
    tabButtonText: {
        fontSize: 16,
        color: "#737373",
        fontWeight: "600",
        textAlign: 'center',
    },
    tabActiveText: {
        color: "#fff",
        textDecorationLine: 'underline',
    },
    tabContent: {
        width: '100%',
    },
    cancelText: {
        fontSize: 12,
        fontWeight: '500',
        color: 'white',

    },
    addSheetTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    bottomSheetSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 6,
        paddingHorizontal: 13,
        marginVertical: 10,
    },
    bottomSheetSearchInput: {
        flex: 1,
        height: 42,
        fontSize: 14,
        color: '#000',
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
    },
    listTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    numItems: {
        fontSize: 12,
        color: "#fff",
    },
    checkIconGradient: {
        width: 30,
        height: 30,
        borderRadius: 15,
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonIcon: {
        width: 30,
        height: 30,
        backgroundColor: 'black',
        borderColor: 'white',
        borderWidth: 0.5,
        borderRadius: 15,
        padding: 5,

        justifyContent: 'center',
        alignItems: 'center',
    },
    reviewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#25282D',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 14,
        flexShrink: 0,
        zIndex: 2,
        elevation: 2,
    },
    reviewButtonText: {
        fontSize: 12,
        marginLeft: 8,
        fontWeight: '600',
        color: '#fff',
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
    likeToast: {
        position: 'absolute',
        bottom: 60,
        left: 20,
        right: 20,
    },
    likeToastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#25282D',
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
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
    },
    skeleton: {
        backgroundColor: '#333',
        borderRadius: 8,
    },
});
