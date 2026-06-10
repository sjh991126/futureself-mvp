import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';

const CustomCircularMarker = ({ coordinate, title }) => {
    return (
        <Marker coordinate={coordinate}>
            <View style={styles.markerContainer}>
                <View style={styles.marker}>
                    <Text style={styles.markerText}>🎓</Text>
                </View>
                <Text style={styles.markerTitle}>{title}</Text>
            </View>
        </Marker>
    );
};

const styles = StyleSheet.create({
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    marker: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F4A261',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    markerText: {
        fontSize: 24,
    },
    markerTitle: {
        marginTop: 5,
        fontSize: 12,
        color: '#fff',
        textAlign: 'center',
    },
});

export default CustomCircularMarker;