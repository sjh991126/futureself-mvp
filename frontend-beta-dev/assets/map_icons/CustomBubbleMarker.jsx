import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import * as Animatable from 'react-native-animatable';

const CustomBubbleMarker = ({ coordinate, title, description }) => {
    const bubbleRef = useRef(null);

    useEffect(() => {
        bubbleRef.current.bounceIn();
    }, []);

    return (
        <Marker coordinate={coordinate}>
            <Animatable.View ref={bubbleRef} style={styles.bubbleContainer}>
                <View style={styles.bubble}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.description}>{description}</Text>
                </View>
                <View style={styles.arrowBorder} />
                <View style={styles.arrow} />
            </Animatable.View>
        </Marker>
    );
};

const styles = StyleSheet.create({
    bubbleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    bubble: {
        flexDirection: 'column',
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        borderRadius: 6,
        borderColor: '#ccc',
        borderWidth: 0.5,
        padding: 15,
    },
    title: {
        fontSize: 16,
        marginBottom: 5,
    },
    description: {
        fontSize: 12,
    },
    arrow: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderTopColor: '#fff',
        borderWidth: 16,
        alignSelf: 'center',
        marginTop: -32,
    },
    arrowBorder: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderTopColor: '#ccc',
        borderWidth: 16,
        alignSelf: 'center',
        marginTop: -0.5,
    },
});

export default CustomBubbleMarker;