import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, Alert } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTripContext } from './../src/api/TripContext.js';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { Color } from "./planStyles";
import DateIconWhite from '../../assets/icons/calendar_white.jsx';
import DateIconBlack from '../../assets/icons/calendar_black.jsx';
import CalendarManualScreen from './CalendarManualScreen.js';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Handle, CustomBackground } from '../../assets/components/custom_handle';
import { useAppState } from "../src/AppStateHandler";
import { autosaveService } from '../src/api/autosave.js';
import { useAutoSave } from '../src/hooks/useAutoSave';
import { hydrateDraftPlacesDetails, normalizeDraftPlaces } from '../src/utils/draftPlaceNormalizer.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const defaultRegion = {
    latitude: 22.2666,
    longitude: 113.9333,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
};

let draftAskedThisSession = false;

const manualselection = () => {
    const router = useRouter();
    const navRoute = useRoute();
    const localParams = useLocalSearchParams();
    const { restore: routeRestore, draftId: routeDraftId } = navRoute.params || {};
    const restore = routeRestore ?? localParams?.restore;
    const draftId = routeDraftId ?? localParams?.draftId;
    const targetDraftId = Array.isArray(draftId) ? draftId[0] : draftId;
    const isRestoreRouteEntry = String(restore) === 'true' && !!targetDraftId;
    const { dateRange, setDateRange, selectedPlaces, setSelectedPlaces } = useTripContext();
    const mapRef = useRef(null);
    const snapPoints = useMemo(() => ['20%', '60%', '85%'], []);
    const [selectedDay, setSelectedDay] = useState('All');
    const [paddingBottom, setPaddingBottom] = useState(SCREEN_HEIGHT / 3);
    const [dayButtons, setDayButtons] = useState([]);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [flatListData, setFlatListData] = useState([]);
    const [currentDraftId, setCurrentDraftId] = useState(null);
    const setLastUsedFeature = useAppState();
    const DRAFT_ID_KEY = 'draftId';
    const restoreAskedRef = useRef(false);


    const [currentLocation, setCurrentLocation] = useState(null);
    const [locationPermission, setLocationPermission] = useState(false);
    const { run: runCreateFromManual, isRunning: isCreatingFromManual } = useSingleFlightAction('plan:manualselection-create');
    const hasEditorState = useMemo(() => {
        const hasDates = !!(dateRange?.start || dateRange?.end);
        const hasPlaces = Array.isArray(selectedPlaces?.places)
            && selectedPlaces.places.some((day) => Array.isArray(day) && day.length > 0);

        return hasDates || hasPlaces;
    }, [dateRange?.start, dateRange?.end, selectedPlaces?.places]);

    useEffect(() => {
        (async () => {
            try {
                // 위치 권한 요청
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.log('위치 권한이 거부되었습니다');
                    setLocationPermission(false);
                    return;
                }

                setLocationPermission(true);

                // 현재 위치 가져오기
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

                const { latitude, longitude } = location.coords;
                setCurrentLocation({ latitude, longitude });

                console.log('현재 위치:', latitude, longitude);
            } catch (error) {
                console.error('위치 가져오기 실패:', error);
            }
        })();
    }, []);

    const buildDraftPayload = useCallback(() => {
        const dayPlaces = Array.isArray(selectedPlaces?.places)
            ? selectedPlaces.places
            : [];

        const extractPlaceId = (place) =>
            place?.id ??
            place?.placeId ??
            place?.googleid ??
            place?.googleId ??
            null;

        const hasDates = !!(dateRange?.start && dateRange?.end);
        const hasPlaces = dayPlaces.some((d) => Array.isArray(d) && d.length > 0);
        const firstImageUrl =
            hasPlaces && dayPlaces[0]?.[0]?.imageUrls?.[0]
                ? dayPlaces[0][0].imageUrls[0]
                : (hasPlaces ? (dayPlaces[0]?.[0]?.imageUrl || null) : null);

        const itinerary = hasPlaces
            ? dayPlaces
                .map((day) => {
                    const placeIds = (day || [])
                        .map(extractPlaceId)
                        .filter((id) => id !== null && id !== undefined && id !== '');
                    return { places: placeIds };
                })
                .filter((day) => day.places.length > 0)
            : null;

        return {
            tripListId: null,
            name: "",
            categoryId: null,
            imageUrl: firstImageUrl,
            startDate: hasDates ? dateRange.start : null,
            endDate: hasDates ? dateRange.end : null,
            isPublic: false,
            itinerary: itinerary || [],
        };
    }, [selectedPlaces?.places, dateRange?.start, dateRange?.end]);

    const draftPayload = useMemo(() => buildDraftPayload(), [buildDraftPayload]);
    const { saveNow: saveDraftNow } = useAutoSave({
        tripData: draftPayload,
        isEnabled: true,
        debounceMs: 1500,
    });

    const applyDraftToEditorState = useCallback(async (draftLike) => {
        if (!draftLike) return;

        let normalized = draftLike;
        if (!normalized?.itinerary && normalized?.itineraryData) {
            try {
                const parsed = typeof normalized.itineraryData === 'string'
                    ? JSON.parse(normalized.itineraryData)
                    : normalized.itineraryData;
                normalized = { ...normalized, ...(parsed || {}) };
            } catch (e) {
                console.warn('Failed to parse itineraryData for draft restore', e);
            }
        }

        if (normalized?.startDate && normalized?.endDate) {
            setDateRange({
                start: normalized.startDate,
                end: normalized.endDate
            });
        }

        if (Array.isArray(normalized?.itinerary)) {
            const itineraryForEditor = normalized.itinerary.map((day) => ({
                ...day,
                places: Array.isArray(day?.placesMeta) && day.placesMeta.length
                    ? day.placesMeta
                    : (day?.places || []),
            }));
            const normalizedItinerary = normalizeDraftPlaces(itineraryForEditor);
            const hydratedItinerary = await hydrateDraftPlacesDetails(normalizedItinerary);
            const rebuilt = hydratedItinerary.map(d => d.places || []);
            setSelectedPlaces({ places: rebuilt });
        }
    }, [setDateRange, setSelectedPlaces]);

    useFocusEffect(
        useCallback(() => {
        const askRestore = async () => {
            // 이미 물어봤으면 리턴
            if (restoreAskedRef.current) {
                console.log('Already asked to restore, skipping...');
                return;
            }

            try {
                const restoreFlag = String(restore) === 'true';

                if (!restoreFlag && hasEditorState) {
                    restoreAskedRef.current = true;
                    draftAskedThisSession = true;
                    console.log('Editor already has content, skipping draft restore prompt');
                    return;
                }

                if (!restoreFlag && draftAskedThisSession) {
                    restoreAskedRef.current = true;
                    return;
                }

                if (restoreFlag && targetDraftId) {
                    restoreAskedRef.current = true;
                    const res = await autosaveService.getDraftById(targetDraftId);

                    if (res?.hasDraft && res?.draft) {
                        await applyDraftToEditorState(res.draft);
                        setCurrentDraftId(res.draft?.id ?? targetDraftId);
                        // restore=true 경로는 데이터를 로드만 하고 즉시 상태 마킹하지 않는다.
                        draftAskedThisSession = false;
                    } else {
                        setCurrentDraftId(null);
                        console.warn(`Draft not found for id=${targetDraftId}`);
                    }
                    return;
                }

                const res = await autosaveService.checkDraft();
                console.log('Draft check result:', res);

                if (!res?.hasDraft) {
                    setCurrentDraftId(null);
                    draftAskedThisSession = true;
                    console.log('No draft found');
                    return;
                }

                const foundDraftId = res?.draft?.id ?? res?.id ?? null;
                setCurrentDraftId(foundDraftId);
                restoreAskedRef.current = true; // 플래그 설정
                draftAskedThisSession = true;

                Alert.alert(
                    'Restore draft?',
                    'A previous draft was found. Do you want to restore it?',
                    [
                        {
                            text: 'No',
                            onPress: async () => {
                                console.log('User declined restore, deleting draft...');
                                // No 선택 시 draft 삭제
                                try {
                                    const deleteId = foundDraftId ?? currentDraftId;
                                    if (deleteId) {
                                        await autosaveService.deleteDraft(deleteId);
                                        setCurrentDraftId(null);
                                        await AsyncStorage.removeItem(DRAFT_ID_KEY);
                                        console.log('Draft deleted successfully');
                                    }
                                    draftAskedThisSession = false;
                                } catch (error) {
                                    console.error('Failed to delete draft:', error);
                                }
                            },
                            style: 'cancel'
                        },
                        {
                            text: 'Yes',
                            onPress: async () => {
                                try {
                                    console.log('Restoring draft...');
                                    if (!foundDraftId) {
                                        Alert.alert('Failed', 'Could not restore draft.');
                                        return;
                                    }
                                    // getDraftById로 데이터를 가져와서 에디터에 적용
                                    const draftRes = await autosaveService.getDraftById(foundDraftId);
                                    if (!draftRes?.hasDraft || !draftRes?.draft) {
                                        Alert.alert('Failed', 'Could not restore draft.');
                                        return;
                                    }
                                    setCurrentDraftId(draftRes.draft?.id ?? foundDraftId);
                                    await applyDraftToEditorState(draftRes.draft);
                                    draftAskedThisSession = false;

                                    console.log('Draft restored successfully');
                                    Alert.alert('Restored', 'Draft restored successfully.');
                                } catch (e) {
                                    console.error('Restore failed:', e);
                                    Alert.alert('Failed', 'Could not restore draft.');
                                }
                            }
                        }
                    ],
                    { cancelable: false } // 외부 클릭으로 닫기 방지
                );
            } catch (e) {
                console.error('Draft check failed:', e);
            }
        };

        // 약간의 딜레이 후 실행 (컴포넌트 마운트 완료 대기)
        const timeoutId = setTimeout(() => {
            askRestore();
        }, 500);

            return () => clearTimeout(timeoutId);
        }, [applyDraftToEditorState, draftId, hasEditorState, restore])
    );

    const toggleCalendar = () => {
        setCalendarOpen(prevState => !prevState);
    };

    const handleSheetChanges = (index) => {
        const snapPercentage = parseInt(snapPoints[index], 10) / 100;
        const bottomPadding = SCREEN_HEIGHT * (1 - snapPercentage);
        setPaddingBottom(bottomPadding);
    };

    useEffect(() => {
        setLastUsedFeature('manualTripList');
    }, [setLastUsedFeature]);

    useEffect(() => {
        if (!dateRange.start && !dateRange.end) {
            setTimeout(() => setCalendarOpen(true), 100);
        }
    }, []);

    useEffect(() => {
        if (selectedPlaces && selectedPlaces.places && selectedPlaces.places.length > 0) {
            let coordinates = [];

            if (selectedDay === 'All') {
                coordinates = selectedPlaces.places.flatMap(dayPlaces =>
                    dayPlaces.map(place => ({
                        latitude: place.latitude,
                        longitude: place.longitude,
                    }))
                );
            } else {
                const dayIndex = dayButtons.indexOf(selectedDay) - 1;
                coordinates = selectedPlaces.places[dayIndex]?.map(place => ({
                    latitude: place.latitude,
                    longitude: place.longitude,
                })) || [];
            }

            if (coordinates.length > 0 && mapRef.current) {
                const timeoutId = setTimeout(() => {
                    mapRef.current.fitToCoordinates(coordinates, {
                        edgePadding: { top: 50, right: 50, bottom: 300, left: 50 }, // bottom 패딩 증가
                        animated: true,
                    });
                }, 300);

                return () => clearTimeout(timeoutId);
            }
        }
    }, [selectedDay]);

    useEffect(() => {
        if (dateRange.start && dateRange.end) {
            // Initialize dayButtons based on the date range
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);

            const buttons = ['All'];
            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                buttons.push(currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            setDayButtons(buttons);
        }
    }, [dateRange]);

    useEffect(() => {
        console.log('selectedPlaces:', selectedPlaces); // Log selectedPlaces to see the current state

        if (dateRange.start && dateRange.end) {
            const newFlatListData = [];

            // Calculate the number of days between start and end date
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);
            let currentDate = new Date(startDate);

            let dayIndex = 0;

            while (currentDate <= endDate) {
                // Add day header
                newFlatListData.push({
                    type: 'dayHeader',
                    dayIndex: dayIndex,
                    date: formatDate(currentDate),
                });

                // Add places for the day (if any), or skip if none
                const dayPlaces = selectedPlaces.places?.[dayIndex] || [];
                dayPlaces.forEach(place => {
                    newFlatListData.push({
                        ...place,
                        type: 'place',
                        dayIndex: dayIndex,
                    });
                });

                // Add the "Add New Place" button for each day
                newFlatListData.push({
                    type: 'addButton',
                    dayIndex: dayIndex,
                });

                // Move to the next day
                currentDate.setDate(currentDate.getDate() + 1);
                dayIndex += 1;
            }

            console.log('Generated flatListData:', newFlatListData); // Log the generated flatListData

            // Set the updated flatListData
            setFlatListData(newFlatListData);
        }
    }, [dateRange, selectedPlaces]);

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
        const originalData = [...flatListData];  // Make a copy of the original list before mutation

        if (!isValidDrag(from, to, originalData)) {
            console.log('Invalid drag detected. Rolling back changes.');
            return; // This will cause the list to revert to its previous state
        }

        const movedItem = data[to];

        if (!movedItem || movedItem.type !== 'place') {
            return;
        }

        const fromDayIndex = data.slice(0, from + 1).filter(item => item.type === 'dayHeader').length - 1;
        const toDayIndex = data.slice(0, to + 1).filter(item => item.type === 'dayHeader').length - 1;

        let newPlaces = JSON.parse(JSON.stringify(selectedPlaces.places));

        // Remove from original position
        newPlaces[fromDayIndex] = newPlaces[fromDayIndex].filter(place => place.id !== movedItem.id);

        // Ensure destination day array is initialized
        if (!newPlaces[toDayIndex]) {
            newPlaces[toDayIndex] = [];
        }

        // Add to new position
        if (!newPlaces[toDayIndex].some(place => place.id === movedItem.id)) {
            const { dayIndex, type, ...placeDetails } = movedItem;
            const insertIndex = to - data.findIndex(item => item.type === 'dayHeader' && item.dayIndex === toDayIndex) - 1;
            newPlaces[toDayIndex].splice(insertIndex, 0, placeDetails);
        }

        setSelectedPlaces({ ...selectedPlaces, places: newPlaces });
    };

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
                            onLongPress={drag}
                            style={[styles.placeItem, isActive && { opacity: 0.5 }]}
                        >
                            <Ionicons name="reorder-three-outline" size={24} color="#fff" style={styles.dragIcon} />
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
                                    {item.shortFormattedAddress} · {item.rating} ★
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => handleRemovePlace(item.dayIndex, item.id)}
                            >
                                <Ionicons name="remove-circle-outline" size={24} color="red" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </ScaleDecorator>
                );
            case 'addButton':
                return (
                    <TouchableOpacity
                        style={styles.addPlaceButton}
                        onPress={() => {
                            router.push({
                                pathname: '/add_place',
                                params: { day: item.dayIndex + 1, from: 'manualselection' }
                            });
                        }}
                    >
                        <Ionicons name="add" size={32} color="#ABB7C2" style={styles.addIcon} />
                        <Text style={styles.addPlaceText}>Add New Place</Text>
                    </TouchableOpacity>
                );
        }
    }, [router]);

    const handleSearch = (query) => {
        // setMapSearchQuery(query);
        // setFilteredPlaces(places.filter(place =>
        //     place && place.name && place.name.toLowerCase().includes(query.toLowerCase())
        // ));
    };

    const formatDate = (date) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(date).toLocaleDateString(undefined, options);
    };

    const handleDayPress = (day) => {
        setSelectedDay(day);
    };

    const DayToggleButtons = () => (
        // <View style={styles.dayButtonsContainer}>
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayButtonsContainer}
            style={styles.dayButtonsScrollView}
        >
            {
                dayButtons.map((day, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.dayButton,
                            selectedDay === day && styles.selectedDayButton
                        ]}
                        onPress={() => handleDayPress(day)}
                    >
                        {selectedDay === day && (
                            <LinearGradient
                                colors={['#5468FF', '#81D8D0']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradientOverlay}
                            />
                        )}
                        <Text style={[
                            styles.dayButtonText,
                            selectedDay === day && styles.selectedDayButtonText
                        ]}>
                            {day}
                        </Text>
                    </TouchableOpacity>
                ))
            }
            {/* </View > */}
        </ScrollView>
    );

    const handleDateRangeSelect = (start, end) => {
        setDateRange({ start, end });
    };

    const isSameDay = (a, b) => {
        if (!a || !b) return false;
        const da = new Date(a), db = new Date(b);
        return da.toDateString() === db.toDateString();
    };

    const getDateRangeText = () => {
        if (isSameDay(dateRange.start, dateRange.end)) {
            return `${formatDate(dateRange.start)}`;
        } else if (dateRange.start && dateRange.end) {
            return `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`;
        } else {
            return 'Add custom date range';
        }
    };

    const renderDateButton = () => {
        const isDateSelected = dateRange.start && dateRange.end;

        if (isDateSelected) {
            return (
                <LinearGradient
                    colors={['#5468FF', '#81D8D0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.dateButton}
                >
                    <TouchableOpacity onPress={toggleCalendar} style={styles.dateButtonContent}>
                        <DateIconWhite width={24} height={24} />
                        <Text style={[styles.dropdownText, { color: 'white' }]} numberOfLines={1} ellipsizeMode='tail'>
                            {getDateRangeText()}
                        </Text>
                    </TouchableOpacity>
                </LinearGradient>
            );
        } else {
            return (
                <TouchableOpacity onPress={toggleCalendar} style={[styles.dateButton, styles.dateButtonUnselected]}>
                    <DateIconBlack width={24} height={24} />
                    <Text style={[styles.dropdownText, { color: 'black' }]} numberOfLines={1} ellipsizeMode='tail'>
                        {getDateRangeText()}
                    </Text>
                </TouchableOpacity>
            );
        }
    };

    const makeTripList = async () => {
        await runCreateFromManual(async () => {
            console.log('selectedPlaces:', JSON.stringify(selectedPlaces, null, 2)); // Log selectedPlaces to debug

            const firstImageUrl = selectedPlaces.places.length > 0 && selectedPlaces.places[0].length > 0
                ? selectedPlaces.places[0][0].imageUrls[0]
                : null; // Provide a fallback in case there are no places or imageUrls

            const tripData = {
                name: "",
                imageUrl: firstImageUrl,
                startDate: dateRange.start,
                endDate: dateRange.end,
                itinerary: selectedPlaces.places.map(dayPlaces => ({
                    places: dayPlaces.map(place => place.id) // Extract place IDs into a list of strings
                }))
            };

            console.log('tripData:', JSON.stringify(tripData, null, 2)); // Log the tripData to see the structure

            router.push({
                pathname: '/createtriplist',
                params: {
                    tripData: JSON.stringify(tripData),
                    ...(currentDraftId ? { draftId: String(currentDraftId) } : {}),
                }
            });
        });
    };

    const handleRemovePlace = (dayIndex, placeId) => {
        const updatedPlaces = selectedPlaces.places.map((dayPlaces, index) =>
            index === dayIndex ? dayPlaces.filter(place => place.id !== placeId) : dayPlaces
        );
        setSelectedPlaces({ ...selectedPlaces, places: updatedPlaces });
    };

    // getPolylineCoordinates를 useMemo로 최적화
    const polylineCoordinates = useMemo(() => {
        if (!selectedPlaces.places) {
            return [];
        }

        if (selectedDay === 'All') {
            return selectedPlaces.places.flatMap(dayPlaces => {
                if (dayPlaces.length > 1) {
                    return [{
                        coordinates: dayPlaces.map(place => ({
                            latitude: place.latitude,
                            longitude: place.longitude,
                        })),
                    }];
                }
                return [];
            });
        } else {
            const dayIndex = dayButtons.indexOf(selectedDay) - 1;
            return (selectedPlaces.places[dayIndex] || []).map(place => ({
                latitude: place.latitude,
                longitude: place.longitude,
            }));
        }
    }, [selectedPlaces.places, selectedDay, dayButtons]);

    const initialRegion = useMemo(() => {
        // 1순위: 현재 위치
        if (currentLocation) {
            return {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            };
        }

        // 2순위: 선택된 장소
        const first = selectedPlaces?.places?.find(d => Array.isArray(d) && d.length)?.[0];
        if (first) {
            return {
                latitude: first.latitude,
                longitude: first.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            };
        }

        // 3순위: 기본 위치
        return defaultRegion;
    }, [currentLocation, selectedPlaces?.places]);

    const handleMapReady = () => {
        if (mapRef.current && initialRegion) {
            // bottomsheet 높이를 고려한 패딩 (초기 snapPoint가 60%이므로)
            const bottomSheetHeight = SCREEN_HEIGHT * 0.6;

            mapRef.current.animateToRegion(
                {
                    ...initialRegion,
                    latitudeDelta: 0.05, // 줌 레벨 조정
                    longitudeDelta: 0.05,
                },
                1000
            );

            // 카메라를 약간 위로 이동시켜 bottomsheet에 가려지지 않게
            setTimeout(() => {
                mapRef.current.animateCamera({
                    center: {
                        latitude: initialRegion.latitude + 0.015, // 위로 약간 이동
                        longitude: initialRegion.longitude,
                    },
                    zoom: 14,
                }, { duration: 500 });
            }, 1000);
        }
    };

    const handleGoToCurrentLocation = () => {
        if (currentLocation && mapRef.current) {
            mapRef.current.animateCamera({
                center: {
                    latitude: currentLocation.latitude + 0.015, // bottomsheet 고려
                    longitude: currentLocation.longitude,
                },
                zoom: 14,
            }, { duration: 500 });
        } else {
            Alert.alert('위치 오류', '현재 위치를 가져올 수 없습니다.');
        }
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={initialRegion}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                    onMapReady={handleMapReady}
                >
                    {selectedPlaces.places && selectedPlaces.places.flatMap((dayPlaces, dayIndex) => {
                        if (selectedDay === 'All' || dayButtons[dayIndex + 1] === selectedDay) {
                            return dayPlaces.map((place, index) => (
                                <Marker
                                    key={place.id}
                                    coordinate={{ latitude: place.latitude, longitude: place.longitude }}
                                    title={place.name}
                                >
                                    <View style={styles.markerContainer}>
                                        <Text style={styles.markerText}>{index + 1}</Text>
                                    </View>
                                </Marker>
                            ));
                        } else {
                            return [];
                        }
                    })}

                    {selectedDay === 'All'
                        ? polylineCoordinates.map((polylineData, index) => (
                            <Polyline
                                key={`polyline-${index}`}
                                coordinates={polylineData.coordinates}
                                strokeColor="#000"
                                strokeWidth={2.5}
                                lineDashPattern={[3, 4]}
                                lineCap="round"
                                lineJoin="round"
                            />
                        ))
                        : polylineCoordinates.length > 0 && (
                            <Polyline
                                coordinates={polylineCoordinates}
                                strokeColor="#000"
                                strokeWidth={2.5}
                                lineDashPattern={[3, 4]}
                                lineCap="round"
                                lineJoin="round"
                            />
                        )}
                </MapView>

                {/* 현재 위치로 이동하는 버튼 */}
                {/* {locationPermission && (
                    <TouchableOpacity
                        style={[styles.locationButton, { bottom: locationButtonBottom }]} // 동적 bottom 적용
                        onPress={handleGoToCurrentLocation}
                    >
                        <Ionicons name="locate" size={24} color="white" />
                    </TouchableOpacity>
                )} */}

                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert(
                                'Leave',
                                'Save your current trip as a draft?',
                                [
                                    {
                                        text: 'Save Draft',
                                        onPress: async () => {
                                            await saveDraftNow();
                                            // 🔥 저장 완료 후 이동
                                            setTimeout(() => router.push('/homepage'), 300);
                                        }
                                    },
                                    {
                                        text: 'Discard',
                                        style: 'destructive',
                                        onPress: async () => {
                                            // Drafts 탭에서 복원 진입한 경우는 기존 draft를 유지한다.
                                            if (isRestoreRouteEntry) {
                                                draftAskedThisSession = false;
                                                router.push('/homepage');
                                                return;
                                            }
                                            // 일반 진입 플로우에서는 Discard 시 기존 recent draft를 삭제한다.
                                            try {
                                                if (currentDraftId) {
                                                    await autosaveService.deleteDraft(currentDraftId);
                                                    setCurrentDraftId(null);
                                                    await AsyncStorage.removeItem(DRAFT_ID_KEY);
                                                }
                                                draftAskedThisSession = false;
                                            } catch (error) {
                                                console.error('Failed to delete draft:', error);
                                            }
                                            router.push('/homepage');
                                        }
                                    },
                                    { text: 'Cancel', style: 'cancel' }
                                ]
                            );
                        }}
                        style={styles.backButton}
                    >
                        <Ionicons name="chevron-back" size={30} color="white" />
                    </TouchableOpacity>
                    <View style={styles.dayToggleContainer}>
                        <DayToggleButtons />
                    </View>
                </View>
                <BottomSheet
                    index={1}
                    snapPoints={snapPoints}
                    backgroundComponent={CustomBackground}
                    handleComponent={Handle}
                    onChange={handleSheetChanges}
                >
                    <BottomSheetScrollView
                        contentContainerStyle={styles.bottomSheetContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={[styles.panelView, { paddingBottom }]}>
                            <View style={styles.panelHeader}>
                                <View style={styles.headerButtonContainer}>
                                    {Array.isArray(selectedPlaces?.places) &&
                                        selectedPlaces.places.some(d => d?.length) &&
                                        dateRange?.start &&
                                        dateRange?.end ? (
                                        // Create 가능할 때
                                        <TouchableOpacity
                                            onPress={makeTripList}
                                            style={[styles.createButtonSimple, isCreatingFromManual && { opacity: 0.6 }]}
                                            disabled={isCreatingFromManual}
                                        >
                                            <Text style={styles.createButtonText}>{isCreatingFromManual ? 'Creating...' : 'Create'}</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        // 아직 준비 안 되었을 때
                                        <View style={styles.placeholderButton}>
                                            <Text style={styles.placeholderText}>Add dates and places to create trip</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            {renderDateButton()}
                            {calendarOpen && (
                                <View style={styles.calendarContainer}>
                                    <CalendarManualScreen
                                        onSelectRange={handleDateRangeSelect}
                                        onClose={toggleCalendar}
                                        startDateProp={dateRange.start}
                                        endDateProp={dateRange.end}
                                    />
                                </View>
                            )}
                            {dateRange.start && dateRange.end && (
                                <DraggableFlatList
                                    data={flatListData}
                                    renderItem={renderItem}
                                    keyExtractor={(item, index) => {
                                        if (item.type === 'place') return `place-${item.id}-${item.dayIndex}`;
                                        if (item.type === 'dayHeader') return `header-${item.dayIndex}`;
                                        if (item.type === 'addButton') return `add-${item.dayIndex}`;
                                        return `item-${index}`;
                                    }}
                                    onDragEnd={handleDragEnd}
                                    contentContainerStyle={{ paddingBottom: paddingBottom }}
                                />
                            )}
                        </View>
                    </BottomSheetScrollView>
                </BottomSheet>
            </View>
        </GestureHandlerRootView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
        padding: 20,

    },
    locationButton: {
        position: 'absolute',
        right: 20,
        backgroundColor: '#000',
        borderRadius: 30,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 28,
        marginTop: 20,
    },
    backButton: {
        backgroundColor: 'black',
        borderRadius: 7,
        padding: 4,
        marginRight: 8,
    },
    dayToggleContainer: {
        flex: 1, // Allow the day toggle buttons to take up remaining space
        flexDirection: 'row',
        justifyContent: 'flex-start', // Align to the start of the container
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    dayButtonsScrollView: {
        maxHeight: 50,
    },
    dayButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
    },
    dayButton: {
        borderRadius: 20,
        margin: 5,
        flexDirection: 'row',
        position: 'relative',
        overflow: 'hidden',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 15,
        backgroundColor: Color.buttonColor,
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
    panel: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 5,
    },
    expandedPanel: {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
    bottomSheetContent: {
        flex: 1,
        padding: 10,
    },
    panelView: {
        paddingHorizontal: 12,
    },
    panelHeader: {
        alignItems: 'center',
    },
    createButtonFull: {
        width: '100%',
        height: 44,
        borderRadius: 10,
        overflow: 'hidden',
    },
    createGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerButtonContainer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    createButtonSimple: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    createButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    placeholderButton: {
        width: '100%',
        height: 44,
        borderRadius: 10,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    placeholderText: {
        color: '#666',
        fontSize: 12,
    },
    panelHandle: {
        width: '35%',
        height: 5,
        borderRadius: 3,
        backgroundColor: 'white',
        marginBottom: 20,
    },
    calendarContainer: {
        borderColor: 'white',
        borderWidth: 1,
        paddingHorizontal: 28,
        borderRadius: 10,
        marginVertical: 10,
    },
    makeTripListButton: {
        alignSelf: 'flex-end',
        paddingVertical: 8,
    },

    makeTripListText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },

    dateButton: {
        borderRadius: 10,
        marginTop: 20,
        overflow: 'hidden',
    },
    dateButtonUnselected: {
        backgroundColor: '#FFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
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
    placeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'black',
        borderRadius: 10,
        padding: 10,
        // marginVertical: 5,

    },
    dragIcon: {
        marginRight: 15,
        marginLeft: -10,
        color: '#fff',
    },
    placeImage: {
        width: 76,
        height: 76,
        marginLeft: 10,
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
        fontFamily: "Monsterrat-Regular",
        paddingBottom: 4,
    },
    removeButton: {
        padding: 5,
    },
    dayScheduleContainer: {
    },
    daySchedule: {
        marginTop: 32,
    },
    dayHeaderContainer: {
        paddingVertical: 16,
    },
    dayHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    addPlaceButton: {
        backgroundColor: '#FFF',
        padding: 4,
        borderRadius: 10,
        marginTop: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    addIcon: {
        marginRight: 8,
    },
    addPlaceText: {
        color: '#ABB7C2',
        fontSize: 12,
        fontWeight: '600'
    },
    searchContainer: {
        height: 42,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 14,
        borderRadius: 10,
        marginVertical: 8,
        flex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#000',
        fontSize: 12
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

export default manualselection;
