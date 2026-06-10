import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, TextInput } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { searchGooglePlaces } from '../src/api/google_places';
import LoadingSpinner from './../LoadingSpinner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { logPlaceSearch } from '../src/api/s3_upload'; // Import the logPlaceSearch function
import { useAppState } from "../src/AppStateHandler";
import { placeView } from '../src/api/ViewCounts'; // Import the placeView function

const SearchPage = () => {
    const router = useRouter();
    const user = useSelector((state) => state.user.data); // Get user data from Redux store
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [recentSearches, setRecentSearches] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
    const setLastUsedFeature = useAppState();

    useEffect(() => {
        setLastUsedFeature('PlaceSearch');
    }, [setLastUsedFeature]);

    useEffect(() => {
        // Load recent searches from local storage on component mount
        const loadRecentSearches = async () => {
            try {
                const storedSearches = await AsyncStorage.getItem('recentSearches');
                if (storedSearches) {
                    const parsedSearches = JSON.parse(storedSearches);
                    console.log('Raw recent searches:', parsedSearches);

                    // Filter to include only items that have the necessary place properties
                    const validPlaceSearches = parsedSearches.filter(item =>
                        item &&
                        item.id &&
                        item.name &&
                        item.latitude !== undefined &&
                        item.longitude !== undefined
                    );

                    console.log('Filtered place searches:', validPlaceSearches);
                    setRecentSearches(validPlaceSearches);
                }
            } catch (error) {
                console.error('Error loading recent searches:', error);
                // Reset recent searches on error
                setRecentSearches([]);
            }
        };
        loadRecentSearches();
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 1000); // 1 second delay

        return () => {
            clearTimeout(handler);
        };
    }, [searchQuery]);

    useEffect(() => {
        const handleSearch = async (query) => {
            if (query !== '') {
                setIsLoading(true);
                try {
                    const results = await searchGooglePlaces(query);
                    setSearchResults(results);
                } catch (error) {
                    console.error('Error searching places:', error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setSearchResults([]);
            }
        };

        handleSearch(debouncedQuery);
    }, [debouncedQuery]);

    const handleSelectPlace = async (place) => {
        if (user) {
            logPlaceSearch(user.userId, place.id, place.name, searchQuery); // Log place search
        }

        try {
            await placeView(place.id); // Call placeView with the place ID
        } catch (error) {
            console.error('Error posting view count:', error);
        }

        const updatedSearches = [place, ...recentSearches.filter(p => p.id !== place.id)].slice(0, 5); // Keep only the last 5 searches
        setRecentSearches(updatedSearches);
        await AsyncStorage.setItem('recentSearches', JSON.stringify(updatedSearches)); // Save to local storage

        router.push({
            pathname: '/full_map',
            params: {
                placeId: place.id,
                // selectedPlace: JSON.stringify(place),
                latitude: place.latitude.toString(),
                longitude: place.longitude.toString()
            }
        });
    };

    const renderItem = ({ item }) => {
        const firstImageUrl = item.imageUrls[0];

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
                        {item.shortFormattedAddress || item.types[0].replace('_', ' ')}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="chevron-back-outline" size={28} color="white" style={styles.backIcon} />
                </TouchableOpacity>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="black" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search"
                        placeholderTextColor="gray"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>
            {searchResults.length === 0 && (
                <View style={styles.recentSearchesContainer}>
                    <Text style={styles.recentSearchesHeader}>Recent Searches</Text>
                    {recentSearches.length === 0 ? (
                        <Text style={styles.noRecentSearches}>No recent searches yet</Text>
                    ) : (
                        <FlatList
                            data={recentSearches}
                            renderItem={renderItem}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.listContent}
                        />
                    )}
                </View>
            )}
            {searchResults.length > 0 && (
                <FlatList
                    data={searchResults}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                />
            )}
            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <LoadingSpinner />
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        justifyContent: 'space-between',
    },
    backIcon: {
        width: 24,
        height: 24,
        marginRight: 16
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 10,
        marginRight: 5,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        height: 42,
        fontSize: 14,
        color: '#000',
        flex: 1,
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
        borderRadius: 1,
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
    recentSearchesContainer: {
        padding: 10,
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
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
});

export default SearchPage;