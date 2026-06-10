import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { C, GradientButton, Stars } from './_theme';
import { getHotelDetail } from '../src/api/premium';

const FACILITY_ICON = {
    'AC': 'air-conditioner', 'Restaurant': 'silverware-fork-knife', 'Swimming Pool': 'pool',
    '24-Hours Front Desk': 'desk', 'Free WiFi': 'wifi', 'Laundry': 'washing-machine',
    'TV': 'television', 'Breakfast': 'coffee', 'Gym': 'dumbbell',
};

export default function HotelDetail() {
    const { id, start, end, guests, rooms } = useLocalSearchParams();
    const [h, setH] = useState(null);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => { getHotelDetail(id).then(setH).catch(() => {}); }, [id]);

    if (!h) {
        return <SafeAreaView style={st.safe}><ActivityIndicator color={C.cyan} style={{ marginTop: 60 }} /></SafeAreaView>;
    }

    const openMap = () => Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${h.latitude},${h.longitude}`);

    return (
        <SafeAreaView style={st.safe} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
                <View>
                    <Image source={{ uri: h.imageUrl }} style={st.hero} />
                    <Pressable onPress={() => router.back()} style={st.backFab}>
                        <Ionicons name="chevron-back" size={22} color="#fff" />
                    </Pressable>
                    <Text style={st.heroTitle}>Detail</Text>
                </View>

                <View style={st.body}>
                    <Text style={st.name}>{h.name}</Text>
                    <View style={st.subRow}>
                        <Ionicons name="location-outline" size={13} color={C.cyan} />
                        <Text style={st.area}> {h.area}</Text>
                        <Ionicons name="star" size={13} color="#F5C84B" style={{ marginLeft: 10 }} />
                        <Text style={st.rating}> {h.rating.toFixed(1)}</Text>
                    </View>

                    <View style={st.sectionHead}>
                        <Text style={st.sectionTitle}>Common Facilities</Text>
                        <Pressable onPress={() => router.push({ pathname: '/(premium)/hotel-facilities', params: { id: h.id } })}>
                            <Text style={st.seeAll}>See All</Text>
                        </Pressable>
                    </View>
                    <View style={st.facilityRow}>
                        {h.facilities.slice(0, 4).map((f) => (
                            <View key={f} style={st.facility}>
                                <View style={st.facilityIcon}>
                                    <MaterialCommunityIcons name={FACILITY_ICON[f] || 'check'} size={20} color={C.text} />
                                </View>
                                <Text style={st.facilityText} numberOfLines={2}>{f}</Text>
                            </View>
                        ))}
                    </View>

                    <Text style={st.sectionTitle}>Description</Text>
                    <Text style={st.desc} numberOfLines={expanded ? undefined : 3}>
                        {h.description}
                        {' '}
                    </Text>
                    <Pressable onPress={() => setExpanded(!expanded)}>
                        <Text style={st.readMore}>{expanded ? 'Show Less' : '...Read More'}</Text>
                    </Pressable>

                    <View style={st.sectionHead}>
                        <Text style={st.sectionTitle}>Location</Text>
                        <Pressable onPress={openMap}><Text style={st.seeAll}>Open Map</Text></Pressable>
                    </View>
                    <Pressable onPress={openMap} style={st.mapCard}>
                        <Ionicons name="map" size={28} color={C.dim} />
                        <View style={st.addressRow}>
                            <Ionicons name="location" size={13} color={C.cyan} />
                            <Text style={st.address}> {h.address}</Text>
                        </View>
                    </Pressable>

                    <View style={st.sectionHead}>
                        <Text style={st.sectionTitle}>Reviews</Text>
                        <Pressable onPress={() => router.push({ pathname: '/(premium)/hotel-reviews', params: { id: h.id, rating: h.rating, count: h.reviewCount } })}>
                            <Text style={st.seeAll}>See All</Text>
                        </Pressable>
                    </View>
                    {h.topReviews.map((r) => (
                        <View key={r.id} style={st.review}>
                            <Image source={{ uri: r.avatarUrl }} style={st.avatar} />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <View style={st.reviewHead}>
                                    <Text style={st.reviewer}>{r.authorName}</Text>
                                    <Stars rating={r.rating} />
                                </View>
                                <Text style={st.reviewBody}>{r.content}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Price bar */}
            <View style={st.bottomBar}>
                <View>
                    <Text style={st.priceLabel}>Price</Text>
                    <Text style={st.price}>${h.pricePerNight}.00</Text>
                </View>
                <GradientButton title="Book Now" style={{ width: 160 }}
                    onPress={() => router.push({
                        pathname: '/(premium)/request-to-book',
                        params: { hotelId: h.id, name: h.name, area: h.area, price: h.pricePerNight, imageUrl: h.imageUrl, rating: h.rating, roomType: h.roomType, start: start || '', end: end || '', guests: guests || 1, rooms: rooms || 1 },
                    })} />
            </View>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    hero: { width: '100%', height: 300 },
    backFab: {
        position: 'absolute', top: 12, left: 14, width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
    },
    heroTitle: { position: 'absolute', top: 18, alignSelf: 'center', color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    body: { paddingHorizontal: 20, paddingTop: 18 },
    name: { color: C.text, fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },
    subRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    area: { color: C.sub, fontSize: 12.5 },
    rating: { color: C.text, fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 12 },
    sectionTitle: { color: C.text, fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', marginTop: 4 },
    seeAll: { color: C.cyan, fontSize: 12.5 },
    facilityRow: { flexDirection: 'row', justifyContent: 'space-between' },
    facility: { alignItems: 'center', width: 76 },
    facilityIcon: {
        width: 52, height: 52, borderRadius: 26, backgroundColor: C.card,
        alignItems: 'center', justifyContent: 'center', marginBottom: 6,
    },
    facilityText: { color: C.sub, fontSize: 10.5, textAlign: 'center' },
    desc: { color: C.sub, fontSize: 13, lineHeight: 20, marginTop: 8 },
    readMore: { color: C.cyan, fontSize: 12.5, marginTop: 4 },
    mapCard: {
        height: 120, borderRadius: 14, backgroundColor: C.card,
        alignItems: 'center', justifyContent: 'center',
    },
    addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    address: { color: C.sub, fontSize: 12 },
    review: { flexDirection: 'row', marginBottom: 16 },
    avatar: { width: 36, height: 36, borderRadius: 18 },
    reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reviewer: { color: C.text, fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    reviewBody: { color: C.sub, fontSize: 12, marginTop: 4, lineHeight: 17 },
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#101114', paddingHorizontal: 20, paddingVertical: 14,
        borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 28,
    },
    priceLabel: { color: C.sub, fontSize: 12 },
    price: { color: C.text, fontSize: 21, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800', marginTop: 2 },
});
