// import React, { useState, useEffect } from 'react';
// import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, Image } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { useRouter } from 'expo-router';
// import LoadingSpinner from './../LoadingSpinner';
// import { searchAll } from '../src/api/elastic_search';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useSelector } from 'react-redux';
// import { logPlaceSearch } from '../src/api/s3_upload'; // Import the logPlaceSearch function
// import { useAppState } from "../src/AppStateHandler";
// import { placeView } from '../src/api/ViewCounts'; // Import the placeView function

// const ElasticSearch = () => {
//     const router = useRouter();
//     const user = useSelector((state) => state.user.data); // Get user data from Redux store
//     const [searchQuery, setSearchQuery] = useState('');
//     const [searchResults, setSearchResults] = useState({ places: [], tripLists: [], users: [] });
//     const [recentSearches, setRecentSearches] = useState([]);
//     const [isLoading, setIsLoading] = useState(false);
//     const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
//     const [error, setError] = useState(null);
//     const setLastUsedFeature = useAppState();

//     useEffect(() => {
//         setLastUsedFeature('ElasticSearch');
//     }, [setLastUsedFeature]);

//     useEffect(() => {
//         // Load recent searches from local storage on component mount
//         const loadRecentSearches = async () => {
//             const storedSearches = await AsyncStorage.getItem('recentSearches');
//             if (storedSearches) {
//                 setRecentSearches(JSON.parse(storedSearches));
//             }
//         };
//         loadRecentSearches();
//     }, []);

//     useEffect(() => {
//         const handler = setTimeout(() => {
//             setDebouncedQuery(searchQuery);
//         }, 1250); // 1.25 second delay

//         return () => {
//             clearTimeout(handler);
//         };
//     }, [searchQuery]);

//     useEffect(() => {
//         const handleSearch = async (query) => {
//             if (query !== '') {
//                 setIsLoading(true);
//                 setError(null);
//                 try {
//                     const encodedQuery = encodeURIComponent(query);
//                     const response = await searchAll(encodedQuery);
//                     setSearchResults(response);
//                     if (response.places.length === 0 && response.tripLists.length === 0 && response.users.length === 0) {
//                         setError('No results found');
//                     }
//                 } catch (error) {
//                     if (error.response && error.response.status === 400) {
//                         setError('No Places Found');
//                     } else {
//                         console.error('Error searching:', error);
//                     }
//                 } finally {
//                     setIsLoading(false);
//                 }
//             } else {
//                 setSearchResults({ places: [], tripLists: [], users: [] });
//             }
//         };

//         handleSearch(debouncedQuery);
//     }, [debouncedQuery]);

//     const handleSelectPlace = async (place) => {
//         if (user) {
//             logPlaceSearch(user.userId, place.id, place.name, searchQuery, 'place'); // Log place search
//         }

//         try {
//             await placeView(place.id); // Call placeView with the place ID
//         } catch (error) {
//             console.error('Error posting view count:', error);
//         }

//         const updatedSearches = [place, ...recentSearches.filter(p => p.id !== place.id)].slice(0, 5); // Keep only the last 5 searches
//         setRecentSearches(updatedSearches);
//         await AsyncStorage.setItem('recentSearches', JSON.stringify(updatedSearches)); // Save to local storage

//         router.push({
//             pathname: '/full_map',
//             params: { 
//                 selectedPlace: JSON.stringify(place),
//                 latitude: place.latitude.toString(),
//                 longitude: place.longitude.toString()
//             }
//         });
//     };

//     const handleSelectTripList = (tripList) => {
//         if (user) {
//             logPlaceSearch(user.userId, tripList.id, tripList.name, searchQuery, 'tripList'); // Log trip list search
//         }

//         router.push({
//             pathname: '/list_details',
//             params: { 
//                 listId: tripList.id,
//                 listName: tripList.name,
//                 listImage: tripList.imageUrl,
//                 tripDetails: JSON.stringify(tripList)
//             }
//         });
//     };

//     const renderPlaceItem = ({ item }) => {
//         const firstImageUrl = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : null;

//         return (
//             <View style={styles.itemContainer}>
//                 {firstImageUrl && <Image source={{ uri: firstImageUrl }} style={styles.image} />}
//                 <TouchableOpacity style={styles.textContainer} onPress={() => handleSelectPlace(item)}>
//                     <Text style={styles.name}>{item.name}</Text>
//                     <Text style={styles.details}>
//                         {item.shortFormattedAddress || item.types[0].replace('_', ' ')}
//                     </Text>
//                 </TouchableOpacity>
//             </View>
//         );
//     };

//     const renderTripListItem = ({ item }) => {
//         return (
//             <View style={styles.itemContainer}>
//                 <Image source={{ uri: item.imageUrl }} style={styles.tripListImage} />
//                 <TouchableOpacity style={styles.textContainer} onPress={() => handleSelectTripList(item)}>
//                     <Text style={styles.name}>{item.name}</Text>
//                     <Text style={styles.details}>
//                         Created by {item.user.userName} 
//                     </Text>
//                 </TouchableOpacity>
//             </View>
//         );
//     };

