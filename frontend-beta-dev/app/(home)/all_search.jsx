import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, TextInput, Animated, Keyboard, FlatList, Easing } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NavBar from '../../assets/components/navbar';
import { load100Places } from '../src/api/places';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLocation } from '../slices/locationSlice';
import { useAppState } from "../src/AppStateHandler";
import { searchAll } from '../src/api/elastic_search';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logPlaceSearch } from '../src/api/s3_upload';
import { placeView } from '../src/api/ViewCounts';
import { searchUsers } from "../src/api/user";
import { getPlaceDetail } from "../src/api/places";

const AllSearch = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const [recommendedPlaces, setRecommendedPlaces] = useState([]);
    const userLocation = useSelector((state) => state.location.data);
    const user = useSelector((state) => state.user.data); // Get user data from Redux store
    const setLastUsedFeature = useAppState();
    const [isSearchActive, setIsSearchActive] = useState(false);
    const searchBarWidth = useState(new Animated.Value(1))[0]; // Animation for search bar width
    const searchInputRef = useRef(null); // Ref for the TextInput
    const [flattenedResults, setFlattenedResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
    const [searchResults, setSearchResults] = useState({ places: [], tripLists: [], users: [] });
    const [recentSearches, setRecentSearches] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const MIN_SEARCH_LENGTH = 2;

    useEffect(() => {
        dispatch(fetchLocation());
    }, [dispatch]);

    useEffect(() => {
        const fetchRecommendedPlaces = async () => {
            setIsInitialLoading(true);
            try {
                const places = await load100Places();
                console.log("places", places);
                if (userLocation) {
                    const nearbyPlaces = places
                        .map(place => ({
                            ...place,
                            distance: getDistance(userLocation.coords.latitude, userLocation.coords.longitude, place.latitude, place.longitude)
                        }))
                        .sort((a, b) => a.distance - b.distance)
                        .slice(0, 5);
                    setRecommendedPlaces(nearbyPlaces);
                } else {
                    const randomPlaces = places.sort(() => 0.5 - Math.random()).slice(0, 5);
                    setRecommendedPlaces(randomPlaces);
                }
            } catch (error) {
                console.error('Error fetching recommended places:', error);
            } finally {
                setIsInitialLoading(false);
            }
        };

        fetchRecommendedPlaces();
    }, [userLocation]);

    useEffect(() => {
        setLastUsedFeature('AllSearchPage');
    }, [setLastUsedFeature]);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setHasSearched(false);
            setSearchResults({ places: [], tripLists: [], users: [] });
        }
    }, [searchQuery]);

    // Load recent searches on mount
    useEffect(() => {
        const loadRecentSearches = async () => {
            const storedSearches = await AsyncStorage.getItem('recentSearches');
            if (storedSearches) {
                setRecentSearches(JSON.parse(storedSearches));
            }
        };
        loadRecentSearches();
    }, []);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFlattenedResults([]);
            return;
        }

        const flattened = [];

        if (searchResults.places.length > 0) {
            flattened.push({ type: 'header', title: 'Places' });
            searchResults.places.forEach(place => {
                flattened.push({ type: 'place', data: place });
            });
        }

        if (searchResults.tripLists.length > 0) {
            flattened.push({ type: 'header', title: 'Trip Lists' });
            searchResults.tripLists.forEach(tripList => {
                flattened.push({ type: 'tripList', data: tripList });
            });
        }

        if (searchResults.users.length > 0) {
            flattened.push({ type: 'header', title: 'Users' });
            searchResults.users.forEach(user => {
                flattened.push({ type: 'user', data: user });
            });
        }

        setFlattenedResults(flattened);
    }, [searchResults, searchQuery]);


    // Handle search
    const handleSearch = async () => {
        const trimmedQuery = searchQuery.trim();

        // 최소 글자 수 체크
        if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
            setSearchResults({ places: [], tripLists: [], users: [] });
            setError(`Please enter at least ${MIN_SEARCH_LENGTH} characters`);
            return;
        }

        setHasSearched(true);
        setIsLoading(true);
        setError(null);

        console.log(`Searching for: "${trimmedQuery}"`);

        try {
            const encodedQuery = encodeURIComponent(trimmedQuery);
            const [allResults, userResults] = await Promise.all([
                searchAll(encodedQuery),
                searchUsers(trimmedQuery)
            ]);

            setSearchResults({
                ...allResults,
                users: userResults
            });

        } catch (error) {
            setError('Unable to search. Please try again.');
            setSearchResults({ places: [], tripLists: [], users: [] });
        } finally {
            setIsLoading(false);
        }
    };


    const renderSearchItem = ({ item }) => {
        if (item.type === 'header') {
            return (
                <>
                    <Text style={styles.sectionHeader}>{item.title}</Text>
                    <View style={styles.sectionDivider} />
                </>
            );
        }
        if (item.type === 'place') {
            return renderPlaceItem({ item: item.data });
        }
        if (item.type === 'tripList') {
            return renderTripListItem({ item: item.data });
        }
        if (item.type === 'user') {
            return renderUserItem({ item: item.data });
        }
        return null;
    };

    const handleSearchBarPress = () => {
        console.log('Search bar pressed');
        setIsSearchActive(true);

        Animated.timing(searchBarWidth, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
        }).start();

        setTimeout(() => {
            if (searchInputRef.current) {
                searchInputRef.current.focus();
            } else {
                console.error('searchInputRef is null');
            }
        }, 100); // 100ms 지연
    };

    const handleCancelPress = () => {
        setIsSearchActive(false);
        setSearchQuery('');
        setHasSearched(false);
        setSearchResults({ places: [], tripLists: [], users: [] });
        setError(null);
        Keyboard.dismiss();
        Animated.timing(searchBarWidth, {
            toValue: 1,
            duration: 900,
            useNativeDriver: false,
        }).start();
    };

    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            0.5 - Math.cos(dLat) / 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            (1 - Math.cos(dLon)) / 2;
        return R * 2 * Math.asin(Math.sqrt(a));
    };

    const capitalizeFirstLetter = (string) => {
        return string.charAt(0).toUpperCase() + string.slice(1);
    };

    const handleSelectPlace = async (place) => {
        if (user) {
            logPlaceSearch(user.userId, place.id, place.name, searchQuery, 'place'); // Log place search
        }

        router.push({
            pathname: '/full_map',
            params: {
                placeId: place.id,
                from: 'all_search'
            }
        });

        try {
            await placeView(place.id);

            const updatedSearches = [
                { id: place.id, name: place.name, imageUrls: place.imageUrls || [] },
                ...recentSearches.filter(p => p.id !== place.id)
            ].slice(0, 5);

            setRecentSearches(updatedSearches);
            await AsyncStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
        } catch (error) {
            console.error('Background processing error:', error);
        }
    };

    const handleSelectTripList = (tripList) => {
        if (user) {
            logPlaceSearch(user.userId, tripList.id, tripList.name, searchQuery, 'tripList'); // Log trip list search
        }

        router.push({
            pathname: '/list_details',
            params: {
                tripListId: tripList.tripListId,
                listName: tripList.name,
                listImage: tripList.imageUrl,
                tripDetails: JSON.stringify(tripList)
            }
        });
    };

    const navigateToMapPage = async (place) => {
        router.push({
            pathname: '/full_map',
            params: {
                placeId: place.id,
                from: 'all_search'
            }
        });
    };

    const handleSelectUser = (user) => {
        if (user) {
            logPlaceSearch(user.userId, user.userId, user.userName, searchQuery, 'user');
        }

        router.push({
            pathname: '/publicprofile',
            params: { userId: user.id }
        })
    };

    const renderUserItem = ({ item }) => {
        return (
            <TouchableOpacity style={styles.itemContainer} onPress={() => handleSelectUser(item)}>
                {item?.imageUrl ? (
                    <ExpoImage
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        source={{ uri: item.imageUrl }}
                        style={styles.userImage}
                        onError={(e) => console.log('Failed to load image', e?.error)}
                    />
                ) : (
                    <View style={styles.iconContainer}>
                        <Ionicons name="person" size={32} color="#888" />
                    </View>
                )}

                <View style={styles.textContainer}>
                    <Text style={styles.name}>{item.userName}</Text>
                    <Text style={styles.details}>
                        {item.name || 'User profile'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderPlaceItem = ({ item }) => {
        const firstImageUrl = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : null;

        return (
            <View style={styles.itemContainer}>
                {firstImageUrl && (
                    <ExpoImage
                        source={{ uri: firstImageUrl }}
                        style={styles.image}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={150}
                    />
                )}
                <TouchableOpacity style={styles.textContainer} onPress={() => handleSelectPlace(item)}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.details}>
                        {item.shortFormattedAddress ||
                            capitalizeFirstLetter(item.types?.[0]?.replace(/_/g, ' ') || 'Unknown location')}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderTripListItem = ({ item }) => {
        return (
            <View style={styles.itemContainer}>
                <ExpoImage
                    source={{ uri: item.imageUrl }}
                    style={styles.tripListImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                />
                <TouchableOpacity style={styles.textContainer} onPress={() => handleSelectTripList(item)}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.details}>
                        Created by {item.user.userName}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Skeleton Loaders
    const SkeletonPlaceItem = () => (
        <View style={styles.itemContainer}>
            <View style={[styles.image, styles.skeleton]} />
            <View style={styles.textContainer}>
                <View style={[styles.skeletonText, { width: '70%', height: 16, marginBottom: 8 }]} />
                <View style={[styles.skeletonText, { width: '50%', height: 12 }]} />
            </View>
        </View>
    );

    const SkeletonRecommendedList = () => (
        <View style={styles.recommendedContainer}>
            <View style={[styles.skeletonText, { width: '60%', height: 20, marginBottom: 15 }]} />
            {[1, 2, 3, 4, 5].map((_, index) => (
                <View key={index} style={styles.tripListItem}>
                    <View style={[styles.image, styles.skeleton]} />
                    <View style={styles.tripListTextContainer}>
                        <View style={[styles.skeletonText, { width: '80%', height: 14, marginBottom: 6 }]} />
                        <View style={[styles.skeletonText, { width: '60%', height: 12 }]} />
                    </View>
                </View>
            ))}
        </View>
    );

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.searchPage}>
                <View style={styles.contentContainer}>
                    <ScrollView contentContainerStyle={styles.scrollContainer}>
                        <View style={styles.searchContainer}>
                            <TouchableOpacity
                                style={styles.searchBarTouchable}
                                onPress={handleSearchBarPress}
                                activeOpacity={1}
                                accessibilityLabel="Search Bar"
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Animated.View style={[styles.searchBar, { flex: searchBarWidth }]}>
                                    <Ionicons name="search" size={20} color="#000000" style={styles.searchIcon} />
                                    <TextInput
                                        ref={searchInputRef}
                                        style={styles.searchInput}
                                        placeholder="Search for places, trips, and more..."
                                        placeholderTextColor="#808080"
                                        editable={isSearchActive}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        onFocus={() => setIsSearchActive(true)}
                                        pointerEvents={isSearchActive ? "auto" : "none"}
                                        returnKeyType="search"
                                        onSubmitEditing={handleSearch} // 👈 Enter 키로 검색
                                    />
                                </Animated.View>
                            </TouchableOpacity>
                            {isSearchActive && (
                                <TouchableOpacity onPress={handleCancelPress} style={styles.cancelButton}>
                                    <Text style={styles.cancelButtonText}>CANCEL</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {isSearchActive ? (
                            <>
                                {isLoading && (
                                    <View style={styles.loadingContainer}>
                                        {[1, 2, 3, 4, 5].map((_, index) => (
                                            <SkeletonPlaceItem key={index} />
                                        ))}
                                    </View>
                                )}

                                {error && (
                                    <View style={styles.errorContainer}>
                                        <Ionicons name="alert-circle-outline" size={60} color="#666" />
                                        <Text style={styles.errorText}>{error}</Text>
                                    </View>
                                )}

                                {/* Recent Searches - 검색어가 비어있을 때만 표시 */}
                                {!isLoading &&
                                    !error &&
                                    !hasSearched && (
                                        <View style={styles.recentSearchesContainer}>
                                            <Text style={styles.recentSearchesHeader}>Recent Searches</Text>
                                            {recentSearches.length === 0 ? (
                                                <Text style={styles.noRecentSearches}>No recent searches yet</Text>
                                            ) : (
                                                <FlatList
                                                    data={recentSearches}
                                                    renderItem={renderPlaceItem}
                                                    keyExtractor={item => item.id}
                                                    contentContainerStyle={styles.listContent}
                                                    scrollEnabled={false}
                                                />
                                            )}
                                        </View>
                                    )}

                                {/* Search Results - 검색 결과가 있을 때 표시 */}
                                {!isLoading &&
                                    !error &&
                                    hasSearched &&
                                    flattenedResults.length > 0 && (
                                        <FlatList
                                            data={flattenedResults}
                                            renderItem={renderSearchItem}
                                            keyExtractor={(item, index) =>
                                                item.type === 'header'
                                                    ? `header-${item.title}`
                                                    : `${item.type}-${item.data.id || item.data.userId}-${index}`
                                            }
                                            contentContainerStyle={styles.listContent}
                                            scrollEnabled={false}
                                        />
                                    )}

                                {/* No Results - 검색어는 있지만 결과가 없을 때 */}
                                {!isLoading &&
                                    !error &&
                                    hasSearched &&
                                    flattenedResults.length === 0 && (
                                        <View style={styles.errorContainer}>
                                            <Ionicons name="search-outline" size={60} color="#666" />
                                            <Text style={styles.errorText}>No results found</Text>
                                            <Text style={[styles.details, { marginTop: 10 }]}>
                                                Try different keywords
                                            </Text>
                                        </View>
                                    )}
                            </>
                        ) : (
                            // Recommended Places
                            <>
                                {isInitialLoading ? (
                                    <SkeletonRecommendedList />
                                ) : (
                                    <View style={styles.recommendedContainer}>
                                        <Text style={styles.recommendedTitle}>Recommended Places Nearby</Text>
                                        {recommendedPlaces.map((place, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={styles.tripListItem}
                                                onPress={() => navigateToMapPage(place)}
                                            >
                                                <ExpoImage
                                                    style={styles.image}
                                                    source={{ uri: place.imageUrls[0] }}
                                                    contentFit="cover"
                                                    cachePolicy="memory-disk"
                                                    transition={150}
                                                />
                                                <View style={styles.tripListTextContainer}>
                                                    <Text style={styles.tripListTitle}>{place.name}</Text>
                                                    <Text style={styles.tripListItems}>
                                                        {capitalizeFirstLetter(place.types?.[0]?.replace(/_/g, ' ') || 'Place')}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </>
                        )}
                    </ScrollView>
                    <NavBar style={styles.navBar} />
                </View>
            </SafeAreaView>
        </View>
    );
};

export default AllSearch;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    searchPage: {
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        marginHorizontal: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 14,
        height: 42,
        overflow: "hidden"
    },
    searchBarTouchable: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#000',
    },
    cancelButton: {
        marginLeft: 15, // Increased margin to push the button towards the end
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    recommendedContainer: {
        marginTop: 20,
        marginHorizontal: 8,
    },
    recommendedTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 15,
    },
    tripListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
        marginHorizontal: 0, // Remove horizontal margin
    },
    tripListImage: {
        width: 66,
        height: 66,
        borderRadius: 8,
    },
    tripListTextContainer: {
        marginLeft: 15, // Ensure text container aligns with image
        flex: 1,
        width: "100%"
    },
    tripListTitle: {
        color: '#fff',
        fontSize: 14,
        textAlign: "left",
        fontWeight: '600',
    },
    tripListItems: {
        fontSize: 12,
        color: "#fff",
        textAlign: "left"
    },
    navBar: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30
    },
    loadingText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30
    },
    errorText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    recentSearchesContainer: {
        padding: 10,
        marginTop: 7.5
    },
    recentSearchesHeader: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    noRecentSearches: {
        color: 'gray',
        fontSize: 14,
        marginBottom: 10,
    },
    listContent: {
        padding: 10,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    image: {
        width: 66,
        height: 66,
    },
    textContainer: {
        flex: 1,
        marginLeft: 15,
    },
    name: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    details: {
        color: 'white',
        fontSize: 12,
    },
    sectionHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginVertical: 10,
    },
    sectionDivider: {
        height: 1,
        backgroundColor: 'white',
        marginVertical: 10,
        marginHorizontal: 0,
    },
    userImage: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: '#333',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#ccc",
        justifyContent: 'center',
        alignItems: 'center',
        overflow: "hidden",
        // marginRight: 12,
    },
    skeleton: {
        backgroundColor: '#333',
        borderRadius: 8,
    },
    skeletonText: {
        backgroundColor: '#333',
        borderRadius: 4,
    },
});
