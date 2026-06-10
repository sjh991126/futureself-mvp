import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    FlatList,
    Modal,
    TouchableWithoutFeedback,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import NavBar from '../../assets/components/navbar';
// 이 부분 수정!
import { getCategoryContent, isCategoryDataCached } from '../src/api/category_triplists';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from "../src/AppStateHandler";
import MaskedView from '@react-native-masked-view/masked-view';

const Categories = () => {
    const { id, name } = useLocalSearchParams();
    const [activeTab, setActiveTab] = useState('Places');
    const [tripLists, setTripLists] = useState([]);
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [sortOption, setSortOption] = useState('Most Viewed');
    const router = useRouter();
    const setLastUsedFeature = useAppState();
    const [dataFetched, setDataFetched] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        setLastUsedFeature('Categories');

        const fetchInitialData = async () => {
            try {
                setInitialLoading(true);

                // Fetch combined data
                const content = await getCategoryContent(id);

                setPlaces(sortData(content.places, sortOption, 'Places'));
                setTripLists(sortData(content.tripLists, sortOption, 'TripLists'));
                setDataFetched(true);
                setLoading(false);
                setInitialLoading(false);
            } catch (error) {
                console.error('Error fetching initial data:', error);
                setInitialLoading(false);
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [id, sortOption]);

    const toggleTab = (tab) => {
        if (activeTab !== tab) {
            setActiveTab(tab);
        }
    };

    const sortData = (data, sortOption, tab) => {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return [];
        }

        if (sortOption === 'Most Viewed') {
            return [...data].sort((a, b) => (b.view_counts || 0) - (a.view_counts || 0));
        } else if (sortOption === 'Ratings') {
            return [...data].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (sortOption === 'Alphabetical') {
            return [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else if (sortOption === 'Newest') {
            return [...data].sort((a, b) => {
                const dateA = new Date(a.created_at || 0);
                const dateB = new Date(b.created_at || 0);
                return dateB - dateA;
            });
        }
        return data;
    };

    const handleSortOption = (option) => {
        setSortOption(option);
        setModalVisible(false);
    };

    // Skeleton loaders
    const PlaceSkeleton = () => (
        <View style={styles.placeItem}>
            <View style={[styles.skeletonBase, styles.placeImageSkeleton]} />
            <View style={styles.placeTextContainer}>
                <View style={[styles.skeletonBase, styles.placeTitleSkeleton]} />
                <View style={[styles.skeletonBase, styles.placeLocationSkeleton]} />
            </View>
        </View>
    );

    const TripListSkeleton = () => (
        <View style={styles.listItem}>
            <View style={[styles.skeletonBase, styles.listImageSkeleton]} />
            <View style={styles.listTextContainer}>
                <View style={[styles.skeletonBase, styles.listTitleSkeleton]} />
                <View style={[styles.skeletonBase, styles.numItemsSkeleton]} />
            </View>
        </View>
    );

    // Render functions for actual data
    const renderPlace = ({ item }) => (
        <TouchableOpacity
            style={styles.placeItem}
            onPress={() => {
                router.push({
                    pathname: '/place_details',
                    params: {
                        placeId: item.id
                    }
                });
            }}
        >

            {item.imageUrls && item.imageUrls.length > 0 ? (
                <ExpoImage
                    style={styles.placeImage}
                    source={{ uri: item.imageUrls[0] }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                />
            ) : (
                <View style={[styles.placeImage, { backgroundColor: '#333' }]} />
            )}
            <View style={styles.placeTextContainer}>
                <Text style={styles.placeTitle} numberOfLines={2} ellipsizeMode="tail">
                    {item.name}
                </Text>
                <View style={styles.locationRatingContainer}>
                    <Text style={styles.placeLocation} numberOfLines={1} ellipsizeMode="tail">
                        {item.shortFormattedAddress ? item.shortFormattedAddress.split(',').pop() : ''}
                    </Text>
                    {item.rating && <Text style={styles.placeRating}>{` · ${item.rating} ★`}</Text>}
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderTripList = ({ item }) => (
        <TouchableOpacity
            style={styles.listItem}
            onPress={() => {
                router.push({
                    pathname: '/list_details',
                    params: {
                        tripListId: item.tripListId,
                        from: 'categories',
                        id: id,
                        name: name
                    }
                });
            }}
        >
            {item.imageUrl ? (
                <ExpoImage
                    style={styles.listImage}
                    source={{ uri: item.imageUrl }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                />
            ) : (
                <View style={[styles.listImage, { backgroundColor: '#333' }]} />
            )}
            <View style={styles.listTextContainer}>
                <Text style={styles.listTitle}>{item.name}</Text>
                <Text style={styles.numItems}>
                    {item.totalPlaceCount || 0} place{item.totalPlaceCount !== 1 ? 's' : ''}
                </Text>
            </View>
        </TouchableOpacity>
    );

    // Render two separate FlatLists instead of changing numColumns
    const renderPlacesList = () => (
        <FlatList
            key="places-list"
            data={initialLoading ? Array(6).fill(0) : places}
            renderItem={initialLoading ? PlaceSkeleton : renderPlace}
            keyExtractor={(item, index) => initialLoading ? `skeleton-place-${index}` : `place-${item.id}`}
            numColumns={1}
            contentContainerStyle={styles.flatListContainer}
            initialNumToRender={6}
            maxToRenderPerBatch={5}
            windowSize={7}
            removeClippedSubviews={true}
            ListEmptyComponent={() => !initialLoading && (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No places found</Text>
                </View>
            )}
            onEndReachedThreshold={0.5}
        />
    );

    const renderTripListsList = () => (
        <FlatList
            key="triplists-list"
            data={initialLoading ? Array(6).fill(0) : tripLists}
            renderItem={initialLoading ? TripListSkeleton : renderTripList}
            keyExtractor={(item, index) => initialLoading ? `skeleton-triplist-${index}` : `triplist-${item.tripListId}`}
            numColumns={2}
            contentContainerStyle={styles.flatListContainer}
            initialNumToRender={6}
            maxToRenderPerBatch={5}
            windowSize={7}
            removeClippedSubviews={true}
            ListEmptyComponent={() => !initialLoading && (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No trip lists found</Text>
                </View>
            )}
            onEndReachedThreshold={0.5}
        />
    );

    // Refresh functionality
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const content = await getCategoryContent(id);

            setPlaces(sortData(content.places, sortOption, 'Places'));
            setTripLists(sortData(content.tripLists, sortOption, 'TripLists'));
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.libraryPage}>
                <View style={styles.contentContainer}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.push('/homepage')} style={styles.backIconContainer}>
                            <Ionicons name="chevron-back" size={28} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.title}>{name}</Text>
                        <TouchableOpacity
                            style={styles.filterIconContainer}
                            onPress={() => setModalVisible(true)}
                        >
                            <Ionicons name="filter" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity onPress={() => toggleTab('Places')}>
                            <LinearGradient
                                style={styles.tab}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                colors={activeTab === 'Places' ? ['#5468ff', '#81d8d0'] : ['#333', '#333']}
                                locations={[0, 1]}
                                useAngle={true}
                                angle={45}
                                angleCenter={{ x: 0.5, y: 0.5 }}
                            >
                                <Text style={styles.tabText}>Places</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.TripLists} onPress={() => toggleTab('TripLists')}>
                            <LinearGradient
                                style={styles.tab}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                colors={activeTab === 'TripLists' ? ['#5468ff', '#81d8d0'] : ['#333', '#333']}
                                locations={[0, 1]}
                                useAngle={true}
                                angle={45}
                                angleCenter={{ x: 0.5, y: 0.5 }}
                            >
                                <Text style={styles.tabText}>TripLists</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Render the appropriate list based on active tab */}
                    {activeTab === 'Places' ? renderPlacesList() : renderTripListsList()}

                    <NavBar style={styles.navBar} />
                </View>
            </SafeAreaView>
            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.modalOverlay} />
                </TouchableWithoutFeedback>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Filter By</Text>

                    {['Most Viewed', 'Ratings', 'Alphabetical', 'Newest'].map((option) => (
                        <TouchableOpacity
                            key={option}
                            style={styles.modalOption}
                            onPress={() => handleSortOption(option)}
                        >
                            {sortOption === option ? (
                                <MaskedView
                                    style={{ height: 24 }}
                                    maskElement={
                                        <Text style={styles.modalOptionText}>
                                            {option}
                                        </Text>
                                    }
                                >
                                    <LinearGradient
                                        colors={['#5468ff', '#81d8d0']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{ flex: 1 }}
                                    >
                                        <Text style={[styles.modalOptionText, { opacity: 0 }]}>
                                            {option}
                                        </Text>
                                    </LinearGradient>
                                </MaskedView>
                            ) : (
                                <Text style={styles.modalOptionText}>{option}</Text>
                            )}
                            {sortOption === option && (
                                <MaskedView
                                    style={{ height: 24, width: 24 }}
                                    maskElement={
                                        <View style={{ backgroundColor: 'transparent' }}>
                                            <Ionicons name="checkmark" size={20} color="white" />
                                        </View>
                                    }
                                >
                                    <LinearGradient
                                        colors={['#5468ff', '#81d8d0']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{ flex: 1 }}
                                    />
                                </MaskedView>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </Modal>
        </View>
    );
};

export default Categories;

// styles는 그대로

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        paddingHorizontal: 10,
        paddingVertical: 10,
        position: 'relative',
    },
    backIconContainer: {
        position: 'absolute',
        left: 10,
    },
    filterIconContainer: {
        position: 'absolute',
        right: 10,
    },
    profile: {
        width: 42,
        height: 42,
    },
    libraryPage: {
        flex: 1,
        width: '100%',
        backgroundColor: '#000',
        borderRadius: 30,
        overflow: 'hidden',
    },
    contentContainer: {
        flex: 1,
    },
    scrollContainer: {
        paddingBottom: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        fontFamily: "Monsterrat-Bold",
        textAlign: "center",
    },
    searchContainer: {
        marginTop: 20,
        marginHorizontal: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 3,
        height: 42,
        overflow: "hidden"
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        textAlign: "left",
        color: "#abb72c"
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
    },
    TripLists: {
        marginLeft: 13
    },
    tab: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    tabText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    flatListContainer: {
        paddingHorizontal: 10,
        paddingBottom: 10,
    },
    listItem: {
        flex: 1,
        flexDirection: 'column',
        marginHorizontal: 10,
        marginVertical: 5,
        backgroundColor: '#000',
        borderRadius: 14,
        overflow: 'hidden',
    },
    listImage: {
        width: '100%',
        height: 150,
        borderRadius: 14,
    },
    listTextContainer: {
        padding: 10,
    },
    listTitle: {
        color: '#fff',
        fontSize: 14,
        textAlign: "left",
        fontWeight: '600',
    },
    numItems: {
        fontSize: 12,
        fontFamily: "Monsterrat-Regular",
        color: "#fff",
        textAlign: "left"
    },
    placeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 5,
        paddingHorizontal: 0,
        paddingBottom: 8,
        backgroundColor: '#000',
        borderRadius: 14,
        marginHorizontal: 10,
    },
    placeImage: {
        width: 76,
        height: 76,
        marginLeft: 0,
    },
    placeTextContainer: {
        flex: 1,
        marginLeft: 15,
        marginRight: 10,
        justifyContent: 'center',
    },
    placeTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 20,
        flexShrink: 1,
        marginBottom: 4,
        marginLeft: 2,
        textAlign: 'left',
        alignSelf: 'flex-start',
    },
    locationRatingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'nowrap',
        alignSelf: 'flex-start',
        marginRight: 3,
        width: '100%',
    },
    placeLocation: {
        color: '#fff',
        fontSize: 12,
        fontFamily: "Monsterrat-Regular",
        fontWeight: "500",
        flexShrink: 1,
        textAlign: 'left',
    },
    placeRating: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 180,
    },
    navBar: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: '#000',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 20,
        textAlign: 'left',
        color: '#fff',
        alignSelf: 'flex-start',
    },
    modalOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderWidth: 0,
        borderBottomWidth: 0,
    },
    modalOptionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#fff',
    },
    selectedOptionText: {
        color: '#5468ff',
        fontWeight: '600',
    },
    skeletonBase: {
        backgroundColor: '#2a2a2a',
        borderRadius: 4,
        overflow: 'hidden'
    },
    placeImageSkeleton: {
        width: 76,
        height: 76,
        borderRadius: 8
    },
    placeTitleSkeleton: {
        width: '80%',
        height: 16,
        marginBottom: 8,
        borderRadius: 4
    },
    placeLocationSkeleton: {
        width: '60%',
        height: 12,
        borderRadius: 4
    },
    listImageSkeleton: {
        width: '100%',
        height: 150,
        borderRadius: 14
    },
    listTitleSkeleton: {
        width: '70%',
        height: 14,
        marginBottom: 6,
        borderRadius: 4
    },
    numItemsSkeleton: {
        width: '40%',
        height: 12,
        borderRadius: 4
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
});
