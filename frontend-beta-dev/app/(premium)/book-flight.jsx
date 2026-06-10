import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, Modal, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { C, Header, GradientButton, DarkButton, Pill } from './_theme';
import { CalendarSheet, TravelersClassSheet } from './_sheets';

const AIRPORTS = [
    { code: 'HND', city: 'Tokyo', country: 'Japan' },
    { code: 'NRT', city: 'Tokyo', country: 'Japan' },
    { code: 'ICN', city: 'Seoul', country: 'South Korea' },
    { code: 'BKK', city: 'Bangkok', country: 'Thailand' },
    { code: 'DAD', city: 'Da Nang', country: 'Vietnam' },
    { code: 'TPE', city: 'Taipei', country: 'Taiwan' },
    { code: 'SIN', city: 'Singapore', country: 'Singapore' },
];

// "Flights at a Glance" — popular-route deal tiles per the design.
const GLANCE = [
    { city: 'Da Nang', country: 'Vietnam', price: '2,850', discount: 15, tag: 'CHEAPEST PRICE!', dates: 'Dec 8-10', img: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600' },
    { city: 'Tokyo', country: 'Japan', price: '3,250', discount: 13, tag: 'CHEAPEST PRICE!', dates: 'Feb 8-12', img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600' },
    { city: 'Bangkok', country: 'Thailand', price: '2,540', discount: 12, tag: null, dates: 'Jan 12-15', img: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600' },
    { city: 'Seoul', country: 'South Korea', price: '3,250', discount: 5, tag: null, dates: 'Mar 5-9', img: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=600' },
];

const DestinationSheet = ({ visible, onClose, onSelect }) => {
    const [q, setQ] = useState('');
    const matches = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return [];
        return AIRPORTS.filter(a =>
            a.code.toLowerCase().includes(t) || a.city.toLowerCase().includes(t) || a.country.toLowerCase().includes(t));
    }, [q]);

    // Group by country like the design ("Japan:  HND")
    const grouped = useMemo(() => {
        const g = {};
        matches.forEach(a => { (g[a.country] = g[a.country] || []).push(a); });
        return Object.entries(g);
    }, [matches]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={ds.full}>
                <View style={ds.headRow}>
                    <Pressable onPress={onClose} hitSlop={12}><Ionicons name="chevron-back" size={24} color={C.text} /></Pressable>
                    <Text style={ds.title}>Search destinations</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={ds.searchBox}>
                    <Ionicons name="location-outline" size={15} color="#0B0B0C" />
                    <TextInput
                        style={ds.input} placeholder="Select Location" placeholderTextColor="#7A7F86"
                        value={q} onChangeText={setQ} autoFocus autoCapitalize="characters" />
                </View>
                <ScrollView>
                    {grouped.map(([country, list]) => (
                        <View key={country}>
                            <Text style={ds.group}>{country}:</Text>
                            {list.map((a) => (
                                <Pressable key={a.code} style={ds.row}
                                    onPress={() => { onSelect(a); onClose(); setQ(''); }}>
                                    <Text style={ds.rowText}>{a.code}</Text>
                                </Pressable>
                            ))}
                        </View>
                    ))}
                </ScrollView>
            </View>
        </Modal>
    );
};

const fmtRange = (s, e) => {
    if (!s || !e) return null;
    const f = (d) => `${parseInt(d.slice(5, 7), 10)}/${parseInt(d.slice(8, 10), 10)}`;
    return `${f(s)} - ${f(e)}`;
};

export default function BookFlight() {
    const [roundTrip, setRoundTrip] = useState(true);
    const [dest, setDest] = useState(null);     // {code, city, country}
    const [dates, setDates] = useState(null);
    const [trav, setTrav] = useState(null);     // {adults, children, cabins}
    const [sheet, setSheet] = useState(null);   // 'dest' | 'when' | 'trav'

    const dateLabel = fmtRange(dates?.start, dates?.end);
    const travLabel = trav
        ? `${trav.adults + trav.children} Travelers, ${trav.cabins[0]}`
        : null;
    const ready = !!dest;

    const reset = () => { setDest(null); setDates(null); setTrav(null); setRoundTrip(true); };

    const confirm = () => router.push({
        pathname: '/(premium)/flight-results',
        params: {
            to: dest.code, city: dest.city, roundTrip: String(roundTrip),
            dateLabel: dateLabel || '8/2 - 8/5',
            adults: trav?.adults ?? 1,
            cabin: trav?.cabins?.[0] || 'Economy',
        },
    });

    return (
        <SafeAreaView style={st.safe} edges={['top']}>
            <Header title="Book Flight" />
            <ScrollView contentContainerStyle={st.body} showsVerticalScrollIndicator={false}>
                <View style={st.toggleRow}>
                    <Pill label="Round-trip" active={roundTrip} onPress={() => setRoundTrip(true)} />
                    <Pill label="One-way" active={!roundTrip} onPress={() => setRoundTrip(false)} style={{ marginLeft: 8 }} />
                </View>

                <View style={st.field}>
                    <MaterialCommunityIcons name="airplane-takeoff" size={16} color={C.text} />
                    <Text style={st.fieldText}>  HKG</Text>
                </View>
                <Pressable style={st.field} onPress={() => setSheet('dest')}>
                    <MaterialCommunityIcons name="airplane-landing" size={16} color={dest ? C.text : C.dim} />
                    <Text style={[st.fieldText, !dest && { color: C.dim }]}>  {dest ? dest.code : 'Flying to'}</Text>
                </Pressable>
                <View style={st.row2}>
                    <Pressable style={[st.field, { flex: 1, marginRight: 10, marginTop: 0 }]} onPress={() => setSheet('when')}>
                        <Ionicons name="calendar-outline" size={15} color={dateLabel ? C.text : C.dim} />
                        <Text style={[st.fieldText, !dateLabel && { color: C.dim }]}>  {dateLabel || 'When'}</Text>
                    </Pressable>
                    <Pressable style={[st.field, { flex: 1.3, marginTop: 0 }]} onPress={() => setSheet('trav')}>
                        <Ionicons name="person-outline" size={15} color={travLabel ? C.text : C.dim} />
                        <Text style={[st.fieldText, !travLabel && { color: C.dim }]} numberOfLines={1}>  {travLabel || 'Travelers, Economy'}</Text>
                    </Pressable>
                </View>

                {/* Flights at a Glance */}
                <View style={st.glanceHead}>
                    <Text style={st.glanceTitle}>Flights at a Glance</Text>
                    <Text style={st.glanceSub}>Popular Routes</Text>
                </View>
                <View style={st.grid}>
                    {GLANCE.map((g) => (
                        <Pressable key={g.city} style={st.tile}
                            onPress={() => {
                                const a = AIRPORTS.find(x => x.city === g.city);
                                if (a) setDest(a);
                            }}>
                            <Image source={{ uri: g.img }} style={st.tileImg} />
                            <View style={st.tileDiscount}><Text style={st.tileDiscountText}>~ {g.discount}%</Text></View>
                            {g.tag ? <View style={st.tileTag}><Text style={st.tileTagText}>{g.tag}</Text></View> : null}
                            <Text style={st.tileCity}>{g.city}</Text>
                            <Text style={st.tileCountry}>{g.country}</Text>
                            <Text style={st.tilePrice}>{g.price} <Text style={st.tileUnit}>HKD</Text></Text>
                            <Text style={st.tileDates}>{g.dates}</Text>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>

            <View style={st.footer}>
                <DarkButton title="RESET" onPress={reset} style={{ flex: 1, marginRight: 10 }} />
                {ready
                    ? <GradientButton title="CONFIRM" onPress={confirm} style={{ flex: 1.4 }} />
                    : <DarkButton title="CONFIRM" onPress={() => setSheet('dest')} style={{ flex: 1.4 }} />}
            </View>

            <DestinationSheet visible={sheet === 'dest'} onClose={() => setSheet(null)} onSelect={setDest} />
            <CalendarSheet visible={sheet === 'when'} onClose={() => setSheet(null)}
                onSave={(d) => { if (d.mode === 'calendar') setDates(d); }}
                initialStart={dates?.start} initialEnd={dates?.end} />
            <TravelersClassSheet visible={sheet === 'trav'} onClose={() => setSheet(null)}
                onConfirm={setTrav} initial={trav} />
        </SafeAreaView>
    );
}

const ds = StyleSheet.create({
    full: { flex: 1, backgroundColor: C.bg, paddingTop: 54, paddingHorizontal: 20 },
    headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    title: { color: C.text, fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: 22, height: 42, paddingHorizontal: 14, marginBottom: 10, gap: 6,
    },
    input: { flex: 1, color: '#0B0B0C', fontSize: 14 },
    group: { color: C.dim, fontSize: 13, marginTop: 14, marginBottom: 2 },
    row: { paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    rowText: { color: C.text, fontSize: 15 },
});

const st = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    body: { paddingHorizontal: 20, paddingBottom: 110 },
    toggleRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 4, marginBottom: 16 },
    field: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: C.input,
        borderRadius: 10, paddingHorizontal: 14, height: 48, marginTop: 12,
    },
    fieldText: { color: C.text, fontSize: 14 },
    row2: { flexDirection: 'row', marginTop: 12 },
    glanceHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 26, marginBottom: 12 },
    glanceTitle: { color: C.text, fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    glanceSub: { color: C.dim, fontSize: 11.5 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    tile: { width: '48%', marginBottom: 16 },
    tileImg: { width: '100%', height: 96, borderRadius: 12 },
    tileDiscount: {
        position: 'absolute', top: 7, right: 7, backgroundColor: '#2BB673',
        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    },
    tileDiscountText: { color: '#fff', fontSize: 9.5, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },
    tileTag: {
        position: 'absolute', top: 74, left: 7, backgroundColor: '#E2574C',
        borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2,
    },
    tileTagText: { color: '#fff', fontSize: 8, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800', letterSpacing: 0.3 },
    tileCity: { color: C.text, fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', marginTop: 8 },
    tileCountry: { color: C.sub, fontSize: 11, marginTop: 1 },
    tilePrice: { color: C.text, fontSize: 13.5, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800', marginTop: 4 },
    tileUnit: { color: C.sub, fontSize: 10.5, fontWeight: '400' },
    tileDates: { color: C.dim, fontSize: 10.5, marginTop: 2 },
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row',
        padding: 20, paddingBottom: 30, backgroundColor: C.bg,
    },
});
