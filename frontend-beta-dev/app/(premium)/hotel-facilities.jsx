import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { C, Header } from './_theme';
import { getHotelDetail } from '../src/api/premium';

// "All Facilities" grouped accordion — groups mirror the Figma layout.
const GROUPS = [
    { name: 'Food and Drink', icon: 'silverware-fork-knife', items: ['A la carte dinner', 'A la carte lunch', 'Breakfast', 'Vegetarian meal'] },
    { name: 'Transportation', icon: 'bus', items: ['Airport transfer', 'Valet parking', 'Car rental', 'Shuttle service', 'Taxi service'] },
    { name: 'General', icon: 'home-city-outline', items: ['AC', 'Free WiFi', 'TV', 'Laundry', 'Elevator', 'Non-smoking rooms', 'Heating', 'Safe deposit box'] },
    { name: 'Hotel Service', icon: 'bell-outline', items: ['24-Hours Front Desk', 'Concierge'] },
    { name: 'Bussines Facilities', icon: 'briefcase-outline', items: ['Meeting rooms', 'Business center', 'Projector', 'Fax', 'Printing', 'Conference hall'] },
    { name: 'Nearby facilities', icon: 'map-marker-radius-outline', items: ['ATM', 'Pharmacy', 'Convenience store', 'Mall', 'Park', 'Hospital', 'Bank', 'Subway'] },
    { name: 'Kids', icon: 'baby-face-outline', items: ['Kids club', 'Babysitting', 'Playground'] },
    { name: 'Connectivity', icon: 'wifi', items: ['Free WiFi', 'High-speed internet', 'Internet services'] },
    { name: 'Public Facilities', icon: 'pool', items: ['Swimming Pool', 'Gym', 'Spa', 'Sauna', 'Garden', 'Terrace', 'Library', 'Lounge', 'Restaurant', 'Bar', 'Coffee shop', 'Salon', 'Souvenir shop', 'Smoking area', 'Prayer room', 'Parking'] },
];

export default function HotelFacilities() {
    const { id } = useLocalSearchParams();
    const [open, setOpen] = useState('Food and Drink');
    const [own, setOwn] = useState([]);

    useEffect(() => { getHotelDetail(id).then((h) => setOwn(h.facilities || [])).catch(() => {}); }, [id]);

    return (
        <SafeAreaView style={st.safe} edges={['top']}>
            <Header title="All Facilities" />
            <ScrollView contentContainerStyle={st.body} showsVerticalScrollIndicator={false}>
                {GROUPS.map((g) => {
                    const opened = open === g.name;
                    return (
                        <View key={g.name} style={st.group}>
                            <Pressable style={st.groupHead} onPress={() => setOpen(opened ? null : g.name)}>
                                <View style={st.groupLeft}>
                                    <MaterialCommunityIcons name={g.icon} size={18} color={C.text} />
                                    <Text style={st.groupName}>  {g.name} <Text style={st.groupCount}>({g.items.length} facilities)</Text></Text>
                                </View>
                                <Ionicons name={opened ? 'remove' : 'add'} size={18} color={C.sub} />
                            </Pressable>
                            {opened && g.items.map((it) => (
                                <View key={it} style={st.itemRow}>
                                    <Text style={[st.item, own.includes(it) && { color: C.cyan }]}>•  {it}</Text>
                                </View>
                            ))}
                        </View>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    body: { paddingHorizontal: 20, paddingBottom: 30 },
    group: { backgroundColor: C.card, borderRadius: 12, marginTop: 12, paddingHorizontal: 14, paddingVertical: 4 },
    groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    groupLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    groupName: { color: C.text, fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    groupCount: { color: C.dim, fontSize: 11.5, fontWeight: '400' },
    itemRow: { paddingBottom: 10, paddingLeft: 26 },
    item: { color: C.sub, fontSize: 12.5 },
});
