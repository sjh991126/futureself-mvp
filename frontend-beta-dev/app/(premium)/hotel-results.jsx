import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C, Header } from './_theme';
import { searchHotels } from '../src/api/premium';

export default function HotelResults() {
    const { area, start, end, guests, rooms, dateLabel } = useLocalSearchParams();
    const [hotels, setHotels] = useState(null);

    useEffect(() => {
        searchHotels({ area }).then(setHotels).catch(() => setHotels([]));
    }, [area]);

    const renderItem = ({ item }) => (
        <Pressable style={st.card}
            onPress={() => router.push({
                pathname: '/(premium)/hotel-detail',
                params: { id: item.id, start: start || '', end: end || '', guests: guests || 2, rooms: rooms || 1 },
            })}>
            <View>
                <Image source={{ uri: item.imageUrl }} style={st.img} />
                <View style={st.ratingTag}>
                    <Ionicons name="star" size={11} color="#F5C84B" />
                    <Text style={st.ratingText}>{item.rating.toFixed(1)}</Text>
                </View>
            </View>
            <View style={st.cardBody}>
                <View style={{ flex: 1 }}>
                    <Text style={st.name}>{item.name}</Text>
                    <Text style={st.area}>{item.area}</Text>
                    <View style={st.metaRow}>
                        <Ionicons name="bed-outline" size={13} color={C.sub} />
                        <Text style={st.meta}> {item.beds} bed   </Text>
                        <Ionicons name="water-outline" size={13} color={C.sub} />
                        <Text style={st.meta}> {item.bathrooms} bathroom</Text>
                    </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={st.price}>${item.pricePerNight}</Text>
                    <Text style={st.perNight}>Per Night</Text>
                </View>
            </View>
        </Pressable>
    );

    return (
        <SafeAreaView style={st.safe} edges={['top']}>
            <Header title="Search" />
            <View style={st.searchBar}>
                <Ionicons name="search" size={15} color="#7A7F86" />
                <Text style={st.searchText}>Search</Text>
                <Ionicons name="options-outline" size={16} color="#0B0B0C" style={st.filterIcon} />
            </View>
            <View style={st.chipRow}>
                <View style={st.chip}><Ionicons name="location-outline" size={12} color={C.text} /><Text style={st.chipText}> {area}</Text></View>
                {dateLabel ? <View style={st.chip}><Ionicons name="calendar-outline" size={12} color={C.text} /><Text style={st.chipText}> {dateLabel}</Text></View> : null}
                <View style={st.chip}><Ionicons name="person-outline" size={12} color={C.text} /><Text style={st.chipText}> {guests || 2}</Text></View>
            </View>
            {hotels === null
                ? <ActivityIndicator color={C.cyan} style={{ marginTop: 40 }} />
                : (
                    <FlatList
                        data={hotels}
                        keyExtractor={(h) => String(h.id)}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
                        ListEmptyComponent={<Text style={st.empty}>No hotels in {area} yet.</Text>}
                    />
                )}
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        marginHorizontal: 20, borderRadius: 22, height: 42, paddingHorizontal: 14,
    },
    searchText: { color: '#7A7F86', fontSize: 14, flex: 1, marginLeft: 6 },
    filterIcon: { backgroundColor: '#E8F6F9', borderRadius: 12, padding: 5, overflow: 'hidden' },
    chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 12, marginBottom: 6 },
    chip: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
        borderRadius: 16, paddingHorizontal: 12, height: 30,
    },
    chipText: { color: C.text, fontSize: 12 },
    card: { marginTop: 18 },
    img: { width: '100%', height: 190, borderRadius: 16 },
    ratingTag: {
        position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(20,21,24,0.85)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
    },
    ratingText: { color: '#fff', fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', marginLeft: 3 },
    cardBody: { flexDirection: 'row', marginTop: 10 },
    name: { color: C.text, fontSize: 15.5, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    area: { color: C.sub, fontSize: 12, marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    meta: { color: C.sub, fontSize: 12 },
    price: { color: C.cyan, fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },
    perNight: { color: C.sub, fontSize: 11, marginTop: 2 },
    empty: { color: C.sub, textAlign: 'center', marginTop: 50 },
});
