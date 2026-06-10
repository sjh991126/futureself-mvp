import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, Header, GradientButton } from './_theme';

const durLong = (m) => m == null ? '' : `${Math.floor(m / 60)} hrs ${m % 60} mins`;
const money = (n) => Number(n).toLocaleString('en-US');

const LegCard = ({ tag, route, carrier, carryOn, t1, t2, d1, d2, nonStop, durMin }) => (
    <View style={lc.card}>
        <View style={lc.tag}><Text style={lc.tagText}>{tag}</Text></View>
        <Text style={lc.route}>{route}</Text>
        <View style={lc.carrierRow}>
            <MaterialCommunityIcons name="airplane" size={13} color={C.sub} />
            <Text style={lc.carrier}>  {carrier}</Text>
        </View>
        {carryOn ? (
            <View style={lc.carrierRow}>
                <MaterialCommunityIcons name="bag-carry-on" size={13} color={C.sub} />
                <Text style={lc.carrier}>  Free Carry-On</Text>
            </View>
        ) : null}
        <View style={lc.timesRow}>
            <View>
                <Text style={lc.time}>{t1}</Text>
                <Text style={lc.date}>{d1}</Text>
            </View>
            <View style={lc.flightPath}>
                <View style={lc.dot} />
                <View style={lc.line} />
                <MaterialCommunityIcons name="airplane" size={14} color={C.sub} />
                <View style={lc.line} />
                <View style={lc.dot} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={lc.time}>{t2}</Text>
                <Text style={lc.date}>{d2}</Text>
            </View>
        </View>
        <Text style={lc.footer}>{nonStop ? 'Non-stop' : '1 stop'}  ·  {durLong(durMin)}</Text>
    </View>
);

export default function FlightDetail() {
    const { flight, adults } = useLocalSearchParams();
    const f = useMemo(() => JSON.parse(flight), [flight]);

    return (
        <SafeAreaView style={st.safe} edges={['top']}>
            <Header title="Selected Flight Info" />
            <ScrollView contentContainerStyle={st.body} showsVerticalScrollIndicator={false}>
                <LegCard tag="Leaving"
                    route={`${f.origin} – ${f.destination}`} carrier={f.carrier} carryOn={f.freeCarryOn}
                    t1={f.departTime} t2={f.arriveTime} d1={f.departDate} d2={f.departDate}
                    nonStop={f.nonStop} durMin={f.outboundDurationMin} />
                {f.roundTrip ? (
                    <LegCard tag="Coming Back"
                        route={`${f.returnOrigin} – ${f.returnDestination}`} carrier={f.carrier} carryOn={f.freeCarryOn}
                        t1={f.returnDepartTime} t2={f.returnArriveTime} d1={f.returnDate} d2={f.returnDate}
                        nonStop={f.nonStop} durMin={f.inboundDurationMin} />
                ) : null}
            </ScrollView>

            <View style={st.bottomBar}>
                <View>
                    <Text style={st.priceLabel}>Price</Text>
                    <Text style={st.price}>{money(f.price)}{f.currency}</Text>
                </View>
                <GradientButton title="Book Now" style={{ width: 160 }}
                    onPress={() => router.push({
                        pathname: '/(premium)/request-to-book',
                        params: {
                            flightOptionId: f.id,
                            name: `${f.origin} – ${f.destination} · ${f.carrier}`,
                            area: f.roundTrip ? 'Round-trip' : 'One-way',
                            price: f.price, guests: adults || 1,
                        },
                    })} />
            </View>
        </SafeAreaView>
    );
}

const lc = StyleSheet.create({
    card: { backgroundColor: '#F5F6F8', borderRadius: 16, padding: 16, marginTop: 16 },
    tag: {
        alignSelf: 'flex-start', backgroundColor: '#5BA9F7', borderRadius: 10,
        paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10,
    },
    tagText: { color: '#fff', fontSize: 10.5, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },
    route: { color: '#0B0B0C', fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },
    carrierRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    carrier: { color: '#5B6068', fontSize: 12 },
    timesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
    time: { color: '#0B0B0C', fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },
    date: { color: '#8A8F96', fontSize: 11, marginTop: 3 },
    flightPath: { flexDirection: 'row', alignItems: 'center', flex: 1, marginHorizontal: 12 },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#B9BEC5' },
    line: { flex: 1, height: 1, backgroundColor: '#C9CDD3', marginHorizontal: 4 },
    footer: {
        color: '#5B6068', fontSize: 11.5, textAlign: 'center', marginTop: 14,
        borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D7DBE0', paddingTop: 10,
    },
});

const st = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    body: { paddingHorizontal: 20, paddingBottom: 120 },
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#101114', paddingHorizontal: 20, paddingVertical: 14,
        borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 28,
    },
    priceLabel: { color: C.sub, fontSize: 12 },
    price: { color: C.cyan, fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800', marginTop: 2 },
});
