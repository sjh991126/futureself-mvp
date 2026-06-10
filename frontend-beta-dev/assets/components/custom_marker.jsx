import { Marker } from 'react-native-maps';
import { StyleSheet, TouchableOpacity, Image } from 'react-native';
import React from 'react';

const CustomMarker = ({ place, onPress, focused }) => {
    return (
        <Marker 
            coordinate={{
                latitude: place.latitude,
                longitude: place.longitude,
            }}
            onPress={onPress}
        >
            <TouchableOpacity onPress={onPress} style={styles.marker}>
                    <Image 
                        resizeMode = "contain"
                        source={focused ? require('../../assets/map_icons/trippy100_focused.png') : require('../../assets/map_icons/trippy100_icon.png')} 
                        style={{ width: 40, height: 40}}
                    />
            </TouchableOpacity>
        </Marker>
    );
};

const styles = StyleSheet.create({
    marker: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default CustomMarker;
