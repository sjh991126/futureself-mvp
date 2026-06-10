import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, TextInput, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { load100Places } from '../src/api/places'; // Import the loadPlaces function
import { useTripContext } from './../src/api/TripContext.js';
import { searchGooglePlaces } from '../src/api/google_places'; // Import Google Places functions

const SkeletonPlace = () => (
  <View style={styles.skeletonItem}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonTextContainer}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonSubtitle} />
    </View>
  </View>
);

const Add_place = () => {
  const router = useRouter();
  const { selectedPlaces, setSelectedPlaces, updateSelectedPlaces } = useTripContext();
  const params = useLocalSearchParams();
  const day = params.day;
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPlaces, setFilteredPlaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const tripData = params.tripData ? JSON.parse(params.tripData) : null;
  const [likedPlaces, setLikedPlaces] = useState({});
  const [forceRender, setForceRender] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [allPlaces, setAllPlaces] = useState([]);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setIsLoading(true);
        const places = await load100Places();
        if (places.length > 0) {
          const filteredPlaces = places.filter(place => place.rating > 3.5);
          setAllPlaces(filteredPlaces);

          const firstBatch = filteredPlaces.slice(0, 7);
          setFilteredPlaces(firstBatch);

          setHasMore(filteredPlaces.length > 7);
        }
      } catch (error) {
        console.error('Error fetching recommended places:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let isActive = true;

    const runSearch = async () => {
      if (debouncedQuery === '') {
        if (!isActive) return;
        setPage(1);
        setHasMore(allPlaces.length > 7);
        setFilteredPlaces(allPlaces.slice(0, 7));
        return;
      }

      try {
        const relevantPlaces = await searchGooglePlaces(debouncedQuery);
        if (!isActive) return;
        setHasMore(false);
        setFilteredPlaces(Array.isArray(relevantPlaces) ? relevantPlaces : []);
      } catch (error) {
        if (!isActive) return;
        setFilteredPlaces([]);
        console.error('Error searching places:', error);
      }
    };

    runSearch();

    return () => {
      isActive = false;
    };
  }, [debouncedQuery, allPlaces]);

  const loadMorePlaces = () => {
    if (searchQuery.trim() !== '' || !hasMore || isLoading) return;

    setIsLoading(true);

    const startIndex = page * 7;
    const endIndex = startIndex + 7;
    const newPlaces = allPlaces.slice(startIndex, endIndex);

    if (newPlaces.length > 0) {
      setTimeout(() => {
        setFilteredPlaces(prev => [...prev, ...newPlaces]);
        setPage(prev => prev + 1);

        if (endIndex >= allPlaces.length) {
          setHasMore(false);
        }
        setIsLoading(false);
      }, 500);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleSelectPlace = (place) => {
    setSelectedPlaces(prevSelected => {
      const currentSelected = { ...prevSelected };

      if (!currentSelected.places) {
        currentSelected.places = [];
      }

      currentSelected.places = [...currentSelected.places];

      if (!currentSelected.places[day - 1]) {
        currentSelected.places[day - 1] = [];
      } else {
        currentSelected.places[day - 1] = [...currentSelected.places[day - 1]];
      }

      const placeIndex = currentSelected.places[day - 1].findIndex(p => p.id === place.id);

      if (placeIndex !== -1) {
        currentSelected.places[day - 1] = currentSelected.places[day - 1].filter(p => p.id !== place.id);
      } else {
        currentSelected.places[day - 1].push(place);
      }

      console.log('Updated selectedPlaces after selection:', JSON.stringify(currentSelected, null, 2));
      return currentSelected;
    });
  };

  const handleAddPlaces = () => {
    const placesToAdd = selectedPlaces.places && selectedPlaces.places[day - 1] ? selectedPlaces.places[day - 1] : [];

    if (placesToAdd.length > 0) {
      let updatedTripData;

      if (typeof params.tripData === 'string') {
        updatedTripData = JSON.parse(params.tripData);
      } else {
        updatedTripData = params.tripData;
      }

      if (updatedTripData && updatedTripData.itinerary[day - 1]) {
        updatedTripData.itinerary[day - 1].places = [...updatedTripData.itinerary[day - 1].places, ...placesToAdd];
      }

      updateSelectedPlaces(day, placesToAdd);

      switch (params.from) {
        case 'manualselection':
          router.push({
            pathname: '/manualselection',
            params: { day: day, tripData: JSON.stringify(updatedTripData) }
          });
          break;
        case 'triplist':
          router.push({
            pathname: '/triplist',
            params: {
              tripData: JSON.stringify(updatedTripData),
              isEditMode: 'true',
            }
          });
          break;
        case 'list_details':
          // list_details의 useEffect가 selectedPlace를 감지하여 추가하도록 변경
          // 여러 장소를 선택했어도 하나씩만 전달 (list_details의 로직과 일치)
          const placeToAdd = placesToAdd[0];
          router.push({
            pathname: '/list_details',
            params: {
              from: 'add_place',
              isEditMode: true,
              tripListId: updatedTripData.tripListId,
              selectedPlace: JSON.stringify(placeToAdd) // 선택된 장소를 파라미터로 전달
            }
          });
          break;
        default:
          console.warn('Unknown source page:', params.from);
          router.back();
      }
    } else {
      router.back();
    }
  };

  const renderItem = ({ item }) => {
    const dayPlaces = selectedPlaces.places && selectedPlaces.places[day - 1] ? selectedPlaces.places[day - 1] : [];
    const isSelected = dayPlaces.some(p => p.id === item.id);
    const firstImageUrl = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : null;

    return (
      <TouchableOpacity
        onPress={() => router.push({
          pathname: 'place_details',
          params: {
            placeAll: JSON.stringify(item),
            placeId: item.id,
            placeName: item.name,
            placeAddress: item.shortFormattedAddress ? item.shortFormattedAddress : '',
            placeSummary: item.summary,
            placeRating: item.rating ? item.rating.toString() : '',
            imageUrls: JSON.stringify(item.imageUrls) || null,
            googleid: item.googleid || ''
          }
        })}
      >
        <View style={styles.itemContainer}>
          {firstImageUrl ? (
            <ExpoImage
              source={{ uri: firstImageUrl }}
              style={styles.image}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="image" size={24} color="gray" />
            </View>
          )}
          <View style={styles.textContainer}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.details}>
              {item.shortFormattedAddress ? item.shortFormattedAddress.split(',').pop() : ''} {item.shortFormattedAddress ? '·' : ''} {item.rating} ★
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleSelectPlace(item)}>
            {isSelected ? (
              <LinearGradient
                style={styles.addButtonSelected}
                locations={[1, 0]}
                colors={['#81d8d0', '#5468ff']}
                useAngle={true}
                angle={270}
              >
                <Ionicons name="checkmark" size={18} />
              </LinearGradient>
            ) : (
              <View style={styles.addButton}>
                <Ionicons name="add" size={18} color="white" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} pointerEvents={isLoading ? 'none' : 'auto'}>
      {isLoading && page === 1 ? (
        <>
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
                onChangeText={handleSearch}
              />
            </View>
          </View>
          <Text style={styles.title}>DAY {day} RECOMMENDATIONS</Text>
          <ScrollView contentContainerStyle={styles.skeletonContainer}>
            {Array(7).fill(0).map((_, index) => (
              <SkeletonPlace key={index} />
            ))}
          </ScrollView>
        </>
      ) : (
        <>
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
                onChangeText={handleSearch}
              />
            </View>
          </View>
          <Text style={styles.title}>DAY {day} RECOMMENDATIONS</Text>
          <ScrollView>
            <FlatList
              data={filteredPlaces}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onEndReached={loadMorePlaces}
              onEndReachedThreshold={0.5}
            />
            {isLoading && hasMore && page > 1 && (
              <View style={styles.bottomLoadingContainer}>
                <ActivityIndicator size="small" color="#5468ff" />
              </View>
            )}
          </ScrollView>
        </>
      )}

      <TouchableOpacity onPress={handleAddPlaces}>
        {Object.keys(selectedPlaces).some(dayKey => (selectedPlaces[dayKey] || []).length > 0) ? (
          <LinearGradient
            style={styles.addAllButtonSelected}
            locations={[0, 1]}
            colors={['#81d8d0', '#5468ff']}
            useAngle={true}
            angle={270}
          >
            <Text style={styles.addAllTextSelected}>ADD</Text>
          </LinearGradient>
        ) : (
          <View style={styles.addAllButton}>
            <Text style={styles.addAllText}>ADD</Text>
          </View>
        )}
      </TouchableOpacity>
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
  title: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    padding: 10,
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
  placeholder: {
    width: 66,
    height: 66,
    borderRadius: 1,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
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
  addButton: {
    backgroundColor: 'black',
    borderColor: 'white',
    borderWidth: 0.5,
    borderRadius: 15,
    padding: 5,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonSelected: {
    borderRadius: 15,
    padding: 5,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addAllButton: {
    backgroundColor: 'white',
    margin: 10,
    padding: 10,
    borderRadius: 7,
    alignItems: 'center',
  },
  addAllButtonSelected: {
    margin: 10,
    padding: 10,
    borderRadius: 7,
    alignItems: 'center',
  },
  addAllText: {
    color: 'black',
    fontSize: 14,
    fontWeight: '600',
  },
  addAllTextSelected: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  actionIcon: {
    marginRight: 9,
  },
  largerIcon: {
    width: 28,
    height: 28,
  },
  skeletonContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  bottomSkeletonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'black',
    paddingBottom: 80,
  },
  skeletonItem: {
    flexDirection: 'row',
    padding: 15,
    marginBottom: 10,
  },
  skeletonImage: {
    width: 80,
    height: 80,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    opacity: 0.5,
  },
  skeletonTextContainer: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  skeletonTitle: {
    height: 18,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    marginBottom: 8,
    opacity: 0.5,
  },
  skeletonSubtitle: {
    height: 14,
    width: '70%',
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    opacity: 0.5,
  },
  bottomLoadingContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});

export default Add_place;
