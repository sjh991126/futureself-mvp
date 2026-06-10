import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { ScrollView, Alert, View, Text, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Color } from "./planStyles";
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { Handle, CustomBackground } from '../../assets/components/custom_handle';
import { useTripContext } from '../src/api/TripContext.js';
import ConfirmationModal from '../../assets/components/ConfirmationModal'
import { fetchInstantTripList } from '../src/api/triplist';
import LoadingScreen from '../LoadingScreen';
import { useAutoSave } from '../src/hooks/useAutoSave';
import { autosaveService, restoreDraftById } from '../src/api/autosave';
import { hydrateDraftPlacesDetails, normalizeDraftPlaces } from '../src/utils/draftPlaceNormalizer';
import DraftRestoreModal from '../../assets/components/DraftRestoreModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';
import { useAiJobStore } from '../src/state/aiJobStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const triplist = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const isEditMode = params.isEditMode === 'true';
    console.log('isEditMode', isEditMode);
    console.log('params:', params);
    const [tripData, setTripData] = useState(null);
    const [tripRequest, setTripRequest] = useState(null);
    const { dateRange, setDateRange, selectedPlaces, setSelectedPlaces } = useTripContext();
    const [selectedDay, setSelectedDay] = useState('All');
    const flatListRef = useRef(null);
    const [places, setPlaces] = useState([]);
    const snapPoints = useMemo(() => ['50%', '85%'], []);
    const [paddingBottom, setPaddingBottom] = useState(SCREEN_HEIGHT / 2);
    const [remainingRegenerations, setRemainingRegenerations] = useState(5);
    // const [regenerateModalVisible, setRegenerateModalVisible] = useState(false);
    const [backModalVisible, setBackModalVisible] = useState(false);
    const [attemptsModalVisible, setAttemptsModalVisible] = useState(false);
    const [isInstantTrip, setIsInstantTrip] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Set initial loading state to true
    const [flatListData, setFlatListData] = useState([]);
    const mapRef = useRef(null);
    const [originalData, setOriginalData] = useState([]);
    const abortControllerRef = useRef(null);

    const [showDraftModal, setShowDraftModal] = useState(false);
    const [draftData, setDraftData] = useState(null);
    const [currentDraftId, setCurrentDraftId] = useState(null);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const { run: runSaveTripListFlow, isRunning: isSaveTripListFlowRunning } = useSingleFlightAction('plan:triplist-save-flow');
    const { getJob: getAiJob } = useAiJobStore();

    // day/date 라벨 생성 유틸
    const formatDayLabel = useCallback((startDate, offset) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + offset);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }, []);

    // tripData → flatListData 변환 (id는 보존하고, key만 별도로 생성)
    const buildFlatListData = useCallback((td) => {
        if (!td?.itinerary?.length) return { list: [], days: ['All'] };

        const days = ['All', ...td.itinerary.map((_, idx) => formatDayLabel(td.startDate, idx))];
        const list = [];

        td.itinerary.forEach((day, dayIndex) => {
            // header
            list.push({
                type: 'dayHeader',
                dayIndex,
                date: formatDayLabel(td.startDate, dayIndex),
                key: `header-${dayIndex}`,
            });

            // places
            day.places.forEach((place, placeIndex) => {
                list.push({
                    ...place,                // 👈 place.id 등 원본 보존
                    type: 'place',
                    dayIndex,
                    originalIndex: placeIndex,
                    key: `place-${place.id}-${dayIndex}`, // 👈 키만 별도
                });
            });

            // add button
            list.push({
                type: 'addButton',
                dayIndex,
                key: `add-${dayIndex}`,
            });
        });

        return { list, days };
    }, [formatDayLabel]);

    // tripData가 바뀔 때마다 한 번만 계산
    const dayButtons = useMemo(() => {
        if (!tripData) return ['All'];
        return ['All', ...tripData.itinerary.map((_, idx) => formatDayLabel(tripData.startDate, idx))];
    }, [tripData, formatDayLabel]);

    // places(지도용)과 flatListData를 일관되게 세팅
    useEffect(() => {
        if (!tripData) return;
        const { list } = buildFlatListData(tripData);
        setFlatListData(list);
        setPlaces(list.filter(it => it.type === 'place'));
    }, [tripData, buildFlatListData]);

    const defaultRegion = {
        latitude: 22.2666,
        longitude: 113.9333,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    const handleSheetChanges = useCallback((index) => {
        const snapPercentage = Number(String(snapPoints[index]).replace('%', ''));
        setPaddingBottom(SCREEN_HEIGHT * (1 - snapPercentage / 100));
    }, [snapPoints]);

    const handleCreateTripList = () => {
        runSaveTripListFlow(async () => {
            if (params.from === 'list_details') {
                router.push({
                    pathname: 'list_details',
                    params: {
                        tripDetails: JSON.stringify(tripData),
                        isEditMode: isEditMode
                    }
                });
            } else {
                // Restructure tripData to only include the place IDs
                const firstImageUrl = tripData.itinerary.length > 0 && tripData.itinerary[0].places.length > 0
                    ? tripData.itinerary[0].places[0].imageUrls[0] || 'default_image_url_here' // Replace with a default image URL if needed
                    : '';

                const restructuredTripData = {
                    ...tripData,
                    imageUrl: firstImageUrl,
                    itinerary: tripData.itinerary.map(day => ({
                        places: day.places.map(place => place.id)
                    }))
                };

                router.push({
                    pathname: 'createtriplist',
                    params: {
                        tripData: JSON.stringify(restructuredTripData),
                        // AI 진입 시 컨펌 시점에 백엔드로 같이 보내 ai_requests 문서와 링크.
                        ...(params.aiRequestId ? { aiRequestId: params.aiRequestId } : {}),
                    }
                });
            }
        });
    };

    const scrollToDay = (day) => {
        if (day === 'All') {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        } else {
            const dayIndex = dayButtons.indexOf(day) - 1; // Adjust for zero-based index
            if (dayIndex >= 0) {
                const offset = flatListData.findIndex(
                    it => it.type === 'place' && it.dayIndex === dayIndex
                );
                if (offset !== -1) {
                    flatListRef.current?.scrollToIndex({ index: offset, animated: true });
                }
            }
        }
    };

    useEffect(() => {
        // AI 완료 경로는 store에서 requestPayload 직접 조회 (큰 JSON params 회피).
        if (params.aiRequestId) {
            const job = getAiJob(params.aiRequestId);
            if (job?.requestPayload) setTripRequest(job.requestPayload);
            return;
        }
        if (params.tripRequest) {
            try {
                const parsedTripRequest = JSON.parse(params.tripRequest);
                setTripRequest(parsedTripRequest);
            } catch (error) {
                console.error('Error parsing tripRequest:', error);
            }
        }
    }, [params.aiRequestId, params.tripRequest, getAiJob]);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const loadTripData = async () => {
            try {
                if (params.instantId) {
                    if (abortControllerRef.current) {
                        abortControllerRef.current.abort();
                    }
                    abortControllerRef.current = new AbortController();
                    // This is an instant trip
                    setIsInstantTrip(true);
                    const response = await fetchInstantTripList({
                        instantId: params.instantId,
                        location: {
                            latitude: parseFloat(params.latitude),
                            longitude: parseFloat(params.longitude),
                        },
                    }, abortControllerRef.current.signal);  // Pass the signal to the fetch function

                    if (!abortControllerRef.current.signal.aborted) {
                        setTripData(response);
                    }
                } else if (params.aiRequestId) {
                    // AI 완료 경로 — store에서 result 직접 조회 (URL JSON 직렬화/역직렬화 비용 회피).
                    const job = getAiJob(params.aiRequestId);
                    if (job?.result) {
                        setTripData(job.result);
                    } else {
                        console.error('AI result not found in store for', params.aiRequestId);
                    }
                } else if (params.tripData) {
                    // This is a trip from aifilter
                    const parsedData = JSON.parse(params.tripData);
                    setTripData(parsedData);
                } else {
                    console.error('No trip data or instant trip ID provided');
                }

                if (isEditMode) {
                    const draftCheck = await autosaveService.checkDraft();
                    if (draftCheck.hasDraft) {
                        setCurrentDraftId(draftCheck?.draft?.id ?? draftCheck?.id ?? null);
                        setDraftData(draftCheck);
                        setShowDraftModal(true);
                    } else {
                        setCurrentDraftId(null);
                        setAutoSaveEnabled(true); // 임시저장이 없으면 자동저장 시작
                    }
                }

            } catch (error) {
                console.error('Error loading trip data:', error);
                router.push('/homepage');
            } finally {
                if (!abortControllerRef.current?.signal.aborted) {
                    setIsInstantTrip(false);
                }
                abortControllerRef.current = null;
                // Ensure loading state is set to false only after places are set
                setIsLoading(false);
            }
        };

        loadTripData();
    }, [params.tripData, params.aiRequestId, params.instantId, params.latitude, params.longitude, isEditMode, getAiJob]);

    useEffect(() => {
        if (params.addedPlaces && params.day) {
            const newPlaces = JSON.parse(params.addedPlaces);
            const day = params.day;

            setSelectedPlaces(prevPlaces => {
                const updatedPlaces = { ...prevPlaces };
                if (!updatedPlaces[day]) {
                    updatedPlaces[day] = [];
                }
                // Ensure no duplicates
                newPlaces.forEach(newPlace => {
                    if (!updatedPlaces[day].some(existingPlace => existingPlace.id === newPlace.id)) {
                        updatedPlaces[day].push(newPlace);
                    }
                });
                console.log('Updated selectedPlaces in triplist:', JSON.stringify(updatedPlaces, null, 2));
                return updatedPlaces;
            });
        }
    }, [params.addedPlaces, params.day]);

    const handleRestoreDraft = async () => {
        try {
            if (draftData?.draft) {
                if (!currentDraftId) {
                    Alert.alert('오류', '복원할 임시저장 ID를 찾을 수 없습니다.');
                    return;
                }
                const restoredRes = await restoreDraftById(currentDraftId);
                const restored = restoredRes?.draft || restoredRes;
                const baseDraft = restored || draftData.draft;
                let normalizedDraft = baseDraft;

                if (!normalizedDraft?.itinerary && normalizedDraft?.itineraryData) {
                    try {
                        const parsed = typeof normalizedDraft.itineraryData === 'string'
                            ? JSON.parse(normalizedDraft.itineraryData)
                            : normalizedDraft.itineraryData;
                        normalizedDraft = { ...normalizedDraft, ...(parsed || {}) };
                    } catch (parseError) {
                        console.warn('Failed to parse itineraryData for triplist draft restore', parseError);
                    }
                }

                const normalizedItinerary = normalizeDraftPlaces(normalizedDraft?.itinerary || []);
                const hydratedItinerary = await hydrateDraftPlacesDetails(normalizedItinerary);
                setTripData({
                    ...normalizedDraft,
                    itinerary: hydratedItinerary,
                });

                setCurrentDraftId(restored?.id ?? draftData?.draft?.id ?? draftData?.id ?? null);
            }
            setShowDraftModal(false);
            setAutoSaveEnabled(true);
        } catch (error) {
            console.error('Error restoring draft:', error);
            Alert.alert('오류', '임시저장 복원 중 오류가 발생했습니다.');
        }
    };

    const handleDiscardDraft = async () => {
        try {
            if (currentDraftId) {
                await autosaveService.deleteDraft(currentDraftId);
                setCurrentDraftId(null);
            }
            setShowDraftModal(false);
            setAutoSaveEnabled(true);
        } catch (error) {
            console.error('Error discarding draft:', error);
            // 에러가 발생해도 모달은 닫고 진행
            setShowDraftModal(false);
            setAutoSaveEnabled(true);
        }
    };

    const isValidDrag = (fromIndex, toIndex, originalData) => {
        const fromItem = originalData[fromIndex];
        const toItem = originalData[toIndex];

        // If trying to move a place above a day header or below an add button
        if (fromItem.type === 'place') {
            if (toIndex === 0 || (toItem.type === 'dayHeader' && toIndex < fromIndex)) {
                console.log('Invalid drag: Attempted to move place above day header');
                return false;
            }
            if (toItem.type === 'addButton') {
                console.log('Invalid drag: Attempted to move place below add button');
                return false;
            }
        }

        return true;
    };
    const handleDragEnd = ({ data, from, to }) => {
        // dayHeader / addButton 사이 규칙 체크 (필요 시 isValidDrag 통합)
        if (!isValidDrag(from, to, originalData)) {
            return;
        }

        // 새로운 itinerary 재구성 (type === 'place'만)
        let currentDayIndex = -1;
        const newItinerary = [];
        let currentDayPlaces = [];

        data.forEach(item => {
            if (item.type === 'dayHeader') {
                if (currentDayIndex !== -1) newItinerary.push({ places: currentDayPlaces });
                currentDayIndex = item.dayIndex;
                currentDayPlaces = [];
            } else if (item.type === 'place') {
                const clone = { ...item };
                clone.dayIndex = currentDayIndex; // 위치에 맞춰 갱신
                // key, type 등 UI용 필드는 제외하고 원본 shape 유지
                const { key, type, ...pure } = clone;
                currentDayPlaces.push(pure);
            }
            // addButton은 무시
        });

        if (currentDayIndex !== -1) newItinerary.push({ places: currentDayPlaces });

        setTripData(prev => ({ ...prev, itinerary: newItinerary }));
        setFlatListData(data);
        setPlaces(data.filter(it => it.type === 'place')); // 지도 싱크
    };

    const handleRemovePlace = useCallback((dayIndex, placeId) => {
        setFlatListData(prev => {
            const next = prev.filter(item => !(item.type === 'place' && item.dayIndex === dayIndex && item.id === placeId));
            // 지도 싱크
            setPlaces(next.filter(item => item.type === 'place'));
            return next;
        });
        setTripData(prev => {
            if (!prev?.itinerary) return prev;
            const updatedItinerary = prev.itinerary.map((day, idx) =>
                idx === dayIndex ? { ...day, places: day.places.filter(p => p.id !== placeId) } : day
            );
            return { ...prev, itinerary: updatedItinerary };
        });
    }, []);

    const renderItem = useCallback(({ item, drag, isActive }) => {
        switch (item.type) {
            case 'dayHeader':
                return (
                    <View style={styles.dayHeaderContainer}>
                        <Text style={styles.dayHeader}>Day {item.dayIndex + 1}: {item.date}</Text>
                    </View>
                );
            case 'place':
                return (
                    <ScaleDecorator>
                        <TouchableOpacity
                            onLongPress={isEditMode ? drag : null}
                            onPressIn={() => console.log('Started dragging:', item.name)}
                            onPress={() => router.push({
                                pathname: 'place_details',
                                params: {
                                    placeAll: JSON.stringify(item),
                                    placeId: item.id,
                                    placeName: item.name,
                                    placeAddress: item.shortFormattedAddress,
                                    placeSummary: item.summary,
                                    placeRating: String(item.rating ?? ''),
                                    imageUrls: JSON.stringify(item.imageUrls),
                                    googleid: item.googleid || '' // Assuming googleid is available in your data
                                }
                            })}
                            style={[styles.placeItem, isActive && { opacity: 0.5 }]}
                        >
                            {isEditMode && (
                                <Ionicons name="reorder-three-outline" size={24} color="#fff" style={styles.dragIcon} />
                            )}
                            <Image
                                source={{
                                    uri: (item.imageUrls && item.imageUrls.length > 0)
                                        ? item.imageUrls[0]
                                        : 'https://via.placeholder.com/60'
                                }}
                                style={styles.placeImage}
                            />
                            <View style={styles.placeInfo}>
                                <Text style={styles.placeName}>{item.name}</Text>
                                <Text style={styles.placeDetails}>
                                    {item.shortFormattedAddress}
                                    {Number.isFinite(item.rating) ? ` · ${item.rating} ★` : ''}
                                </Text>
                            </View>
                            {isEditMode && (
                                <TouchableOpacity onPress={() => handleRemovePlace(item.dayIndex, item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Ionicons name="remove-circle-outline" size={24} color="red" />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                    </ScaleDecorator>
                );
            case 'addButton':
                return isEditMode ? (
                    <TouchableOpacity
                        style={styles.addNewPlaceButton}
                        onPress={() => {
                            router.push({
                                pathname: '/add_place',
                                params: { day: item.dayIndex + 1, from: 'triplist', tripData: JSON.stringify(tripData) }
                            });
                        }}
                    >
                        <Ionicons name="add" size={32} color="#ABB7C2" style={styles.addIcon} />
                        <Text style={styles.addNewPlaceButtonText}>Add New Place</Text>
                    </TouchableOpacity>
                ) : null;
        }
    }, [isEditMode, tripData, handleRemovePlace, router]);

    const updateTripData = useCallback(() => {
        if (!selectedPlaces || !tripData) return;

        const maxDay = Math.max(...Object.keys(selectedPlaces).map(k => Number(k)), -1);
        const newItinerary = Array.from({ length: maxDay + 1 }, (_, idx) => {
            const dayPlaces = selectedPlaces[idx] ?? [];
            return { places: dayPlaces.map(p => ({ ...p })) }; // id 등 원본 보존
        });

        setTripData(prev => ({ ...prev, itinerary: newItinerary }));
    }, [selectedPlaces, tripData]);

    useEffect(() => {
        if (params.addedPlaces) {
            updateTripData();
        }
    }, [params.addedPlaces, selectedPlaces, updateTripData]);

    useEffect(() => {
        if (places.length > 0 && mapRef.current) {
            // Extract all valid coordinates
            const coordinates = places
                .filter(place => Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
                .map(place => ({
                    latitude: place.latitude,
                    longitude: place.longitude,
                }));

            if (coordinates.length > 0) {
                mapRef.current.fitToCoordinates(coordinates, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true,
                });
            }
        }
    }, [places]);

    const { saveNow } = useAutoSave({
        tripData,
        isEnabled: autoSaveEnabled,
        debounceMs: 1500,
    });

    const handleBack = () => {
        // draft autosave는 fire-and-forget — 사용자가 "Leave Without Saving" 확인했으므로
        // HTTP 응답 기다리지 않고 즉시 navigate. background로 draft 보존만 시도.
        if (isEditMode && tripData && saveNow) {
            saveNow().catch((e) => console.error('Save before exit failed:', e));
        }
        setBackModalVisible(false);
        // router.push는 stack에 새 instance를 쌓아 homepage useFocusEffect의 fetch들이
        // 매번 재실행됨. replace로 바꿔 stack 누적과 재마운트 부담 모두 회피.
        if (params.from === 'list_details') router.back();
        else router.replace('/homepage');
    };

    const DayToggleButtons = () => (
        <View style={styles.dayButtonsContainer}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayButtonsContentContainer}
            >
                {dayButtons.map((day, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.dayButton, selectedDay === day && styles.selectedDayButton]}
                        onPress={() => handleDayPress(day)}
                        activeOpacity={0.8}
                    >
                        {selectedDay === day && (
                            <LinearGradient
                                colors={['#5468FF', '#81D8D0']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradientOverlay}
                            />
                        )}
                        <Text style={[styles.dayButtonText, selectedDay === day && styles.selectedDayButtonText]}>
                            {day}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const handleDayPress = (day) => {
        setSelectedDay(day);

        let coordinates = [];
        if (day === 'All') {
            // Collect all places coordinates for all days
            coordinates = places
                .filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
                .map(p => ({ latitude: p.latitude, longitude: p.longitude }));
        } else {
            // Collect coordinates for the selected day
            const dayIndex = dayButtons.indexOf(day) - 1;
            coordinates = tripData.itinerary[dayIndex].places
                .filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
                .map(p => ({ latitude: p.latitude, longitude: p.longitude }));
        }

        if (coordinates.length > 0 && mapRef.current) {
            mapRef.current.fitToCoordinates(coordinates, {
                edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                animated: true,
            });
        }

        scrollToDay(day);
    };

    const polylineSets = useMemo(() => {
        if (!tripData?.itinerary?.length) return [];
        if (selectedDay === 'All') {
            return tripData.itinerary.map(day =>
                day.places
                    .filter(place => Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
                    .map(place => ({ latitude: place.latitude, longitude: place.longitude }))
            );
        } else {
            const dayIndex = dayButtons.indexOf(selectedDay) - 1;
            return [tripData.itinerary[dayIndex].places
                .filter(place => Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
                .map(place => ({ latitude: place.latitude, longitude: place.longitude }))
            ];
        }
    }, [tripData, selectedDay, dayButtons]);

    if (isLoading) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <LoadingScreen visible={true} onCancel={() => setIsLoading(false)} />
            </GestureHandlerRootView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={places.length > 0 ? {
                        latitude: Number.isFinite(places[0]?.latitude) ? places[0].latitude : defaultRegion.latitude,
                        longitude: Number.isFinite(places[0]?.longitude) ? places[0].longitude : defaultRegion.longitude,
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421,
                    } : defaultRegion}
                >
                    {/* Markers and Polylines */}
                    {places
                        .filter(place => selectedDay === 'All' || dayButtons[place.dayIndex + 1] === selectedDay)
                        .map((place, index) => (
                            Number.isFinite(place.latitude) && Number.isFinite(place.longitude) && (
                                <Marker key={`${place.id}-${place.dayIndex}`} coordinate={{ latitude: place.latitude, longitude: place.longitude }} title={place.name}>
                                    <View style={styles.markerContainer}>
                                        <Text style={styles.markerText}>{index + 1}</Text>
                                    </View>
                                </Marker>
                            )
                        ))}
                    {polylineSets.map((polylineCoords, index) => (
                        <Polyline
                            key={index}
                            coordinates={polylineCoords.filter(coord => Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude))}
                            strokeColor="#000"
                            strokeWidth={2.5}
                            lineDashPattern={[3, 4]}
                            lineCap="round"
                            lineJoin="round"
                        />
                    ))}
                </MapView>

                {/* Header */}
                <SafeAreaView style={styles.safeAreaHeader}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => {
                                if (isEditMode) {
                                    setBackModalVisible(true);
                                } else {
                                    router.back();
                                }
                            }}
                            style={styles.backButton}
                        >
                            <Ionicons name="chevron-back" size={30} color="white" />
                        </TouchableOpacity>
                        <View style={styles.dayToggleContainer}>
                            <DayToggleButtons />
                        </View>
                    </View>
                </SafeAreaView>

                <BottomSheet
                    index={0}
                    snapPoints={snapPoints}
                    backgroundComponent={CustomBackground}
                    handleComponent={Handle}
                    onChange={handleSheetChanges}
                    enableDynamicSizing={false}
                    enablePanDownToClose={false}
                    enableHandlePanningGesture={true}
                    enableContentPanningGesture={true}
                >
                    <BottomSheetScrollView
                        contentContainerStyle={styles.bottomSheetContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Save 버튼 */}
                        {isEditMode && (
                            <View style={styles.saveButtonContainer}>
                                <TouchableOpacity
                                    onPress={handleCreateTripList}
                                    style={[styles.makeTripListButton, isSaveTripListFlowRunning && { opacity: 0.6 }]}
                                    disabled={isSaveTripListFlowRunning}
                                >
                                    <LinearGradient
                                        colors={['#5468FF', '#81D8D0']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.makeTripListButtonGradient}
                                    >
                                        <Text style={styles.makeTripListButtonText}>{isSaveTripListFlowRunning ? 'Saving...' : 'Save TripList'}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* DraggableFlatList */}
                        <DraggableFlatList
                            ref={flatListRef}
                            data={flatListData}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.key}
                            scrollEnabled={true}
                            onDragEnd={isEditMode ? handleDragEnd : undefined}
                            onDragBegin={isEditMode ? (index) => { setOriginalData([...flatListData]); } : undefined}
                            activationDistance={isEditMode ? 10 : undefined}
                            contentContainerStyle={{
                                paddingBottom: 80,
                            }}
                            onScrollToIndexFailed={({ index, averageItemLength }) => {
                                if (averageItemLength && flatListRef.current?.scrollToOffset) {
                                    flatListRef.current.scrollToOffset({
                                        offset: averageItemLength * index,
                                        animated: true,
                                    });
                                }
                            }}
                        />
                    </BottomSheetScrollView>
                </BottomSheet>

                {/* Modals */}
                <ConfirmationModal
                    visible={attemptsModalVisible}
                    title="No More Attempts"
                    message="You cannot generate more trip lists."
                    onConfirm={() => setAttemptsModalVisible(false)}
                    confirmText="OK"
                    cancelText=""
                />

                <ConfirmationModal
                    visible={backModalVisible}
                    title="Leave Without Saving"
                    message={(
                        <Text>
                            Your current trip list will not be saved.{"\n"}
                            Are you sure you want to leave?
                        </Text>
                    )}
                    onConfirm={() => handleBack()}
                    onCancel={() => setBackModalVisible(false)}
                    confirmText="Yes"
                    cancelText="Cancel"
                />
            </View>
            <DraftRestoreModal
                visible={showDraftModal}
                onRestore={handleRestoreDraft}
                onDiscard={handleDiscardDraft}
                draftData={draftData}
            />
        </GestureHandlerRootView>
    );
}

export default triplist;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    safeAreaHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 24,
        marginTop: 12,
    },
    backButton: {
        backgroundColor: 'black',
        borderRadius: 8,
        padding: 6,
        marginRight: 8,
    },
    dayToggleContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    dragIcon: {
        marginRight: 15,
        marginLeft: -10,
        color: '#fff',
    },
    dayButtonsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 5,
        overflow: 'hidden'
    },
    dayButtonsContentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dayButton: {
        borderRadius: 20,
        margin: 6,
        flexDirection: 'row',
        position: 'relative',
        overflow: 'hidden',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: Color.buttonColor,
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    selectedDayButton: {
        overflow: 'hidden',
    },
    dayButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    selectedDayButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    dayHeaderContainer: {
        paddingVertical: 16,
        paddingLeft: 16,
    },
    dayHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        marginLeft: 0,
    },
    placeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'black',
        borderRadius: 12,
        padding: 12,
    },
    placeImage: {
        width: 76,
        height: 76,
        marginLeft: 8,
        borderRadius: 8,
    },
    placeInfo: {
        flex: 1,
        marginHorizontal: 16,
    },
    placeName: {
        color: '#fff',
        fontSize: 16,
        // fontFamily: "Monsterrat-SemiBold",
        fontWeight: '600',
        paddingBottom: 4,
    },
    placeDetails: {
        color: '#fff',
        fontSize: 12,
        paddingBottom: 2,
        opacity: 0.9,
    },
    removeButton: {
        padding: 5,
    },
    addNewPlaceButton: {
        backgroundColor: '#FFF',
        padding: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    addIcon: {
        marginRight: 8,
    },
    addNewPlaceButtonText: {
        color: '#ABB7C2',
        fontSize: 13,
        fontWeight: '600',
    },
    regenerateButton: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignSelf: 'center',
        backgroundColor: '#000',
        paddingVertical: 20,
        paddingHorizontal: 15,
        zIndex: 10,
        opacity: 0.7,
    },
    regenerateButtonText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    cancelButton: {
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    cancelButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14
    },
    bottomSheetContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    saveButtonContainer: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 4,
        alignItems: 'flex-end',
        backgroundColor: '#000',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    makeTripListButton: {
        borderRadius: 40,
        overflow: 'hidden',
    },
    makeTripListButtonGradient: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 40,
        alignItems: 'center',
    },
    makeTripListButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    markerContainer: {
        backgroundColor: 'black',
        width: 22,
        height: 22,
        borderRadius: 11,
        padding: 5,
        alignItems: 'center',
        justifyContent: 'center'
    },
    markerText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        alignSelf: 'center',
        marginTop: -1,
        marginLeft: 1

    },
});
