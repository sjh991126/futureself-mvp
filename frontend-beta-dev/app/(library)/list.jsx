import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, SafeAreaView, FlatList, TextInput, Animated } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import NavBar from '../../assets/components/navbar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getTriplistByCategory } from '../src/api/my_triplist';
import { TokenManager } from "../src/config";
import { useAppState } from "../src/AppStateHandler";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const SkeletonListItem = () => (
    <View style={styles.listItem}>
        <View style={styles.skeletonImage} />
        <View style={styles.listTextContainer}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonSubtitle} />
        </View>
    </View>
);

const INITIAL_TAB_REFRESHING_STATE = {
    Personal: false,
    Collaborate: false,
    'Past Trips': false,
    Drafts: false,
};

const List = () => {
    const flatListRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('Personal');
    const router = useRouter();
    const setLastUsedFeature = useAppState();
    const [user, setUser] = useState('');
    const [imageTimestamp, setImageTimestamp] = useState(Date.now());

    // Layout stabilization and fade animation
    const [isLayoutReady, setIsLayoutReady] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const tabDataRef = useRef({
        Personal: { content: [], hasMore: true, page: 0, loading: false, lastFetched: null, cacheExpiry: 30 * 60 * 1000 },
        Collaborate: { content: [], hasMore: true, page: 0, loading: false, lastFetched: null, cacheExpiry: 30 * 60 * 1000 },
        'Past Trips': { content: [], hasMore: true, page: 0, loading: false, lastFetched: null, cacheExpiry: 60 * 60 * 1000 },
        Drafts: { content: [], hasMore: true, page: 0, loading: false, lastFetched: null, cacheExpiry: 15 * 60 * 1000 }
    });
    const [tabDataState, setTabDataState] = useState(tabDataRef.current);
    const [loading, setLoading] = useState(false);
    const [refreshingByTab, setRefreshingByTab] = useState(INITIAL_TAB_REFRESHING_STATE);
    const fetchTripListsRef = useRef();

    // 컴포넌트 마운트 시 저장된 상태 복원
    useEffect(() => {
        const restoreUIState = async () => {
            try {
                const savedTab = await AsyncStorage.getItem('lastActiveTab');

                if (savedTab && ['Personal', 'Collaborate', 'Past Trips', 'Drafts'].includes(savedTab)) {
                    console.log('Restoring tab:', savedTab);
                    setActiveTab(savedTab);
                }
            } catch (error) {
                console.error('Failed to restore UI state:', error);
            }
        };

        restoreUIState();
    }, []);

    const formatTripDates = (startDate, endDate) => {
        if (!startDate || !endDate) return '';

        const start = new Date(startDate);
        const end = new Date(endDate);
        const currentYear = new Date().getFullYear();

        const startYear = start.getFullYear();
        const endYear = end.getFullYear();

        // 올해인지 확인
        const isCurrentYear = startYear === currentYear && endYear === currentYear;

        // 1년 이상 차이나는지 확인
        const yearDiff = Math.abs(currentYear - startYear) >= 1 || Math.abs(currentYear - endYear) >= 1;

        const formatOptions = isCurrentYear && !yearDiff
            ? { month: '2-digit', day: '2-digit' }
            : { year: 'numeric', month: '2-digit', day: '2-digit' };

        const startFormatted = start.toLocaleDateString('en-CA', formatOptions).replace(/-/g, '/');
        const endFormatted = end.toLocaleDateString('en-CA', formatOptions).replace(/-/g, '/');

        return `${startFormatted} ~ ${endFormatted}`;
    };

    const getPlaceCount = (draft) => {
        if (!draft) return 0;

        // 1) server-provided count
        if (typeof draft.placeCount === 'number') return draft.placeCount;

        // 2) direct itinerary array
        if (Array.isArray(draft.itinerary)) {
            return draft.itinerary.reduce((sum, day) => {
                const places = Array.isArray(day?.places) ? day.places : [];
                return sum + places.length;
            }, 0);
        }

        // 3) fallback to itineraryData JSON/object
        if (draft.itineraryData) {
            try {
                const parsed = typeof draft.itineraryData === 'string'
                    ? JSON.parse(draft.itineraryData)
                    : draft.itineraryData;
                const itinerary = Array.isArray(parsed)
                    ? parsed
                    : (Array.isArray(parsed?.itinerary) ? parsed.itinerary : []);
                return itinerary.reduce((sum, day) => {
                    const places = Array.isArray(day?.places) ? day.places : [];
                    return sum + places.length;
                }, 0);
            } catch (_) {
                return 0;
            }
        }

        return 0;
    };


    const isCacheValid = useCallback((tabName) => {
        const tabInfo = tabDataRef.current[tabName];

        // 데이터가 없거나 마지막 로딩 시간이 없으면 유효하지 않음
        if (!tabInfo.lastFetched) {
            return false;
        }

        // 현재 로딩 중이면 유효하다고 간주 (중복 로딩 방지)
        if (tabInfo.loading) {
            return true;
        }

        const now = Date.now();
        const isValid = (now - tabInfo.lastFetched) < tabInfo.cacheExpiry;

        console.log(`Cache validation for ${tabName}: ${isValid ? 'VALID' : 'INVALID'} (age: ${Math.round((now - tabInfo.lastFetched) / 1000)}s)`);

        return false;
    }, []);

    const persistTabData = async () => {
        try {
            await AsyncStorage.setItem('tripTabCache', JSON.stringify(tabDataRef.current));
        } catch (error) {
            console.error('Failed to persist tab data:', error);
        }
    };

    const updateTabData = useCallback((category, updates) => {
        const currentData = tabDataRef.current[category];
        const newData = { ...currentData, ...updates };

        console.log(`Updating ${category}:`, updates);

        // ref와 state를 동시에 업데이트
        tabDataRef.current = {
            ...tabDataRef.current,
            [category]: newData
        };

        setTabDataState({ ...tabDataRef.current });

        // 비동기 저장은 별도 실행 (await 없이)
        persistTabData().catch(error => {
            console.error('Failed to persist tab data:', error);
        });
    }, []);

    const setTabRefreshing = useCallback((category, isRefreshing) => {
        setRefreshingByTab(prev => {
            if (prev[category] === isRefreshing) {
                return prev;
            }

            return {
                ...prev,
                [category]: isRefreshing,
            };
        });
    }, []);

    useEffect(() => {
        const restoreTabData = async () => {
            try {
                const cachedData = await AsyncStorage.getItem('tripTabCache');
                if (cachedData) {
                    const parsed = JSON.parse(cachedData);
                    tabDataRef.current = parsed;
                    setTabDataState(parsed);
                    console.log('Restored tab cache from AsyncStorage');
                }
            } catch (error) {
                console.error('Failed to restore tab cache:', error);
            }
        };
        restoreTabData();
    }, []);


    useEffect(() => {
        setLastUsedFeature('MyTripLists');
    }, [setLastUsedFeature]);

    useEffect(() => {
        // Delay layout ready to prevent stretching during navigation
        const timer = setTimeout(() => {
            setIsLayoutReady(true);
            // Smooth fade-in animation
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }, 75);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const initialLoad = async () => {
            console.log(`=== Initial load for ${activeTab} ===`);

            // fetchTripLists ref가 준비되지 않았으면 대기
            if (!fetchTripListsRef.current) {
                console.log('fetchTripLists not ready yet - will retry');
                return;
            }

            const currentTabData = tabDataRef.current[activeTab];

            // 이미 데이터가 있고 유효한 캐시가 있으면 스킵
            if (currentTabData.lastFetched && isCacheValid(activeTab)) {
                console.log(`Initial load for ${activeTab} - using existing cache`);
                return;
            }

            // 이미 로딩 중이면 스킵
            if (currentTabData.loading) {
                console.log(`Initial load for ${activeTab} - already loading`);
                return;
            }

            // 데이터가 없거나 캐시가 무효하면 로딩 시작
            console.log(`Initial load for ${activeTab} - starting fresh load`);
            setLoading(true);

            try {
                await fetchTripListsRef.current(activeTab, true, false);
            } finally {
                setLoading(false);
            }
        };

        initialLoad();
    }, [activeTab, isCacheValid]);

    // tabData가 변경될 때마다 현재 활성 탭의 filteredLists 업데이트
    const filteredLists = useMemo(() => {
        const currentTabContent = tabDataState[activeTab]?.content || [];
        if (searchQuery) {
            return currentTabContent.filter(list =>
                list.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return currentTabContent;
    }, [tabDataState, activeTab, searchQuery]);


    const fetchTripLists = useCallback(async (category, refresh = false, forceRefresh = false) => {
        console.log(`Starting fetchTripLists for ${category}, refresh: ${refresh}, forceRefresh: ${forceRefresh}`);

        const currentTabData = tabDataRef.current[category];

        // 이미 로딩 중이면 스킵 (중복 요청 방지)
        if (currentTabData.loading && !forceRefresh) {
            console.log(`Already loading ${category} - skipping`);
            return;
        }

        try {
            // refresh나 forceRefresh가 아닌 경우 (즉, 무한스크롤인 경우)
            if (!refresh && !forceRefresh) {
                // 무한스크롤: hasMore만 체크하고 캐시는 무시
                if (!currentTabData.hasMore) {
                    console.log(`No more data to load for ${category}`);
                    return;
                }
                console.log(`Infinite scroll - loading more data for ${category}`);
            } else {
                // refresh는 항상 새로 가져오고, forceRefresh가 아닌 일반 로딩만 캐시 체크
                if (!refresh && !forceRefresh && isCacheValid(category)) {
                    console.log(`Using cached data for ${category} (${currentTabData.content.length} items)`);
                    return;
                }
            }

            // 로딩 상태 설정
            console.log(`Setting loading=true for ${category}`);
            updateTabData(category, { loading: true });

            const pageToFetch = refresh || forceRefresh ? 0 : currentTabData.page;
            console.log(`Fetching page ${pageToFetch} for ${category}`);

            const response = await getTriplistByCategory(category, pageToFetch, 10);
            let content = [];
            let isLast = true;
            let pageNumber = pageToFetch;
            if (category === 'Drafts') {
                // Drafts 응답: { drafts, count, page, size, totalPages }
                const raws = response?.drafts || [];
                content = raws.map((d) => {
                    const totalPlaceCount = getPlaceCount(d);
                    const draftName = (typeof d.name === 'string' && d.name.trim().length > 0)
                        ? d.name
                        : 'Untitled Draft';

                    return {
                        // 키/네비게이션에 쓰일 필드들(기존 아이템과 최대한 맞춤)
                        id: d.id,                 // Draft 고유 id
                        isDraft: true,
                        name: draftName,
                        imageUrl: d.imageUrl || null,
                        startDate: d.startDate || null,
                        endDate: d.endDate || null,
                        totalPlaceCount,
                        // 필요시 원본도 보관
                        _raw: d,
                    };
                });
                const totalPages = Number.isFinite(response?.totalPages) ? response.totalPages : 1;
                pageNumber = Number.isFinite(response?.page) ? response.page : pageToFetch;
                isLast = totalPages <= 0 ? true : pageNumber >= (totalPages - 1);
            } else {
                // 기존 페이지네이션 응답
                content = response?.content || [];
                isLast = response?.last !== undefined ? response.last : true;
                pageNumber = response?.number || 0;
            }

            const newContent = (refresh || forceRefresh)
                ? content
                : [...currentTabData.content, ...content];

            console.log(`API call successful for ${category} - fetched ${content.length} items`);

            // 성공 시 모든 상태 한 번에 업데이트
            updateTabData(category, {
                content: newContent,
                hasMore: !isLast,
                page: pageNumber + 1,
                loading: false,
                lastFetched: Date.now()
            });

            console.log(`Successfully loaded ${content.length} items for ${category}`);

        } catch (error) {
            console.error(`Error fetching ${category} trip lists:`, error);
            updateTabData(category, { loading: false });
        } finally {
            if (refresh || forceRefresh) {
                setTabRefreshing(category, false);
            }
        }
    }, [isCacheValid, updateTabData, setTabRefreshing]);

    useEffect(() => {
        fetchTripListsRef.current = fetchTripLists;
    }, [fetchTripLists]);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const userData = await TokenManager.getUserData();
                if (userData) {
                    setUser(userData);
                    setImageTimestamp(Date.now());
                }
                console.log('User:', userData);
            } catch (error) {
                console.error('Error retrieving user data or token:', error);
            }
        };
        checkUser();
    }, []);

    useFocusEffect(
        useCallback(() => {
            const checkForUpdates = async () => {
                const listUpdated = await AsyncStorage.getItem('listUpdated');
                console.log('List updated status from AsyncStorage:', listUpdated);
                const updatedCategory = await AsyncStorage.getItem('updatedCategory');

                if (listUpdated === 'true') {
                    console.log('Detected list update from AsyncStorage');

                    if (updatedCategory && tabDataRef.current[updatedCategory]) {
                        // 특정 카테고리만 무효화
                        console.log(`Invalidating cache for ${updatedCategory}`);
                        updateTabData(updatedCategory, {
                            content: [],
                            hasMore: true,
                            page: 0,
                            loading: false,
                            lastFetched: null
                        });
                        await fetchTripLists(updatedCategory, true, true);
                    } else {
                        // 모든 캐시 무효화
                        console.log('Invalidating all caches');
                        tabDataRef.current = {
                            Personal: { content: [], hasMore: true, page: 0, loading: false, lastFetched: null, cacheExpiry: 5 * 60 * 1000 },
                            Collaborate: { content: [], hasMore: true, page: 0, loading: false, lastFetched: null, cacheExpiry: 5 * 60 * 1000 },
                            'Past Trips': { content: [], hasMore: true, page: 0, loading: false, lastFetched: null, cacheExpiry: 10 * 60 * 1000 },
                            Drafts: { content: [], hasMore: true, page: 0, loading: false, lastFetched: null, cacheExpiry: 3 * 60 * 1000 }
                        };
                        setTabDataState({ ...tabDataRef.current });
                        await fetchTripLists(activeTab, true, true);
                    }

                    await AsyncStorage.removeItem('listUpdated');
                    await AsyncStorage.removeItem('updatedCategory');
                }
            };

            checkForUpdates();
        }, [updateTabData, fetchTripLists, activeTab])
    );

    const showSkeleton = useMemo(() => {
        const currentTab = tabDataState[activeTab];

        // 전역 loading이 true이거나, 탭 데이터가 처음 로딩 중일 때만 skeleton 표시
        if (loading) {
            return true;
        }

        // 데이터가 없고 처음 로딩 중일 때
        if (!currentTab.lastFetched && currentTab.loading) {
            return true;
        }

        return false;
    }, [tabDataState, activeTab, loading]);

    const toggleTab = useCallback(async (tab) => {
        console.log(`Switching to tab: ${tab}`);

        setActiveTab(tab);
        setSearchQuery('');

        // 탭 상태 저장
        try {
            await AsyncStorage.setItem('lastActiveTab', tab);
        } catch (error) {
            console.error('Failed to save active tab:', error);
        }

        const currentTabData = tabDataRef.current[tab];

        if (!currentTabData.lastFetched || currentTabData.content.length === 0) {
            console.log(`No cached data for ${tab} - forcing reload`);
            fetchTripLists(tab, true, true);
            return;
        }

        if (currentTabData.loading) {
            console.log(`Tab switch to ${tab} - already loading`);
            return;
        }

        if (isCacheValid(tab)) {
            console.log(`Tab switch to ${tab} - using cache`);
            return;
        }

        if (!isCacheValid(tab)) {
            console.log(`Cache expired - reloading data for ${tab}`);
            fetchTripLists(tab, true);
        }
    }, [isCacheValid, fetchTripLists]);

    const handleListItemPress = async (item) => {
        try {
            await AsyncStorage.setItem('lastActiveTab', activeTab);
        } catch (error) {
            console.error('Failed to save UI state before navigation:', error);
        }

        if (activeTab === 'Drafts' || item.isDraft) {
            // 초간단: 수동선택 화면으로 보내서 복원 유도
            // (manualselection에서 params 받아 복원 UX를 추가로 구현하면 베스트)
            router.push({
                pathname: '/manualselection',
                params: { restore: 'true', draftId: String(item.id) }
            });
            return;
        }

        router.push({
            pathname: '/list_details',
            params: {
                from: 'list',
                tripListId: item.tripListId,
            }
        });
    };

    useEffect(() => {
        return () => {
            const cleanupOldState = async () => {
                try {
                    const savedTime = await AsyncStorage.getItem('lastStateTime');
                    const now = Date.now();

                    // 10분 이상 지난 상태는 정리
                    if (savedTime && (now - parseInt(savedTime)) > 10 * 60 * 1000) {
                        await AsyncStorage.removeItem('lastActiveTab');
                    }
                } catch (error) {
                    console.error('Failed to cleanup old state:', error);
                }
            };

            cleanupOldState();
        };
    }, []);

    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    const handleEndReached = useCallback(() => {
        console.log('=== handleEndReached called ===');

        const currentTabData = tabDataRef.current[activeTab];
        const isRefreshingCurrentTab = refreshingByTab[activeTab];
        console.log(`Tab: ${activeTab}, loading: ${currentTabData.loading}, hasMore: ${currentTabData.hasMore}, refreshing: ${isRefreshingCurrentTab}`);

        // refreshing 중이거나 loading 중이면 스킵
        if (currentTabData.loading || isRefreshingCurrentTab) {
            console.log(`Skipping - tab loading: ${currentTabData.loading}, refreshing: ${isRefreshingCurrentTab}`);
            return;
        }

        if (!currentTabData.hasMore) {
            console.log(`Skipping - no more data`);
            return;
        }

        console.log(`Proceeding with infinite scroll`);
        fetchTripLists(activeTab, false);
    }, [activeTab, fetchTripLists, refreshingByTab]);

    const renderCollaboratorImages = (collaboratorImageUrls, collaboratorCount, tripOwnerId, tripOwnerImage) => {
        const maxDisplay = 3;
        let imageUrls = [];

        // 1. owner가 현재 사용자가 아닌 경우 owner 이미지 추가
        const currentUserId = user?.userId ?? user?.id;
        if (currentUserId !== tripOwnerId) {
            imageUrls.push(tripOwnerImage);
        }

        // 2. collaborator 이미지들 추가 (현재 사용자 제외)
        if (collaboratorImageUrls) {
            collaboratorImageUrls.forEach(imageUrl => {
                // 현재 사용자의 이미지가 아닌 경우만 추가
                if (imageUrl !== user?.imageUrl) {
                    imageUrls.push(imageUrl);
                }
            });
        }

        // 3. 총 표시해야 할 멤버 수 계산 (현재 사용자 제외)
        let totalMembersToShow = collaboratorCount;

        // 4. 이미지가 없는 멤버들을 위한 null padding
        while (imageUrls.length < totalMembersToShow) {
            imageUrls.push(null);
        }

        // 5. 표시할 멤버가 없는 경우 아무것도 렌더링하지 않음
        if (totalMembersToShow === 0) {
            return null;
        }

        return (
            <View style={styles.collaboratorContainer}>
                {imageUrls.slice(0, maxDisplay).map((imageUrl, index) => (
                    imageUrl ? (
                        <ExpoImage
                            key={index}
                            source={{ uri: `${imageUrl}?timestamp=${imageTimestamp}` }}
                            style={styles.collaboratorImage}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            onError={() => {
                                console.log(`Failed to load collaborator image at index ${index}`);
                            }}
                        />
                    ) : (
                        <View key={index} style={styles.iconContainer}>
                            <Ionicons name="person" size={16} color="#888" />
                        </View>
                    )
                ))}
                {totalMembersToShow > maxDisplay && (
                    <View style={styles.extraCollaborators}>
                        <Text style={styles.extraCollaboratorsText}>+{totalMembersToShow - maxDisplay}</Text>
                    </View>
                )}
            </View>
        );
    };

    const renderListItem = ({ item }) => (
        <TouchableOpacity
            style={styles.listItem}
            disabled={loading || refreshingByTab[activeTab]}
            // onPress={() => router.push({
            //     pathname: '/list_details',
            //     params: {
            //         from: 'list',
            //         tripListId: item.tripListId,
            //     }
            // })}
            onPress={() => handleListItemPress(item)}
        >
            <ExpoImage
                style={styles.listImage}
                source={{ uri: item.imageUrl }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
            />
            <View style={styles.listTextContainer}>
                <Text style={styles.listTitle}>{item.name || 'Untitled Draft'}</Text>
                <View style={styles.tripInfoContainer}>
                    <Text style={styles.numItems}>
                        {item.totalPlaceCount || 0} places
                    </Text>
                    {item.startDate && item.endDate && (
                        <Text style={styles.tripDates}>
                            {formatTripDates(item.startDate, item.endDate)}
                        </Text>
                    )}
                </View>
            </View>
            {activeTab === 'Collaborate' && item.collaboratorCount > 0 && (
                renderCollaboratorImages(
                    item.collaboratorImageUrls,
                    item.collaboratorCount,
                    item.user.userId,
                    item.user.imageUrl
                )
            )}
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.titleContainer}>
                <Text style={styles.title}>Your Trips</Text>
                <TouchableOpacity onPress={() => router.push('/profile')}>

                    {user.imageUrl ? (
                        <ExpoImage
                            style={styles.profileImage}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            source={{ uri: `${user.imageUrl}?timestamp=${imageTimestamp}` }}
                            onError={(e) => {
                                console.log('Failed to load image:', e?.error);
                                setUser(prev => ({ ...prev, imageUrl: null }));
                            }}
                        />
                    ) : (
                        <View style={styles.iconProfileContainer}>
                            <Ionicons name="person" size={24} color="#888" />
                        </View>
                    )}
                </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={24} color="#000" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search"
                        placeholderTextColor="#808080"
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                </View>
            </View>
            <View style={styles.tabContainer}>
                {['Personal', 'Collaborate', 'Past Trips', 'Drafts'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => toggleTab(tab)}
                        disabled={loading}
                    >
                        <LinearGradient
                            style={[styles.tab, activeTab === tab && styles.activeTab]}
                            colors={activeTab === tab ? ['#5468ff', '#81d8d0'] : ['#333', '#333']}
                            locations={[0, 1]}
                            useAngle={true}
                            angle={45}
                        >
                            <Text style={styles.tabText}>{tab}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderContent = () => (
        <FlatList
            ref={flatListRef}
            data={showSkeleton ? Array(5).fill({}) : filteredLists}
            renderItem={({ item, index }) =>
                showSkeleton ? (
                    <SkeletonListItem key={`skeleton-${index}`} />
                ) : (
                    renderListItem({ item, index })
                )
            }
            keyExtractor={(item, index) =>
                showSkeleton ? `skeleton-${index}` : `${item.tripListId ?? item.id ?? index}`
            }
            // 무한 스크롤
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={() => {
                if (!showSkeleton && tabDataState[activeTab].loading) {
                    return (
                        <View style={styles.loadingFooter}>
                            <SkeletonListItem />
                        </View>
                    );
                }
                return null;
            }}
            ListHeaderComponent={
                activeTab === 'Personal' ? (
                    <View style={styles.buttonsContainer}>
                        {!loading && (
                            <>
                                <TouchableOpacity style={styles.button} onPress={() => { router.push('/modeselect') }}>
                                    <View style={styles.buttonIcon}>
                                        <Ionicons name="add" size={24} color="#fff" />
                                    </View>
                                    <Text style={styles.buttonText}>Create New Trip List</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.button} onPress={() => { router.push('/liked_places') }}>
                                    <View style={styles.buttonIcon}>
                                        <Ionicons name="heart" size={24} color="#fff" />
                                    </View>
                                    <Text style={styles.buttonText}>Liked Locations</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                ) : null
            }
            ListEmptyComponent={
                !loading && !tabDataState[activeTab].loading &&
                filteredLists.length === 0 &&
                tabDataState[activeTab].lastFetched && (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyTitle}>
                            {activeTab === 'Personal' && 'No Personal TripLists yet.'}
                            {activeTab === 'Collaborate' && 'No collaborative TripLists yet.'}
                            {activeTab === 'Past Trips' && 'No past trips yet.'}
                            {activeTab === 'Drafts' && 'No draft TripLists yet.'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {activeTab === 'Personal' && 'Create your first trip and start planning!'}
                            {activeTab === 'Collaborate' && 'Invite friends and plan your trip together!'}
                            {activeTab === 'Past Trips' && 'Complete some trips to see them here.'}
                            {activeTab === 'Drafts' && 'Your saved drafts will appear here.'}
                        </Text>
                        {activeTab === 'Collaborate' && (
                            <TouchableOpacity
                                style={styles.emptyButton}
                                onPress={() => router.push('/modeselect')}
                            >
                                <Ionicons name="people" size={20} color="#000" />
                                <Text style={styles.emptyButtonText}>
                                    Create Collaborative TripList
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )
            }
            refreshControl={
                <RefreshControl
                    refreshing={refreshingByTab[activeTab]}
                    onRefresh={() => {
                        console.log('=== Manual refresh triggered ===');
                        const currentTabData = tabDataState[activeTab];
                        const isRefreshingCurrentTab = refreshingByTab[activeTab];

                        // 더 명확한 로그
                        console.log(`Current state - refreshing: ${isRefreshingCurrentTab}, loading: ${currentTabData.loading}`);

                        if (isRefreshingCurrentTab) {
                            console.log('Already refreshing - skipping');
                            return;
                        }

                        if (currentTabData.loading) {
                            console.log('Currently loading data - skipping refresh');
                            return;
                        }

                        console.log(`Starting refresh for ${activeTab}`);
                        setTabRefreshing(activeTab, true);
                        fetchTripLists(activeTab, true, true);
                    }}
                    colors={["#fff"]}
                    tintColor="#fff"
                    progressBackgroundColor="#ffffff"
                    titleColor="#fff"
                />
            }
        />
    );

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={{
                flex: 1,
                opacity: fadeAnim,
                backgroundColor: '#000'
            }}>
                {renderHeader()}
                {/* {loading ? (
                <View>
                    {activeTab === 'Personal' && (
                        <View style={styles.buttonsContainer}>
                            <SkeletonButton />
                        </View>
                    )}
                    {Array(5).fill(0).map((_, index) => (
                        <SkeletonListItem key={index} />
                    ))}
                </View>
            ) : (
                renderContent()
            )} */}
                {renderContent()}

                <NavBar style={styles.navBar} />
            </Animated.View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        backgroundColor: '#000',
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        alignContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        // fontFamily: "Montserrat-Bold",
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    iconProfileContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#ccc",
        justifyContent: 'center',
        alignItems: 'center',
        overflow: "hidden",
    },
    searchContainer: {
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 14,
        height: 42,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 12,
        color: '#000',
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        // paddingHorizontal: 12,
    },
    tab: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    activeTab: {
        backgroundColor: '#5468ff',
    },
    tabText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonsContainer: {
        paddingHorizontal: 16,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#000',
        borderRadius: 10,
        marginBottom: 16,
    },
    buttonIcon: {
        padding: 26,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    listImage: {
        width: 76,
        height: 76,
        borderRadius: 10,
    },
    listTextContainer: {
        flex: 1,
        marginLeft: 16,
    },
    listTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        fontWeight: 'bold',
    },
    tripInfoContainer: {
        flexDirection: 'column',
        gap: 3,
    },
    tripDates: {
        fontSize: 11,
        color: '#aaa',
        fontFamily: "Monsterrat-Regular",
    },
    numItems: {
        color: '#fff',
        fontSize: 14,
    },
    collaboratorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    collaboratorImage: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginLeft: -8,
        borderWidth: 2,
        borderColor: '#000',
    },
    iconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#ccc', // Optional background color
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: -8,
        borderWidth: 2,
        borderColor: '#000',
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
    navBar: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
    },
    // Add styles
    skeletonImage: {
        width: 96,
        height: 96,
        backgroundColor: '#cccccc',
        borderRadius: 8,
        opacity: 0.5,
    },
    skeletonTitle: {
        height: 20,
        backgroundColor: '#cccccc',
        borderRadius: 4,
        marginBottom: 8,
        opacity: 0.5,
    },
    skeletonSubtitle: {
        height: 14,
        width: '60%',
        backgroundColor: '#cccccc',
        borderRadius: 4,
        opacity: 0.5,
    },
    skeletonButtonIcon: {
        width: 24,
        height: 24,
        backgroundColor: '#cccccc',
        borderRadius: 12,
        opacity: 0.5,
    },
    skeletonButtonText: {
        height: 16,
        flex: 1,
        backgroundColor: '#cccccc',
        borderRadius: 4,
        marginLeft: 12,
        opacity: 0.5,
    },
    loadingFooter: {
        paddingVertical: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 20,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 8,
    },
    emptyButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
});

export default List;
