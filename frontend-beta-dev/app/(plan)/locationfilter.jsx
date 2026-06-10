import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Animated, TextInput, Dimensions } from 'react-native';
import MapView, { Polygon } from 'react-native-maps';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Handle, CustomBackground } from '../../assets/components/custom_handle';
import regionCoordinates from '../../assets/data/regionCoordinates.js';
import ConfirmationModal from '../../assets/components/ConfirmationModal';
import { MAIN_REGIONS, LOCATION_COORDINATES } from '../../assets/data/locations';
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const locationfilter = () => {
    const params = useLocalSearchParams();
    const { location, categories, groupSize, startDate, endDate } = useLocalSearchParams();
    const [selectedLocations, setSelectedLocations] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const snapPoints = useMemo(() => ['15%', '50%', '85%'], []);
    const sections = Object.entries(MAIN_REGIONS).map(([title, data]) => ({ title, data }));
    const mapRef = useRef(null);
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const { run: runSaveLocationFilter, isRunning: isSavingLocationFilter } = useSingleFlightAction('plan:location-filter-save');

    useEffect(() => {
        if (location) {
            setSelectedLocations(location.split(','));
        }
    }, [location]);

    // sections를 flat한 배열로 변환
    const flattenedData = useMemo(() => {
        const filtered = sections.map(section => ({
            ...section,
            data: section.data.filter(item =>
                item.toLowerCase().includes(searchQuery.toLowerCase())
            )
        })).filter(section => section.data.length > 0);

        return filtered.flatMap(section => [
            { type: 'header', title: section.title },
            ...section.data.map(item => ({ type: 'item', name: item }))
        ]);
    }, [sections, searchQuery]);

    const renderItem = ({ item }) => {
        if (item.type === 'header') {
            return (
                <View style={{ backgroundColor: 'black' }}>
                    <Text style={styles.regionTitle}>{item.title}:</Text>
                </View>
            );
        }

        return renderLocationItem({ item: item.name });
    };

    const toggleLocation = (location) => {
        if (selectedLocations.includes(location)) {
            setSelectedLocations(selectedLocations.filter(loc => loc !== location));
            setErrorModalVisible(false);
        } else {
            if (selectedLocations.length < 4) {
                setSelectedLocations([...selectedLocations, location]);
                setErrorModalVisible(false);

                const coords = LOCATION_COORDINATES[location];
                if (coords && mapRef.current) {
                    // BottomSheet 높이를 고려한 중심점 조정
                    const offsetLatitude = 0.015; // 위로 이동

                    const region = {
                        latitude: coords.latitude + offsetLatitude,
                        longitude: coords.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05
                    };
                    mapRef.current.animateToRegion(region, 1000);
                }
            } else {
                setErrorModalVisible(true);
            }
        }
    };


    const renderLocationItem = ({ item }) => {
        const isSelected = selectedLocations.includes(item);

        return (
            <TouchableOpacity
                style={styles.locationItem}
                onPress={() => toggleLocation(item)}
            >
                <Text style={styles.locationText}>{item}</Text>
                {isSelected ? (
                    <LinearGradient
                        style={styles.addButtonSelected}
                        locations={[1, 0]}
                        colors={['#81d8d0', '#5468ff']}
                        useAngle={true}
                        angle={270}
                    >
                        <Ionicons name="checkmark" size={12} color="black" />
                    </LinearGradient>
                ) : (
                    <View style={styles.addButton}>
                        <Ionicons name="add" size={12} color="white" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // 선택된 지역을 탭하면 해당 위치로 이동
    const selectedLocationTags = selectedLocations.map((location, index) => (
        <TouchableOpacity
            key={index}
            style={styles.locationTag}
            onPress={() => {
                const coords = LOCATION_COORDINATES[location];
                if (coords && mapRef.current) {
                    mapRef.current.animateToRegion({
                        latitude: coords.latitude + 0.015,
                        longitude: coords.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05
                    }, 1000);
                }
            }}
        >
            <LinearGradient
                colors={['#5468FF', '#81D8D0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientOverlay}
            >
                <Text style={styles.locationTagText}>{location}</Text>
                <TouchableOpacity onPress={(e) => {
                    e.stopPropagation();
                    toggleLocation(location);
                }}>
                    <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
            </LinearGradient>
        </TouchableOpacity>
    ));

    const handleSave = () => {
        runSaveLocationFilter(async () => {
            if (selectedLocations.length === 0) {
                return;
            }

            router.replace({
                pathname: '/aifilter',
                params: {
                    location: selectedLocations.join(','),
                    categories: categories,
                    groupSize: groupSize,
                    startDate: startDate,
                    endDate: endDate,
                },
            });
        });
    };

    const handleReset = () => {
        setSelectedLocations([]);
        setSearchQuery('');
        setErrorModalVisible(false);

        if (mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: 22.3193,
                longitude: 114.1694,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            }, 1000);
        }
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={{
                        latitude: 22.3193,
                        longitude: 114.1694,
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421,
                    }}
                    mapPadding={{
                        top: 0,
                        right: 0,
                        bottom: SCREEN_HEIGHT * 0.5,
                        left: 0,
                    }}
                >
                    {selectedLocations.map((location, index) => {
                        const coords = regionCoordinates[location];
                        if (!coords) return null;

                        return (
                            <Polygon
                                key={`${location}-${index}`}
                                coordinates={coords}
                                strokeColor="#5468FF"
                                fillColor="rgba(84, 104, 255, 0.3)"
                                strokeWidth={2}
                            />
                        );
                    })}
                </MapView>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={30} color="white" />
                    </TouchableOpacity>
                    {/* <View style={styles.selectedLocations}>
                        {selectedLocations.map((location, index) => (
                            <View key={index} style={styles.locationTag}>
                                <LinearGradient
                                    colors={['#5468FF', '#81D8D0']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.gradientOverlay}
                                >
                                    <Text style={styles.locationTagText}>{location}</Text>
                                    <TouchableOpacity onPress={() => toggleLocation(location)}>
                                        <Ionicons name="close" size={16} color="white" />
                                    </TouchableOpacity>
                                </LinearGradient>
                            </View>
                        ))}
                    </View> */}

                    <View style={styles.selectedLocations}>
                        {selectedLocationTags}
                    </View>
                </View>
                <BottomSheet
                    index={1}
                    snapPoints={snapPoints}
                    backgroundComponent={CustomBackground}
                    handleComponent={Handle}
                    enableDynamicSizing={false}
                >
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={24} color="#000" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search locations"
                            placeholderTextColor="#ABB7C2"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#ABB7C2" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <BottomSheetFlatList
                        data={flattenedData}
                        renderItem={renderItem}
                        keyExtractor={(item, index) =>
                            item.type === 'header' ? `header-${item.title}` : `item-${item.name}-${index}`
                        }
                        contentContainerStyle={{ paddingBottom: 60 }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No locations found</Text>
                            </View>
                        }
                    />
                </BottomSheet>
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.resetButton, { flex: 2 }]}
                        onPress={handleReset}
                    >
                        <Text style={styles.resetButtonText}>RESET</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.saveButton, { flex: 3 }]}
                        onPress={handleSave}
                        disabled={selectedLocations.length === 0 || isSavingLocationFilter}
                    >
                        <LinearGradient
                            colors={selectedLocations.length > 0 ? ['#5468FF', '#81D8D0'] : ['#fff', '#fff']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientButton}
                        >
                            <Text style={[
                                styles.saveButtonText,
                                selectedLocations.length > 0 ? styles.saveButtonTextActive : styles.saveButtonTextInactive
                            ]}>
                                SAVE ({selectedLocations.length}/4)
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
            <ConfirmationModal
                visible={errorModalVisible}
                title="Exceeded limit"
                message="You can select a maximum of 4 locations."
                onConfirm={() => setErrorModalVisible(false)}
                confirmText="OK"
                cancelText=''
            />
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
        padding: 20,

    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 24,
        marginTop: 15,
    },
    backButton: {
        backgroundColor: 'black',
        borderRadius: 7,
        padding: 6,
        marginRight: 8,
    },
    selectedLocations: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    locationTag: {
        borderRadius: 7,
        margin: 4,
        overflow: 'hidden',
    },
    gradientOverlay: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 6,
    },
    locationTagText: {
        color: 'white',
        marginRight: 4,
        fontSize: 10,
        fontWeight: '600'
    },
    addButton: {
        backgroundColor: 'black',
        borderColor: 'white',
        borderWidth: 1,
        borderRadius: 12,
        padding: 5,
        marginLeft: 'auto',
    },
    addButtonSelected: {
        borderRadius: 12,
        padding: 5,
        marginLeft: 'auto',
    },

    searchContainer: {
        height: 42,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 16,
        borderRadius: 10,
        marginHorizontal: 10,
        marginVertical: 8,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: 'black',
    },
    separator: {
        height: 1,
        backgroundColor: 'white',
        marginVertical: 8,
        marginHorizontal: 16,
    },
    regionTitle: {
        color: '#888',
        fontSize: 16,
        padding: 10,
    },
    locationItem: {
        flexDirection: 'row',
        paddingVertical: 15,
        paddingHorizontal: 10,
    },
    locationText: {
        color: '#fff',
        fontSize: 16,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        marginVertical: 10,
        backgroundColor: 'black',
    },
    resetButton: {
        backgroundColor: 'black',
        borderWidth: 1,
        borderColor: 'white',
        padding: 10,
        borderRadius: 7,
        marginRight: 8,
    },
    resetButtonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    saveButton: {
        backgroundColor: 'white',
        borderRadius: 7,
        marginLeft: 8,
        overflow: 'hidden',
    },

    gradientButton: {
        paddingVertical: 10,
        borderRadius: 7,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        textAlign: 'center',
        fontWeight: 'bold',
    },
    saveButtonTextActive: {
        color: 'white',
    },
    saveButtonTextInactive: {
        color: 'black',
    },
});

export default locationfilter;
