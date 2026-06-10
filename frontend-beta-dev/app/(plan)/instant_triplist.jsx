import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Animated, Dimensions, ActivityIndicator } from 'react-native'; // Added ActivityIndicator import
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';
import { Handle, CustomBackground } from '../../assets/components/custom_handle';
import { fetchInstantTripList } from '../src/api/triplist'; // Import the fetchInstantTripList function
import { useAppState } from "../src/AppStateHandler";

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.5;

const InstantTripList = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [tripData, setTripData] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const snapPoints = useMemo(() => ['15%', '50%', '85%'], []);
  const flatListRef = useRef(null);
  const setLastUsedFeature = useAppState();

  useEffect(() => {
    setLastUsedFeature('InstantTripList');
}, [setLastUsedFeature]);


  useEffect(() => {
    const fetchTripList = async () => {
      try {
        const response = await fetchInstantTripList({
          instantId: params.instantId,
          location: {
            latitude: parseFloat(params.latitude),
            longitude: parseFloat(params.longitude),
          },
        });
        setTripData(response);
        const allPlaces = response.itinerary.flatMap((day, dayIndex) => {
          return day.places.map((place, placeIndex) => ({
            ...place,
            dayIndex,
            originalIndex: placeIndex,
            id: `${dayIndex}-${placeIndex}`
          }));
        });
        setPlaces(allPlaces);
      } catch (error) {
        console.error('Error fetching instant trip list:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTripList();
  }, [params.instantId, params.latitude, params.longitude]);

  const handleSheetChanges = (index) => {
    // Handle sheet changes if needed
  };

  const handleCreateTripList = () => {
    // Handle create trip list if needed
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        ) : (
          <>
            <MapView
              style={styles.map}
              initialRegion={places.length > 0 ? {
                latitude: places[0].latitude,
                longitude: places[0].longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              } : {
                latitude: parseFloat(params.latitude),
                longitude: parseFloat(params.longitude),
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }}
            >
              {places.map((place, index) => (
                <Marker
                  key={place.id}
                  coordinate={{ latitude: place.latitude, longitude: place.longitude }}
                  title={place.name}
                >
                  <View style={styles.markerContainer}>
                    <Text style={styles.markerText}>{index + 1}</Text>
                  </View>
                </Marker>
              ))}
              <Polyline
                coordinates={places.map(place => ({ latitude: place.latitude, longitude: place.longitude }))}
                strokeColor="#000"
                strokeWidth={2.5}
                lineDashPattern={[3, 4]}
                lineCap="round"
                lineJoin="round"
              />
            </MapView>
            <BottomSheet
              index={1}
              snapPoints={snapPoints}
              backgroundComponent={CustomBackground}
              handleComponent={Handle}
              onChange={handleSheetChanges}
            >
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateTripList} style={styles.makeTripListButton}>
                  <LinearGradient
                    colors={['#5468FF', '#81D8D0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.makeTripListButtonGradient}
                  >
                    <Text style={styles.makeTripListButtonText}>Save TripList</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <FlatList
                ref={flatListRef}
                data={places}
                renderItem={({ item }) => (
                  <View style={styles.itemContainer}>
                    <Text>{item.name}</Text>
                  </View>
                )}
                keyExtractor={item => item.id}
              />
            </BottomSheet>
          </>
        )}
      </View>
    </GestureHandlerRootView>
  );
};

export default InstantTripList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerContainer: {
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 5,
  },
  markerText: {
    color: 'black',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },
  cancelButton: {
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 5,
  },
  cancelButtonText: {
    color: 'white',
  },
  makeTripListButton: {
    padding: 10,
    borderRadius: 5,
  },
  makeTripListButtonGradient: {
    padding: 10,
    borderRadius: 5,
  },
  makeTripListButtonText: {
    color: 'white',
  },
  itemContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});