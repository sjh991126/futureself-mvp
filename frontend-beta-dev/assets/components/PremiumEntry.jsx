// Home entry for the Premium booking flows: Hotels / Flights / Hotel + Flights cards
// plus the "Upcoming Trip" card (matches the Trippy Premium home design).
import React, { useCallback, useState } from 'react';
import { View, Text, ImageBackground, Pressable, StyleSheet, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMyBookings } from '../../app/src/api/premium';

const CARDS = [
    { label: 'Hotels', to: '/(premium)/book-hotels', img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600' },
    { label: 'Flights', to: '/(premium)/book-flight', img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600' },
    { label: 'Hotel + Flights', to: '/(premium)/book-hotels', img: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600' },
];

const fmtShort = (d) => d ? `${parseInt(d.slice(5, 7), 10)}/${parseInt(d.slice(8, 10), 10)}` : '';

export const PremiumEntry = () => {
    const [trip, setTrip] = useState(null);

    useFocusEffect(useCallback(() => {
        let live = true;
        getMyBookings()
            .then((list) => {
                if (!live) return;
                const next = (list || []).find((b) => b.status === 'CONFIRMED' && b.hotel) || (list || [])[0];
                setTrip(next || null);
            })
            .catch(() => {});
        return () => { live = false; };
    }, []));

    return (
        <View style={st.wrap}>
            <View style={st.cardRow}>
                {CARDS.map((c) => (
                    <Pressable key={c.label} style={st.card} onPress={() => router.push(c.to)}>
                        <ImageBackground source={{ uri: c.img }} style={st.cardImg} imageStyle={{ borderRadius: 14 }}>
                            <View style={st.cardOverlay} />
                            <Text style={st.cardLabel}>{c.label}</Text>
                        </ImageBackground>
                    </Pressable>
                ))}
            </View>

            {trip?.hotel ? (
                <Pressable style={st.tripCard}
                    onPress={() => router.push({ pathname: '/(premium)/booking-detail', params: { id: trip.id } })}>
                    <Text style={st.tripTitle}>
                        Upcoming Trip on {fmtShort(trip.checkIn)} - {fmtShort(trip.checkOut)}
                    </Text>
                    <View style={st.tripRow}>
                        <Image source={{ uri: trip.hotel.imageUrl }} style={st.tripImg} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <View style={st.tripHead}>
                                <Text style={st.tripName} numberOfLines={1}>{trip.hotel.name}</Text>
                                <View style={st.starRow}>
                                    <Ionicons name="star" size={12} color="#F5C84B" />
                                    <Text style={st.star}> {trip.hotel.rating.toFixed(1)}</Text>
                                </View>
                            </View>
                            <View style={st.areaRow}>
                                <Ionicons name="location-outline" size={11} color="#9A9FA6" />
                                <Text style={st.area}> {trip.hotel.area}</Text>
                            </View>
                            <Text style={st.price}>
                                <Text style={{ color: '#7DE0EC', fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' }}>${trip.hotel.pricePerNight}</Text> /night
                            </Text>
                        </View>
                    </View>
                </Pressable>
            ) : null}
        </View>
    );
};

const st = StyleSheet.create({
    wrap: { paddingHorizontal: 16, marginTop: 18 },
    cardRow: { flexDirection: 'row', gap: 10 },
    card: { flex: 1 },
    cardImg: { height: 84, justifyContent: 'flex-end' },
    cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 14 },
    cardLabel: { color: '#fff', fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800', padding: 10 },
    tripCard: {
        backgroundColor: '#17181B', borderRadius: 16, padding: 14, marginTop: 16,
        borderWidth: 1, borderColor: '#2A2B30',
    },
    tripTitle: { color: '#fff', fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', marginBottom: 12 },
    tripRow: { flexDirection: 'row', alignItems: 'center' },
    tripImg: { width: 64, height: 64, borderRadius: 10 },
    tripHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tripName: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', flex: 1, marginRight: 8 },
    starRow: { flexDirection: 'row', alignItems: 'center' },
    star: { color: '#fff', fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    areaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
    area: { color: '#9A9FA6', fontSize: 11.5 },
    price: { color: '#9A9FA6', fontSize: 12, marginTop: 5 },
});
