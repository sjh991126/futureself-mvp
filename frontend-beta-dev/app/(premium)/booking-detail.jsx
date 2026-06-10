import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C, Header, Stars } from './_theme';
import { getBooking } from '../src/api/premium';

const fmtRange = (a, b) => {
    if (!a || !b) return '—';
    const d = (x) => +x.slice(8, 10);
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+a.slice(5, 7) - 1];
    return `${d(a)} - ${d(b)} ${mon} ${a.slice(0, 4)}`;
};

// Pseudo-barcode: stripe widths derived from the confirmation code characters.
const Barcode = ({ code }) => (
    <View style={st.barcode}>
        {Array.from(code.replace(/-/g, '')).slice(0, 36).map((ch, i) => (
            <View key={i} style={{
                width: (ch.charCodeAt(0) % 3) + 1.5,
                marginRight: (ch.charCodeAt(0) % 2) + 1.5,
                height: 56, backgroundColor: '#fff',
            }} />
        ))}
    </View>
);

export default function BookingDetail() {
    const { id } = useLocalSearchParams();
    const [b, setB] = useState(null);

    useEffect(() => { getBooking(id).then(setB).catch(() => {}); }, [id]);

    if (!b) {
        return <SafeAreaView style={st.safe}><ActivityIndicator color={C.cyan} style={{ marginTop: 60 }} /></SafeAreaView>;
    }

    const h = b.hotel;
    const openMap = () => h && Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}`);

    const Row = ({ icon, k, v }) => (
        <View style={st.bRow}>
            <View style={st.bKey}>
                <Ionicons name={icon} size={14} color={C.sub} />
                <Text style={st.bKeyText}>  {k}</Text>
            </View>
            <Text style={st.bVal}>{v}</Text>
        </View>
    );

    return (
        <SafeAreaView style={st.safe} edges={['top']}>
            <Header title="Booking Detail" right={<Ionicons name="ellipsis-vertical" size={16} color={C.text} />} />
            <ScrollView contentContainerStyle={st.body} showsVerticalScrollIndicator={false}>
                {h ? (
                    <>
                        <Text style={st.sectionTitle}>Your Hotel</Text>
                        <View style={st.hotelCard}>
                            <Image source={{ uri: h.imageUrl }} style={st.hotelImg} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <View style={st.hotelHead}>
                                    <Text style={st.hotelName} numberOfLines={1}>{h.name}</Text>
                                    <Stars rating={h.rating} />
                                </View>
                                <View style={st.areaRow}>
                                    <Ionicons name="location-outline" size={12} color={C.sub} />
                                    <Text style={st.area}> {h.area}</Text>
                                </View>
                                <Text style={st.nightly}>
                                    <Text style={{ color: C.cyan, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' }}>${h.pricePerNight}</Text> /night
                                </Text>
                            </View>
                        </View>

                        <View style={st.sectionHead}>
                            <Text style={st.sectionTitle}>Location</Text>
                            <Pressable onPress={openMap}><Text style={st.openMap}>Open Map</Text></Pressable>
                        </View>
                        <Pressable onPress={openMap} style={st.mapCard}>
                            <Ionicons name="map" size={26} color={C.dim} />
                        </Pressable>
                    </>
                ) : null}

                {b.flight ? (
                    <>
                        <Text style={st.sectionTitle}>Your Flight</Text>
                        <View style={st.flightCard}>
                            <Text style={st.flightRoute}>{b.flight.origin} – {b.flight.destination}</Text>
                            <Text style={st.flightMeta}>{b.flight.carrier} · {b.flight.departTime} – {b.flight.arriveTime} · {b.flight.departDate}</Text>
                            {b.flight.roundTrip ? (
                                <Text style={st.flightMeta}>{b.flight.returnOrigin} – {b.flight.returnDestination} · {b.flight.returnDepartTime} – {b.flight.returnArriveTime} · {b.flight.returnDate}</Text>
                            ) : null}
                        </View>
                    </>
                ) : null}

                <Text style={st.sectionTitle}>Your Booking</Text>
                <View style={{ marginTop: 4 }}>
                    <Row icon="calendar-outline" k="Dates" v={fmtRange(b.checkIn, b.checkOut)} />
                    <Row icon="person-outline" k="Guest" v={`${b.guests} Guests (${b.rooms} Room)`} />
                    {b.roomType ? <Row icon="bed-outline" k="Room type" v={b.roomType} /> : null}
                    <Row icon="call-outline" k="Phone" v={b.phone || '—'} />
                </View>

                <Barcode code={b.confirmationCode || ''} />
                <Text style={st.code}>{b.confirmationCode}</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    body: { paddingHorizontal: 20, paddingBottom: 40 },
    sectionTitle: { color: C.text, fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', marginTop: 18 },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    openMap: { color: C.cyan, fontSize: 12.5 },
    hotelCard: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    hotelImg: { width: 74, height: 74, borderRadius: 12 },
    hotelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    hotelName: { color: C.text, fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', flex: 1, marginRight: 8 },
    areaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    area: { color: C.sub, fontSize: 12 },
    nightly: { color: C.sub, fontSize: 12, marginTop: 5 },
    mapCard: {
        height: 110, borderRadius: 14, backgroundColor: C.card,
        alignItems: 'center', justifyContent: 'center', marginTop: 12,
    },
    flightCard: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginTop: 12 },
    flightRoute: { color: C.text, fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },
    flightMeta: { color: C.sub, fontSize: 12, marginTop: 5 },
    bRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
    bKey: { flexDirection: 'row', alignItems: 'center' },
    bKeyText: { color: C.sub, fontSize: 13 },
    bVal: { color: C.text, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', fontWeight: '600' },
    barcode: { flexDirection: 'row', alignSelf: 'center', marginTop: 28, alignItems: 'flex-end' },
    code: { color: C.sub, fontSize: 11, alignSelf: 'center', marginTop: 8, letterSpacing: 0.5 },
});
