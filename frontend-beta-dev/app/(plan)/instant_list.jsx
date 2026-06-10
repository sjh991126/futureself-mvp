import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { ScrollView, Alert, View, Text, TouchableOpacity, StyleSheet, Dimensions, TextInput } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Color } from "./planStyles";
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Handle, CustomBackground } from '../../assets/components/custom_handle';
import LoadingScreen from '../LoadingScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchInstantTripList } from '../src/api/triplist';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const PLACEHOLDER_IMG = 'https://via.placeholder.com/76';

const instant_list = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [recommendations, setRecommendations] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [search, setSearch] = useState('');
    const mapRef = useRef(null);
    const firstMarkerRef = useRef(null);
    const hasInitialFocusRef = useRef(false);
    const [userLocation, setUserLocation] = useState(null);

    const snapPoints = useMemo(() => ['20%', '50%', '80%'], []);
    const [paddingBottom, setPaddingBottom] = useState(SCREEN_HEIGHT / 2);

    const defaultRegion = {
        latitude: 22.2666,
        longitude: 113.9333,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    useEffect(() => {
        const getUserLocation = async () => {
            try {
                // params에서 위치 정보가 있으면 사용
                if (params.latitude && params.longitude) {
                    setUserLocation({
                        latitude: parseFloat(params.latitude),
                        longitude: parseFloat(params.longitude),
                    });
                }
            } catch (error) {
                console.error('Error getting user location:', error);
            }
        };

        getUserLocation();
    }, [params.latitude, params.longitude]);

    // 카테고리 목록
    const categories = useMemo(() => {
        if (!recommendations?.results?.length) return ['All'];
        const unique = [...new Set(recommendations.results.map(i => i.category).filter(Boolean))];
        return ['All', ...unique];
    }, [recommendations]);

    // 필터 + 검색
    const filteredRecommendations = useMemo(() => {
        if (!recommendations?.results) return [];
        let arr = selectedCategory === 'All'
            ? recommendations.results
            : recommendations.results.filter(i => i.category === selectedCategory);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            arr = arr.filter(i =>
                i.name?.toLowerCase().includes(q) ||
                i.reasons?.some(r => r?.toLowerCase().includes(q))
            );
        }
        return arr;
    }, [recommendations, selectedCategory, search]);

    // 로드
    const abortControllerRef = useRef(null);
    useEffect(() => () => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                if (params.instantId && params.latitude && params.longitude) {
                    abortControllerRef.current?.abort();
                    abortControllerRef.current = new AbortController();
                    const response = await fetchInstantTripList({
                        instantId: params.instantId,
                        location: { latitude: parseFloat(params.latitude), longitude: parseFloat(params.longitude) },
                    }, abortControllerRef.current.signal);
                    if (!abortControllerRef.current.signal.aborted) setRecommendations(response);
                } else if (params.recommendationData) {
                    setRecommendations(JSON.parse(params.recommendationData));
                } else {
                    router.back();
                }
            } catch (e) {
                console.error(e);
                if (!abortControllerRef.current?.signal.aborted) {
                    Alert.alert('Error', 'Failed to load recommendations.');
                    router.back();
                }
            } finally {
                if (!abortControllerRef.current?.signal.aborted) {
                    abortControllerRef.current = null;
                    setIsLoading(false);
                }
            }
        };
        load();
    }, [params.instantId, params.latitude, params.longitude, params.recommendationData]);

    // 맵 포커스: 처음 1번 마커 줌인 → 이후 전체 핏
    useEffect(() => {
        if (!filteredRecommendations.length || !mapRef.current) return;

        console.log("filteredRecommendation", filteredRecommendations);
        // 약간의 딜레이를 줘서 mapPadding이 적용된 후에 fitToCoordinates 실행
        setTimeout(() => {
            const first = filteredRecommendations[0];
            const coords = filteredRecommendations
                .filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
                .map(p => ({ latitude: p.latitude, longitude: p.longitude }));

            if (coords.length === 0) return;

            if (!hasInitialFocusRef.current && coords.length > 0) {
                // 모든 마커가 보이도록 fit (BottomSheet를 고려한 패딩)
                const bottomPadding = SCREEN_HEIGHT * 0.5 + 80; // 50% + 여유공간

                mapRef.current.fitToCoordinates(coords, {
                    edgePadding: {
                        top: 150,      // 헤더 + 여유
                        right: 50,
                        bottom: bottomPadding,  // BottomSheet를 피함
                        left: 50
                    },
                    animated: true,
                });

                // 첫 마커 callout
                // if (Number.isFinite(first?.latitude) && Number.isFinite(first?.longitude)) {
                //     setTimeout(() => {
                //         firstMarkerRef.current?.showCallout?.();
                //     }, 500);
                // }

                hasInitialFocusRef.current = true;
            } else if (hasInitialFocusRef.current) {
                // 필터링 후 재조정
                const bottomPadding = SCREEN_HEIGHT * 0.5 + 80;

                mapRef.current.fitToCoordinates(coords, {
                    edgePadding: {
                        top: 150,
                        right: 50,
                        bottom: bottomPadding,
                        left: 50
                    },
                    animated: true,
                });
            }
        }, 300); // 300ms 딜레이
    }, [filteredRecommendations]);

    const handleSheetChanges = useCallback((index) => {
        const snapPercentage = Number(String(snapPoints[index]).replace('%', ''));
        setPaddingBottom(SCREEN_HEIGHT * (1 - snapPercentage / 100));
    }, [snapPoints]);

    const handleCategoryPress = (c) => setSelectedCategory(c);

    // 표시 유틸(널 안전)
    const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
    const formatPrice = (p) => (p ? ` · ${p}` : '');
    const formatReviews = (n) => (Number.isFinite(n) ? ` (${n.toLocaleString()})` : '');
    const formatDistance = (km, min) => {
        const dist = Number.isFinite(km) ? (km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`) : '';
        const eta = Number.isFinite(min) ? `${min}min walk` : '';
        return [dist, eta].filter(Boolean).join(' · ');
    };
    const statusColor = (s) => (s === 'open' ? '#4CAF50' : s === 'closed' ? '#F44336' : '#9E9E9E');

    // 카테고리 토글(TripList 스타일)
    const CategoryToggleButtons = () => (
        <View style={styles.dayButtonsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayButtonsContentContainer}>
                {categories.map((c) => (
                    <TouchableOpacity
                        key={c}
                        style={[styles.dayButton, selectedCategory === c && styles.selectedDayButton]}
                        onPress={() => handleCategoryPress(c)}
                        activeOpacity={0.8}
                    >
                        {selectedCategory === c && (
                            <LinearGradient colors={['#5468FF', '#81D8D0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientOverlay} />
                        )}
                        <Text style={[styles.dayButtonText, selectedCategory === c && styles.selectedDayButtonText]}>{cap(c)}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    // 리스트 카드(널 안전 표시)
    const PlaceRow = ({ item, index }) => (
        <TouchableOpacity
            key={item.id}
            style={styles.placeItem}
            onPress={() =>
                router.push({
                    pathname: 'place_details',
                    params: {
                        placeAll: JSON.stringify(item),
                        placeId: item.id,
                        placeName: item.name,
                        placeAddress: item.address || '',
                        placeRating: item.rating?.toString() || '0',
                        placeSummary: item.summary || '',
                        imageUrls: JSON.stringify(item.imageUrls || []),
                        googleid: item.googleid || item.id || '',
                    },
                })
            }
        >
            {/* 마커 번호 뱃지 */}
            <View style={[styles.markerContainer, { backgroundColor: 'black', width: 22, height: 22, borderRadius: 11 }]}>
                <Text style={[styles.markerText, { marginTop: -1, marginLeft: 1 }]}>{index + 1}</Text>
            </View>

            <ExpoImage
                source={{ uri: item.imageUrl || PLACEHOLDER_IMG }}
                style={styles.placeImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
            />
            <View style={styles.placeInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <Text style={[styles.placeName, { flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                        {item.name}
                    </Text>

                    {item.open_status && (
                        <View
                            style={[
                                styles.statusBadge,
                                { backgroundColor: item.open_status === 'open' ? '#4CAF50' : item.open_status === 'closed' ? '#F44336' : 'grey' , marginLeft: 6, flexShrink: 0 },
                            ]}
                        >
                            <Text style={styles.statusText}>
                                {item.open_status === 'open' ? 'Open' : 'Closed'}
                            </Text>
                        </View>
                    )}
                </View>


                <Text style={styles.placeDetails} numberOfLines={1}>
                    {cap(item.category)}
                    {Number.isFinite(item.rating) ? ` · ${item.rating} ★` : ''}
                    {formatReviews(item.review_count)}
                    {formatPrice(item.price_level)}
                </Text>

                {!!(Number.isFinite(item.distance_km) || Number.isFinite(item.eta_minutes)) && (
                    <Text style={styles.placeDetails}>{formatDistance(item.distance_km, item.eta_minutes)}</Text>
                )}

                {!!item.reasons?.length && (
                    <Text style={[styles.placeDetails, { opacity: 0.8 }]} numberOfLines={2}>
                        {item.reasons.filter(Boolean).join(' · ')}
                    </Text>
                )}
            </View>


        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <LoadingScreen visible onCancel={() => router.back()}/>
            </GestureHandlerRootView>
        );
    }

    const first = filteredRecommendations[0];

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={
                        first && Number.isFinite(first?.latitude)
                            ? { latitude: first.latitude, longitude: first.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
                            : defaultRegion
                    }
                >
                    {userLocation && (
                        <Marker
                            coordinate={userLocation}
                            title="Current Location"
                            anchor={{ x: 0.5, y: 0.5 }}
                        >
                            <View style={styles.currentLocationMarker}>
                                <View style={styles.currentLocationDot} />
                            </View>
                        </Marker>
                    )}

                    {filteredRecommendations.map((p, i) =>
                        Number.isFinite(p.latitude) && Number.isFinite(p.longitude) ? (
                            <Marker
                                key={p.id}
                                ref={i === 0 ? firstMarkerRef : undefined}
                                coordinate={{ latitude: p.latitude, longitude: p.longitude }}
                                title={p.name}
                            >
                                <View style={styles.markerContainer}>
                                    <Text style={styles.markerText}>{i + 1}</Text>
                                </View>
                            </Marker>
                        ) : null
                    )}
                </MapView>

                {/* 헤더(Back + Search) */}
                <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={30} color="white" />
                        </TouchableOpacity>

                        <View style={styles.searchBar}>
                            <Ionicons name="search" size={18} color="#8E8E93" style={{ marginRight: 8 }} />
                            <TextInput
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Search"
                                placeholderTextColor="#8E8E93"
                                style={styles.searchInput}
                                returnKeyType="search"
                            />
                        </View>
                    </View>
                </SafeAreaView>

                <BottomSheet
                    index={1}
                    snapPoints={snapPoints}
                    backgroundComponent={CustomBackground}
                    handleComponent={Handle}
                    onChange={handleSheetChanges}
                    enablePanDownToClose={false}
                    enableHandlePanningGesture={true}
                    enableContentPanningGesture={false}
                >
                    <BottomSheetScrollView
                        contentContainerStyle={{ paddingBottom: paddingBottom, paddingHorizontal: 12 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* <ScrollView contentContainerStyle={{ paddingBottom: paddingBottom, paddingHorizontal: 12 }} showsVerticalScrollIndicator={false}> */}
                        {/* Top section: Theme + helper text + Category toggle */}
                        {/* <TouchableOpacity style={{ alignSelf: 'flex-start', paddingVertical: 8 }} onPress={() => router.back()}>
                                <Text style={{ color: 'white', fontSize: 16, fontWeight: '500' }}>Cancel</Text>
                            </TouchableOpacity> */}

                        <Text style={styles.themeTitle}>{recommendations?.theme}</Text>
                        <Text style={styles.themeSubtitle}>Click to view details & head to your favorite spot!</Text>

                        {/* <CategoryToggleButtons /> */}

                        {filteredRecommendations.map((item, idx) => (
                            <PlaceRow key={item.id} item={item} index={idx} />
                        ))}

                        {/* coverage notes(선택) */}
                        {!!recommendations?.coverage && (
                            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                                    Showing {recommendations.coverage.returned_results} of {recommendations.coverage.requested_results} results
                                </Text>
                                {!!recommendations.coverage.notes && (
                                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4, marginBottom: 8, fontStyle: 'italic' }}>
                                        {recommendations.coverage.notes}
                                    </Text>
                                )}
                            </View>
                        )}
                    </BottomSheetScrollView>
                </BottomSheet>
            </View>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    map: { ...StyleSheet.absoluteFillObject },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingHorizontal: 12,
    },
    backButton: {
        backgroundColor: 'black',
        borderRadius: 8,
        padding: 6,
        marginRight: 8,
    },

    themeTitle: { color: 'white', fontSize: 16, fontWeight: '600', marginTop: 16 },
    themeSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 12 },

    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    searchInput: { flex: 1, color: '#111', fontSize: 16 },

    dayButtonsContainer: { flexDirection: 'row', marginTop: 8, overflow: 'hidden' },
    dayButtonsContentContainer: { flexDirection: 'row', alignItems: 'center' },
    dayButton: {
        borderRadius: 20,
        marginRight: 8,
        position: 'relative',
        overflow: 'hidden',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: Color.buttonColor || 'rgba(255,255,255,0.2)',
    },
    selectedDayButton: { overflow: 'hidden' },
    dayButtonText: { color: 'white', fontWeight: '600' },
    selectedDayButtonText: { color: 'white', fontWeight: '600' },
    gradientOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

    placeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'black',
        borderRadius: 12,
        padding: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    placeImage: { width: 76, height: 76, marginLeft: 8, borderRadius: 8 },
    placeInfo: { flex: 1, marginHorizontal: 16 },
    placeName: { color: '#fff', fontSize: 16, fontWeight: '600', paddingBottom: 2 },
    placeDetails: { color: '#fff', fontSize: 12, paddingBottom: 2, opacity: 0.9 },
    currentLocationMarker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(84, 104, 255, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    currentLocationDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#5468FF',
    },

    statusBadge: {
        marginLeft: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '600',
    },
    markerContainer: {
        backgroundColor: 'black',
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
});

export default instant_list;
