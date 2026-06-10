import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C, Header, GradientButton, Stars } from './_theme';
import { getBooking, confirmBooking } from '../src/api/premium';

const fmtRange = (a, b) => {
    if (!a || !b) return '—';
    const d = (x) => +x.slice(8, 10);
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+a.slice(5, 7) - 1];
    return `${d(a)} - ${d(b)} ${mon} ${a.slice(0, 4)}`;
};

export default function Checkout() {
    const p = useLocalSearchParams(); // bookingId, name, area, imageUrl, rating, price, paymentLabel
    const [b, setB] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => { getBooking(p.bookingId).then(setB).catch(() => {}); }, [p.bookingId]);

    const confirm = async () => {
        try {
            setBusy(true);
            const done = await confirmBooking({ bookingId: Number(p.bookingId), paymentLabel: p.paymentLabel });
            router.replace({ pathname: '/(premium)/confirmation', params: { bookingId: done.id } });
        } catch (e) {
            Alert.alert('Checkout', e?.response?.data?.message || 'Payment failed. Please try again.');
        } finally {
            setBusy(false);
        }
    };

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
            <Header title="Checkout" />
            <ScrollView contentContainerStyle={st.body} showsVerticalScrollIndicator={false}>
                {/* Hotel summary */}
                <View style={st.hotelCard}>
                    {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={st.hotelImg} /> : null}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={st.hotelHead}>
                            <Text style={st.hotelName} numberOfLines={1}>{p.name}</Text>
                            {p.rating ? <Stars rating={p.rating} /> : null}
                        </View>
                        <View style={st.areaRow}>
                            <Ionicons name="location-outline" size={12} color={C.sub} />
                            <Text style={st.area}> {p.area}</Text>
                        </View>
                        <Text style={st.nightly}>
                            <Text style={{ color: C.cyan, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' }}>${p.price}</Text> /night
                        </Text>
                    </View>
                </View>

                {/* Your Booking */}
                <View style={st.card}>
                    <Text style={st.cardTitle}>Your Booking</Text>
                    <Row icon="calendar-outline" k="Dates" v={fmtRange(b?.checkIn, b?.checkOut)} />
                    <Row icon="person-outline" k="Guest" v={`${b?.guests ?? '—'} Guests (${b?.rooms ?? 1} Room)`} />
                    <Row icon="bed-outline" k="Room type" v={b?.roomType || '—'} />
                    <Row icon="call-outline" k="Phone" v={b?.phone || '—'} />
                </View>

                {/* Price Details */}
                <View style={st.card}>
                    <Text style={st.cardTitle}>Price Details</Text>
                    <View style={st.pRow}><Text style={st.pKey}>Price</Text><Text style={st.pVal}>${b ? b.basePrice + b.cleaningFee + b.serviceFee : '—'}</Text></View>
                    <View style={st.pRow}><Text style={st.pKey}>Admin fee</Text><Text style={st.pVal}>$10</Text></View>
                    <View style={[st.pRow, st.pTotalRow]}>
                        <Text style={st.pTotalKey}>Total price</Text>
                        <Text style={st.pTotalVal}>${b ? b.basePrice + b.cleaningFee + b.serviceFee + 10 : '—'}</Text>
                    </View>
                </View>
            </ScrollView>

            <View style={st.footer}>
                <GradientButton title="Confirm" onPress={confirm} loading={busy} disabled={!b} />
            </View>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    body: { paddingHorizontal: 20, paddingBottom: 120 },
    hotelCard: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    hotelImg: { width: 74, height: 74, borderRadius: 12 },
    hotelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    hotelName: { color: C.text, fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', flex: 1, marginRight: 8 },
    areaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    area: { color: C.sub, fontSize: 12 },
    nightly: { color: C.sub, fontSize: 12, marginTop: 5 },
    card: {
        borderWidth: 1, borderColor: C.border, borderRadius: 14,
        padding: 16, marginTop: 18, backgroundColor: '#0E0F12',
    },
    cardTitle: { color: '#4CD08A', fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', marginBottom: 12 },
    bRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    bKey: { flexDirection: 'row', alignItems: 'center' },
    bKeyText: { color: C.sub, fontSize: 13 },
    bVal: { color: C.text, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', fontWeight: '600' },
    pRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    pKey: { color: C.sub, fontSize: 13 },
    pVal: { color: C.text, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', fontWeight: '600' },
    pTotalRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, marginTop: 6, paddingTop: 12 },
    pTotalKey: { color: C.text, fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    pTotalVal: { color: C.text, fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 30, backgroundColor: C.bg },
});
