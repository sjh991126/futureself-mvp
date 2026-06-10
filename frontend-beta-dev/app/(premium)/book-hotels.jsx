import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { C, Header, Field, GradientButton, DarkButton, Stars } from './_theme';
import { LocationSheet, CalendarSheet, GuestsSheet } from './_sheets';
import { getHotelDeals } from '../src/api/premium';

const TREND = [610, 580, 520, 615, 480, 425, 460, 390]; // Recent Trends bars

const fmtRange = (s, e) => {
    if (!s || !e) return null;
    const f = (d) => `${parseInt(d.slice(5, 7), 10)}/${parseInt(d.slice(8, 10), 10)}`;
    return `${f(s)} - ${f(e)}`;
};

export default function BookHotels() {
    const [where, setWhere] = useState(null);
    const [dates, setDates] = useState(null);     // {start, end} | flexible
    const [guests, setGuests] = useState(null);   // {rooms, adults, children}
    const [sheet, setSheet] = useState(null);     // 'where' | 'when' | 'guests'
    const [deals, setDeals] = useState([]);

    useEffect(() => { getHotelDeals().then(setDeals).catch(() => {}); }, []);

    const dateLabel = dates?.mode === 'flexible'
        ? (dates.months?.map(m => m.split(' ')[0]).join(', ') || 'Flexible')
        : fmtRange(dates?.start, dates?.end);
    const guestLabel = guests ? `${guests.rooms} Room · ${guests.adults + guests.children} Travelers` : null;
    const ready = !!where;

    const search = () => router.push({
        pathname: '/(premium)/hotel-results',
        params: {
            area: where,
            start: dates?.start || '', end: dates?.end || '',
            guests: guests ? guests.adults + guests.children : 2,
            rooms: guests?.rooms || 1,
            dateLabel: dateLabel || '',
        },
    });

    return (
        <SafeAreaView style={st.safe} edges={['top']}>
            <Header title="Book Hotels" />
            <ScrollView contentContainerStyle={st.body} showsVerticalScrollIndicator={false}>
                <Text style={st.label}>Where</Text>
                <Field value={where} placeholder="City you're visiting" onPress={() => setSheet('where')} />

                <Text style={st.label}>Info</Text>
                <View style={st.infoRow}>
                    <Field icon="calendar-outline" value={dateLabel} placeholder="When"
                        onPress={() => setSheet('when')} style={{ flex: 1, marginRight: 10 }} />
                    <Field icon="bed-outline" value={guestLabel} placeholder="Rooms · Travelers"
                        onPress={() => setSheet('guests')} style={{ flex: 1.2 }} />
                </View>

                {ready
                    ? <GradientButton title="SEARCH HOTELS" onPress={search} style={{ marginTop: 18 }} />
                    : <DarkButton title="SEARCH HOTELS" onPress={() => setSheet('where')} style={{ marginTop: 18 }} />}

                {/* Recent Trends */}
                <View style={st.trendCard}>
                    <View style={st.trendHead}>
                        <Text style={st.trendTitle}>Recent Trends</Text>
                        <Text style={st.trendSub}>Last 7 days</Text>
                    </View>
                    <View style={st.trendBars}>
                        {TREND.map((v, i) => (
                            <View key={i} style={st.barCol}>
                                <Text style={st.barVal}>{v}</Text>
                                <View style={[st.bar, { height: (v / 650) * 70 }]} />
                                <Text style={st.barDay}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', ''][i] || ''}</Text>
                            </View>
                        ))}
                    </View>
                    <Text style={st.trendGreen}>▾ 18% cheaper this week</Text>
                </View>

                {/* Best Deals */}
                <Text style={st.sectionTitle}>Best Deals</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {deals.map((d) => (
                        <Pressable key={d.id} style={st.dealCard}
                            onPress={() => router.push({ pathname: '/(premium)/hotel-detail', params: { id: d.id } })}>
                            <View>
                                <Image source={{ uri: d.imageUrl }} style={st.dealImg} />
                                {d.discountPercent ? (
                                    <View style={st.discountTag}><Text style={st.discountText}>~ {d.discountPercent}%</Text></View>
                                ) : null}
                                {d.dealBadge ? (
                                    <View style={st.badge}><Text style={st.badgeText}>{d.dealBadge}</Text></View>
                                ) : null}
                            </View>
                            <Text style={st.dealName} numberOfLines={1}>{d.area.split(',')[0]}</Text>
                            <Text style={st.dealCountry}>{d.area.split(',')[1]?.trim()}</Text>
                            <View style={st.dealPriceRow}>
                                <Text style={st.dealPrice}>{d.pricePerNight} <Text style={st.dealUnit}>{d.currency}/night</Text></Text>
                            </View>
                            <Stars rating={d.rating} />
                        </Pressable>
                    ))}
                </ScrollView>
            </ScrollView>

            <LocationSheet visible={sheet === 'where'} onClose={() => setSheet(null)} onSelect={setWhere} />
            <CalendarSheet visible={sheet === 'when'} onClose={() => setSheet(null)}
                onSave={setDates} initialStart={dates?.start} initialEnd={dates?.end} />
            <GuestsSheet visible={sheet === 'guests'} onClose={() => setSheet(null)}
                onConfirm={setGuests} initial={guests} />
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    body: { paddingHorizontal: 20, paddingBottom: 40 },
    label: { color: C.sub, fontSize: 13, marginTop: 18, marginBottom: 8 },
    infoRow: { flexDirection: 'row' },
    trendCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginTop: 22 },
    trendHead: { flexDirection: 'row', justifyContent: 'space-between' },
    trendTitle: { color: C.text, fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    trendSub: { color: C.dim, fontSize: 11.5 },
    trendBars: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, alignItems: 'flex-end' },
    barCol: { alignItems: 'center', width: 32 },
    barVal: { color: C.dim, fontSize: 8.5, marginBottom: 3 },
    bar: { width: 16, borderRadius: 4, backgroundColor: '#2E3340' },
    barDay: { color: C.dim, fontSize: 9, marginTop: 4 },
    trendGreen: { color: '#4CD08A', fontSize: 11.5, marginTop: 10 },
    sectionTitle: { color: C.text, fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', marginTop: 24, marginBottom: 12 },
    dealCard: { width: 150, marginRight: 14 },
    dealImg: { width: 150, height: 104, borderRadius: 12 },
    discountTag: {
        position: 'absolute', top: 8, right: 8, backgroundColor: '#2BB673',
        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    },
    discountText: { color: '#fff', fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },
    badge: {
        position: 'absolute', bottom: 8, left: 8, backgroundColor: '#E2574C',
        borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
    },
    badgeText: { color: '#fff', fontSize: 9, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800', letterSpacing: 0.4 },
    dealName: { color: C.text, fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', marginTop: 8 },
    dealCountry: { color: C.sub, fontSize: 11.5, marginTop: 1 },
    dealPriceRow: { marginTop: 4, marginBottom: 3 },
    dealPrice: { color: C.text, fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },
    dealUnit: { color: C.sub, fontSize: 11, fontWeight: '400' },
});
