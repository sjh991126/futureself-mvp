import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { C } from './_theme';
import { searchFlights } from '../src/api/premium';

const TOKYO = ['HND', 'NRT'];
const dur = (m) => m == null ? '' : `${Math.floor(m / 60)}h ${m % 60}m`;
const money = (n) => n.toLocaleString('en-US');

const CARRIER_DOT = {
    jal: { bg: '#D8262C', label: 'JL' },
    cx: { bg: '#B91C1C', label: '✦' },
    br: { bg: '#0E7C7B', label: 'BR' },
};

const Logo = ({ k }) => {
    const c = CARRIER_DOT[k] || { bg: '#3A3B40', label: '✈' };
    return <View style={[st.logo, { backgroundColor: c.bg }]}><Text style={st.logoText}>{c.label}</Text></View>;
};

export default function FlightResults() {
    const { to, city, roundTrip, dateLabel, adults, cabin } = useLocalSearchParams();
    const [flights, setFlights] = useState(null);

    useEffect(() => {
        const rt = roundTrip !== 'false';
        const targets = TOKYO.includes(to) ? TOKYO : [to];
        Promise.all(targets.map((t) => searchFlights({ from: 'HKG', to: t, roundTrip: rt })))
            .then((lists) => setFlights(lists.flat().sort((a, b) => a.price - b.price)))
            .catch(() => setFlights([]));
    }, [to, roundTrip]);

    const Leg = ({ time1, time2, route, durMin, nonStop }) => (
        <View style={st.legRow}>
            <View style={{ flex: 1 }}>
                <Text style={st.legTime}>{time1} - {time2}</Text>
                <Text style={st.legRoute}>{route}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={st.legNon}>{nonStop ? 'Non-stop' : '1 stop'}</Text>
                <Text style={st.legDur}>{dur(durMin)}</Text>
            </View>
        </View>
    );

    const renderItem = ({ item }) => (
        <Pressable style={st.card}
            onPress={() => router.push({
                pathname: '/(premium)/flight-detail',
                params: { flight: JSON.stringify(item), adults: adults || 1 },
            })}>
            <View style={st.cardLeft}>
                <Logo k={item.carrierLogo} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Leg time1={item.departTime} time2={item.arriveTime}
                        route={`${item.origin} - ${item.destination}`}
                        durMin={item.outboundDurationMin} nonStop={item.nonStop} />
                    {item.roundTrip ? (
                        <Leg time1={item.returnDepartTime} time2={item.returnArriveTime}
                            route={`${item.returnOrigin} - ${item.returnDestination}`}
                            durMin={item.inboundDurationMin} nonStop={item.nonStop} />
                    ) : null}
                </View>
            </View>
            <View style={st.priceRow}>
                {item.cheapest ? <Text style={st.cheapTag}>Cheapest</Text> : null}
                {item.seatsLeft ? <Text style={st.seatTag}>{item.seatsLeft} Seat Left</Text> : null}
                <Text style={st.price}>{money(item.price)}{item.currency}</Text>
            </View>
        </Pressable>
    );

    return (
        <SafeAreaView style={st.safe} edges={['top']}>
            <View style={st.head}>
                <Pressable onPress={() => router.back()} hitSlop={12}>
                    <Ionicons name="chevron-back" size={24} color={C.text} />
                </Pressable>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={st.headTitle}>Hong Kong - {city || to}</Text>
                    <Text style={st.headSub}>{adults || 1} Adult, {cabin || 'Economy'}</Text>
                </View>
                <View style={{ width: 24 }} />
            </View>

            <View style={st.chipRow}>
                <View style={st.chip}><Ionicons name="location-outline" size={12} color={C.text} /><Text style={st.chipText}> {city || to}</Text></View>
                <View style={st.chip}><Ionicons name="calendar-outline" size={12} color={C.text} /><Text style={st.chipText}> {dateLabel}</Text></View>
                <View style={st.chip}><Ionicons name="person-outline" size={12} color={C.text} /><Text style={st.chipText}> {adults || 1}, {cabin || 'Economy'}</Text></View>
            </View>

            {flights === null
                ? <ActivityIndicator color={C.cyan} style={{ marginTop: 40 }} />
                : (
                    <FlatList
                        data={flights}
                        keyExtractor={(f) => String(f.id)}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
                        ListEmptyComponent={<Text style={st.empty}>No flights to {city || to} yet.</Text>}
                    />
                )}
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 56 },
    headTitle: { color: C.text, fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    headSub: { color: C.sub, fontSize: 11.5, marginTop: 2 },
    chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 6, marginBottom: 4 },
    chip: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
        borderRadius: 16, paddingHorizontal: 12, height: 30,
    },
    chipText: { color: C.text, fontSize: 12 },
    card: {
        backgroundColor: C.card, borderRadius: 14, padding: 14, marginTop: 14,
    },
    cardLeft: { flexDirection: 'row' },
    logo: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    logoText: { color: '#fff', fontSize: 9, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },
    legRow: { flexDirection: 'row', marginBottom: 10 },
    legTime: { color: C.text, fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    legRoute: { color: C.sub, fontSize: 11.5, marginTop: 2 },
    legNon: { color: C.sub, fontSize: 11.5 },
    legDur: { color: C.dim, fontSize: 11, marginTop: 2 },
    priceRow: {
        flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10,
        borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, paddingTop: 10, marginTop: 2,
    },
    cheapTag: { color: C.cyan, fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    seatTag: { color: '#FF6B6B', fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    price: { color: C.cyan, fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },
    empty: { color: C.sub, textAlign: 'center', marginTop: 50 },
});
