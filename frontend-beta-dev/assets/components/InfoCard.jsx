import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const InfoCard = ({ onClose }) => {
    return (
        <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Trippy Top 100</Text>
                <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
            <Text style={styles.cardText}>
                Discover the top 100 must-visit places in Hong Kong, curated by professionals.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        position: 'absolute',
        top: '40%',
        left: '10%',
        right: '10%',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 20,
        borderRadius: 10,
        zIndex: 1000,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cardText: {
        color: '#fff',
        fontSize: 14,
    },
});

export default InfoCard;