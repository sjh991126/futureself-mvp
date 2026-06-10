import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, RefreshControl, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NavBar from '../../assets/components/navbar';
import ConfirmationModal from "../../assets/components/ConfirmationModal";
import { fetchUser } from '../slices/userSlice';
import { fetchLocation } from '../slices/locationSlice';
import { loadCategories } from '../slices/categoriesSlice';
import { logUserActivity, logCategoryInteraction } from '../src/api/s3_upload'; // Import the logCategoryInteraction function
import { useAppState } from "../src/AppStateHandler";
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { logThemeUsage } from "../src/api/theme";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeById, DEFAULT_THEME_ORDER } from "../../assets/themeConfig";
import { useNotifications } from "../src/hooks/useNotifications";
import { useInitialData } from "../src/hooks/useInitialData";
import { CategoryGrid } from "../../assets/components/CategoryGrid";
import { NearbyMap } from "../../assets/components/NearbyMap";
import { PremiumEntry } from "../../assets/components/PremiumEntry";
import OnboardingStartModal from "../../assets/components/Onboardingstartmodal";

const HomeSkeleton = React.memo(() => (
    <View style={styles.container}>
        <SafeAreaView style={styles.homepage}>
            <View style={styles.contentContainer}>
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    {/* Header Skeleton */}
                    <View style={styles.header}>
                        <View style={[styles.skeletonBase, styles.avatarSkeleton]} />
                        <View style={[styles.textContainer, { marginLeft: 4 }]}>
                            <View style={[styles.skeletonBase, styles.greetingSkeleton]} />
                        </View>
                        <View style={[styles.skeletonBase, styles.notificationSkeleton]} />
                    </View>

                    {/* Search Bar Skeleton */}
                    <View style={[styles.searchBar, styles.skeletonBase]} />

                    {/* AI Plan Skeleton */}
                    <View style={[styles.skeletonBase, styles.aiPlanSkeleton]} />

                    {/* Instant TripList Header Skeleton */}
                    <View style={styles.triplistContainer}>
                        <View style={[styles.skeletonBase, styles.titleSkeleton]} />
                        <View style={[styles.skeletonBase, styles.editButtonSkeleton]} />
                    </View>

                    {/* Icon Bar Skeleton */}
                    <View style={styles.iconBar}>
                        {[1, 2, 3, 4].map((_, index) => (
                            <View key={index} style={styles.iconItem}>
                                <View style={[styles.skeletonBase, styles.iconCircleSkeleton]} />
                                <View style={[styles.skeletonBase, styles.iconTextSkeleton]} />
                            </View>
                        ))}
                    </View>

                    {/* Map Skeleton */}
                    <View style={[styles.skeletonBase, styles.mapSkeleton]} />

                    {/* Categories Header Skeleton */}
                    <View style={styles.categoriesContainer}>
                        <View style={[styles.skeletonBase, styles.categoryTitleSkeleton]} />

                        {/* Categories Grid Skeleton */}
                        <View style={styles.categories}>
                            {[1, 2, 3, 4, 5, 6].map((_, index) => (
                                <View key={index} style={[styles.skeletonBase, styles.categorySkeleton]} />
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    </View>
));

const Homepage = () => {
    const dispatch = useDispatch();
    const router = useRouter();
    const setLastUsedFeature = useAppState();
    const params = useLocalSearchParams() || {};

    const { isReady, error, user, location, categories } = useInitialData();
    console.log("categories", categories);
    const { hasUnread, updateNotifications } = useNotifications();

    const [permissionModalVisible, setPermissionModalVisible] = useState(false);
    const [themeOrder, setThemeOrder] = useState(DEFAULT_THEME_ORDER);
    const [refreshing, setRefreshing] = useState(false);
    const [imageTimestamp, setImageTimestamp] = useState(Date.now());

    const [showOnboarding, setShowOnboarding] = useState(false);
    const safeUserName = user?.name || 'Guest';
    const safeUserImage = user?.imageUrl || null;

    const city = useSelector((state) => state.location.city, shallowEqual);

    useEffect(() => {
        setLastUsedFeature('Homepage');
    }, [setLastUsedFeature]);

    useEffect(() => {
        if (params.justRegistered === 'true') {
            setShowOnboarding(true);
        }
    }, [params.justRegistered]);

    useFocusEffect(
        useCallback(() => {
            const loadThemeOrder = async () => {
                try {
                    const savedOrder = await AsyncStorage.getItem('userThemeOrder');
                    setThemeOrder(savedOrder ? JSON.parse(savedOrder) : DEFAULT_THEME_ORDER);
                } catch (error) {
                    console.error('Error loading theme order:', error);
                    setThemeOrder(DEFAULT_THEME_ORDER);
                }
            };
            loadThemeOrder();
        }, [])
    );

    useEffect(() => {
        if (user?.userId && location?.coords) {
            logUserActivity(user.userId, location.coords);
        }
    }, [user?.userId, location?.coords]);


    const handleStartOnboarding = () => {
        setShowOnboarding(false);
        router.push('/onboard_gender');
    };

    const navigateToCategory = useCallback(async (categoryId, categoryName) => {
        // if (categoryId && user?.userId) {
        //     logCategoryInteraction(user.userId, categoryId);
        //     try {
        //         await categoryView(categoryId);
        //     } catch (error) {
        //         console.error('Error fetching category view:', error);
        //     }
        // }
        router.push({
            pathname: '/categories',
            params: { id: categoryId, name: categoryName }
        });
    }, [user, router]);

    const navigateToInstantTripList = useCallback((instantId) => {
        if (!location?.coords) {
            Alert.alert('Location not available');
            return;
        }

        logThemeUsage(instantId);

        router.push({
            pathname: '/instant_list',
            params: {
                instantId,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                isLoading: true,
                isEditMode: 'true',
            },
        });
    }, [location?.coords, router]);

    const navigateToChat = useCallback(() => {
        router.push({
            pathname: '/chat',
            params: { userId: user.userId }
        });
    }, [router, user]);

    const initialRegion = useMemo(() => ({
        latitude: location?.coords?.latitude || 22.2838,
        longitude: location?.coords?.longitude || 114.1374,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.042,
    }), [location?.coords?.latitude, location?.coords?.longitude]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            // 모든 데이터 강제 리로드
            await Promise.all([
                dispatch(fetchUser()),
                dispatch(fetchLocation()),
                dispatch(loadCategories()),
                updateNotifications(),
            ]);
            setImageTimestamp(Date.now());
        } catch (error) {
            console.error('Error refreshing data:', error);
            Alert.alert('Refresh Failed', 'There was an error refreshing the data. Please try again.');
        } finally {
            setRefreshing(false);
        }
    }, [dispatch, updateNotifications]);

    if (!isReady) {
        return <HomeSkeleton />;
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Failed to load data</Text>
                <TouchableOpacity onPress={() => dispatch(fetchUser())}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.homepage}>
                <View style={styles.contentContainer}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContainer}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={['#81D8D0']}
                                tintColor="#81D8D0"
                                progressBackgroundColor="#111"
                                title="Refreshing..."
                                titleColor="#81D8D0"
                            />
                        }
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => router.push('/profile')}>
                                {user?.imageUrl ? (
                                    <Image
                                        style={styles.homepageItem}
                                        source={{ uri: `${user.imageUrl}?t=${imageTimestamp}` }}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                    />
                                ) : (
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="person" size={32} color="#888" />
                                    </View>
                                )}
                            </TouchableOpacity>
                            <View style={styles.textContainer}>
                                <Text style={styles.greeting}>Hi, {user?.name || 'Guest'}!</Text>
                                {/* <View style={styles.location}>
                                    <Ionicons name="location-sharp" size={22} color="#fff" />
                                    <Text style={styles.locationText}>{city || 'Loading...'}</Text>
                                </View> */}
                            </View>
                            <TouchableOpacity
                                onPress={() => router.push('/notification')}
                            >
                                <Ionicons name="notifications-outline" size={24} color="#fff" />
                                {hasUnread && <View style={styles.notificationBadge} />}
                            </TouchableOpacity>
                        </View>

                        {/* Search */}
                        <TouchableOpacity
                            style={styles.searchBar}
                            onPress={() => router.push('/all_search')}
                        >
                            <Ionicons name="search" size={20} color="#000" />
                            <Text style={styles.searchPlaceholder}>Where are you going?</Text>
                        </TouchableOpacity>

                        {/* AI Plan Section */}
                        <View
                            style={styles.aiPlanContainer}
                        >
                            <Image
                                source={require('./../../assets/ai-plan-bg.jpg')}
                                style={styles.aiPlanBackground}
                                contentFit="cover"
                            />
                            <View style={styles.aiPlanOverlay}>
                                <TouchableOpacity
                                    onPress={() => router.push('/modeselect')}
                                    activeOpacity={0.9}
                                    style={styles.aiPlanContent}
                                >
                                    <Text style={styles.aiPlanTitle}>Plan your next adventure</Text>
                                    <LinearGradient
                                        colors={['#81D8D0', '#5468FF']}
                                        start={{ x: 1, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.aiPlanButton}
                                    >
                                        <Text style={styles.aiPlanButtonText}>Try TrippyAI Plan Now</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Instant TripList */}
                        {location && (
                            <>
                                <View style={styles.triplistContainer}>
                                    <Text style={styles.nearbyText}>TrippySpot for You</Text>
                                    <TouchableOpacity onPress={() => router.push('/themescreen')}>
                                        <Text style={styles.editText}>Edit</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.iconBar}>
                                    {themeOrder.slice(0, 4).map((themeId) => {
                                        const theme = getThemeById(themeId);
                                        return (
                                            <TouchableOpacity
                                                key={themeId}
                                                style={styles.iconItem}
                                                onPress={() => navigateToInstantTripList(themeId)}
                                            >
                                                <Ionicons name={theme.icon} size={24} color="white" />
                                                <Text style={styles.iconText}>{theme.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        {/* Premium: Hotels / Flights + Upcoming Trip */}
                        <PremiumEntry />

                        {/* Map */}
                        {location && (
                            <NearbyMap
                                city={city}
                                initialRegion={initialRegion}
                                onExpandPress={() => router.push('/full_map')}
                            />
                        )}

                        {/* Categories - FlatList로 최적화 */}
                        {categories?.length > 0 && (
                            <View style={styles.categoriesContainer}>
                                <Text style={styles.browseCategories}>Browse Categories</Text>
                                <CategoryGrid
                                    categories={categories}

                                    onCategoryPress={navigateToCategory}
                                />
                            </View>
                        )}
                    </ScrollView>
                    <NavBar />
                </View>
            </SafeAreaView>

            {/* Modals */}
            <ConfirmationModal
                visible={permissionModalVisible}
                title="Location Permission Required"
                message="Please enable location access in Settings to use this feature."
                onConfirm={() => setPermissionModalVisible(false)}
                confirmText="OK"
            />


            <OnboardingStartModal
                visible={showOnboarding}
                userName={safeUserName}
                userImage={safeUserImage}
                onStart={handleStartOnboarding}
            />
        </View>
    );
};

export default Homepage;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    homepage: {
        flex: 1,
        width: '100%',
        backgroundColor: '#000',
        overflow: 'hidden',
    },
    contentContainer: {
        flex: 1,
    },
    scrollContainer: {
        paddingBottom: 50,
        paddingHorizontal: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    textContainer: {
        flex: 1,
        marginLeft: 4,
    },
    notificationBadge: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'red',
        position: 'absolute',
        top: -2,
        right: 3,
    },
    homepageItem: {
        width: 64,
        height: 64,
        borderRadius: 32,
        overflow: "hidden",
        marginRight: 12,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#ccc",
        justifyContent: 'center',
        alignItems: 'center',
        overflow: "hidden",
        marginRight: 12,
    },
    greeting: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    location: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    locationText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600'
    },
    searchContainer: {
        marginHorizontal: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 14,
        height: 42,
        overflow: "hidden",
        width: '100%',
    },
    searchPlaceholder: {
        paddingLeft: 10,
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        textAlign: "left",
        color: "#ABB7C2"
    },
    aiPlanContainer: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 20,
        marginBottom: 8,
    },
    aiPlanBackground: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    aiPlanOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    aiPlanContent: {
        alignItems: 'flex-start',
    },
    aiPlanTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 6,
        textAlign: 'left',
    },
    aiPlanButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 25,
    },
    aiPlanButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    triplistContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        marginHorizontal: 4,
        width: '98%',
        height: 32,
    },
    iconBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 16,
        marginBottom: 68,
        paddingHorizontal: 8,
    },
    iconItem: {
        alignItems: 'center',
    },
    iconText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
        marginTop: 12,
    },
    nearbyText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#fff",
        textAlign: "left"
    },
    editText: {
        fontSize: 12,
        color: '#81D8D0',
        fontWeight: '600',
    },
    categoriesContainer: {
        marginTop: 45,
    },
    browseCategories: {
        fontSize: 20,
        fontWeight: "700",
        color: "#fff",
    },
    categories: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
        columnGap: 12,
    },
    // Skeleton Styles
    skeletonBase: {
        backgroundColor: '#2a2a2a',
        borderRadius: 8,
        overflow: 'hidden'
    },
    avatarSkeleton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginRight: 12,
    },
    notificationSkeleton: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    greetingSkeleton: {
        width: 120,
        height: 20,
        marginBottom: 4,
    },
    editButtonSkeleton: {
        width: 40,
        height: 16,
        borderRadius: 4,
    },
    titleSkeleton: {
        width: 160,
        height: 20,
    },
    aiPlanSkeleton: {
        width: '100%',
        height: 180,
        marginTop: 20,
        marginBottom: 8,
        borderRadius: 12,
    },
    aiPlanSkeleton: {
        width: '100%',
        height: 180,
        marginTop: 20,
        marginBottom: 8,
        borderRadius: 12,
    },
    iconCircleSkeleton: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    iconTextSkeleton: {
        width: 60,
        height: 14,
        marginTop: 12,
        borderRadius: 4,
    },
    mapSkeleton: {
        width: '100%',
        height: 200,
        borderRadius: 10,
        marginBottom: 45,
    },
    categoryTitleSkeleton: {
        width: 180,
        height: 24,
        marginBottom: 16,
    },
    categorySkeleton: {
        width: '48%',
        height: 148,
        borderRadius: 10,
    },
});