//     return (
//         <SafeAreaView style={styles.container}>
//             <View style={styles.header}>
//                 <TouchableOpacity onPress={() => router.back()}>
//                     <Ionicons name="chevron-back-outline" size={28} color="white" style={styles.backIcon} />
//                 </TouchableOpacity>
//                 <View style={styles.searchContainer}>
//                     <Ionicons name="search" size={20} color="black" style={styles.searchIcon} />
//                     <TextInput
//                         style={styles.searchInput}
//                         placeholder="Search"
//                         placeholderTextColor="gray"
//                         value={searchQuery}
//                         onChangeText={setSearchQuery}
//                     />
//                 </View>
//             </View>
//             {isLoading && (
//                 <View style={styles.loadingOverlay}>
//                     <LoadingSpinner />
//                 </View>
//             )}
//             {error && (
//                 <View style={styles.errorContainer}>
//                     <Text style={styles.errorText}>{error}</Text>
//                 </View>
//             )}
//             {searchResults.places.length === 0 && searchResults.tripLists.length === 0 && (
//                 <View style={styles.recentSearchesContainer}>
//                     <Text style={styles.recentSearchesHeader}>Recent Searches</Text>
//                     {recentSearches.length === 0 ? (
//                         <Text style={styles.noRecentSearches}>No recent searches yet</Text>
//                     ) : (
//                         <FlatList
//                             data={recentSearches}
//                             renderItem={renderPlaceItem}
//                             keyExtractor={item => item.id}
//                             contentContainerStyle={styles.listContent}
//                         />
//                     )}
//                 </View>
//             )}
//             <FlatList
//                 ListHeaderComponent={() => (
//                     <>
//                         {searchResults.places.length > 0 && (
//                             <>
//                                 <Text style={styles.sectionHeader}>Places</Text>
//                                 <View style={styles.sectionDivider} />
//                             </>
//                         )}
//                     </>
//                 )}
//                 data={searchResults.places}
//                 renderItem={renderPlaceItem}
//                 keyExtractor={item => item.id}
//                 contentContainerStyle={styles.listContent}
//                 ListFooterComponent={() => (
//                     <>
//                         {searchResults.tripLists.length > 0 && (
//                             <>
//                                 <Text style={styles.sectionHeader}>Trip Lists</Text>
//                                 <View style={styles.sectionDivider} />
//                                 <FlatList
//                                     data={searchResults.tripLists}
//                                     renderItem={renderTripListItem}
//                                     keyExtractor={item => item.id}
//                                     contentContainerStyle={styles.listContent}
//                                 />
//                             </>
//                         )}
//                     </>
//                 )}
//             />
//         </SafeAreaView>
//     );
// };

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: 'black',
//     },
//     header: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         padding: 10,
//         justifyContent: 'space-between',
//     },
//     backIcon: {
//         width: 24,
//         height: 24,
//         marginRight: 16
//     },
//     searchContainer: {
//         flex: 1,
//         flexDirection: 'row',
//         alignItems: 'center',
//         backgroundColor: '#fff',
//         borderRadius: 10,
//         paddingHorizontal: 10,
//         marginRight: 5,
//     },
//     searchIcon: {
//         marginRight: 10,
//     },
//     searchInput: {
//         height: 42,
//         fontSize: 14,
//         color: '#000',
//         flex: 1,
//     },
//     listContent: {
//         padding: 10,
//     },
//     itemContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 15,
//     },
//     image: {
//         width: 66,
//         height: 66,
//         // Remove borderRadius here
//     },
//     tripListImage: {
//         width: 66,
//         height: 66,
//         borderRadius: 8, // Add borderRadius for TripLists
//     },
//     textContainer: {
//         flex: 1,
//         marginLeft: 15,
//     },
//     name: {
//         color: 'white',
//         fontSize: 16,
//         fontWeight: 'bold',
//     },
//     details: {
//         color: 'white',
//         fontSize: 12,
//     },
//     loadingOverlay: {
//         position: 'absolute',
//         top: 0,
//         left: 0,
//         right: 0,
//         bottom: 0,
//         justifyContent: 'center',
//         alignItems: 'center',
//         backgroundColor: 'rgba(0,0,0,0.5)',
//     },
//     sectionHeader: {
//         fontSize: 20,
//         fontWeight: 'bold',
//         color: 'white',
//         marginVertical: 10,
//         marginLeft: 10,
//     },
//     sectionDivider: {
//         height: 1,
//         backgroundColor: 'white',
//         marginVertical: 10,
//         marginHorizontal: 0,
//     },
//     errorContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     errorText: {
//         color: 'white',
//         fontSize: 18,
//         fontWeight: 'bold',
//     },
//     recentSearchesContainer: {
//         padding: 10,
//     },
//     recentSearchesHeader: {
//         color: 'white',
//         fontSize: 18,
//         fontWeight: 'bold',
//         marginBottom: 10,
//     },
//     noRecentSearches: {
//         color: 'gray',
//         fontSize: 14,
//         marginBottom: 10,
//     },
// });

// export default ElasticSearch;
