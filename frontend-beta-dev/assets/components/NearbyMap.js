import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

export const NearbyMap = memo(({ city, initialRegion, onExpandPress }) => (
    <View style={styles.nearbyContainer}>
        <Text style={styles.nearbyText}>
            What's Nearby {city ? city : ''}
        </Text>
        <MapView
            style={styles.map}
            initialRegion={initialRegion}
            pitchEnabled={false}
            rotateEnabled={false}
            scrollEnabled={true}
            zoomEnabled={true}
            loadingEnabled={true}
            loadingIndicatorColor="#fff"
        />
        <TouchableOpacity onPress={onExpandPress} style={styles.expandIcon}>
            <Ionicons name="expand" size={28} color="#000" />
        </TouchableOpacity>
    </View>
));

const styles = StyleSheet.create({
    nearbyContainer: {
        marginTop: -60,
        marginLeft: 4,
        width: '100%',
        height: 200,
        position: 'relative',
        marginBottom: 10,
    },
    nearbyText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#fff",
        textAlign: "left"
    },
    map: {
        width: "97.5%",
        height: "100%",
        marginTop: 10,
        borderRadius: 10
    },
    expandIcon: {
        position: 'absolute',
        right: 20,
        top: 45,
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 5,
    },
});