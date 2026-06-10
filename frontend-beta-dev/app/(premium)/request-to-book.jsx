import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C, Header, GradientButton, Stepper } from './_theme';
import { CalendarSheet } from './_sheets';
import { quoteBooking, createBooking } from '../src/api/premium';
import { paymentSelection } from './_paymentBridge';

const fmt = (d) => {
    if (!d) return null;
    const [y, m, dd] = d.split('-');
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1];
    return `${mon} ${+dd}, ${y}`;
};

export default function RequestToBook() {
    const p = useLocalSearchParams(); // hotelId | flightOptionId, name, price, ...
    const isFlight = !!p.flightOptionId;

    const [checkIn, setCheckIn] = useState(p.start || null);
    const [checkOut, setCheckOut] = useState(p.end || null);
    const [guest, setGuest] = useState(Number(p.guests) || 1);
    const [payment, setPayment] = useState(null); // {label, brand, last4}
    const [quote, setQuote] = useState(null);
    const [cal, setCal] = useState(false);
    const [busy, setBusy] = useState(false);

    const payload = {
        hotelId: p.hotelId ? Number(p.hotelId) : null,
        flightOptionId: p.flightOptionId ? Number(p.flightOptionId) : null,
        checkIn, checkOut, guests: guest, rooms: Number(p.rooms) || 1,
    };

    useEffect(() => {
        if (isFlight || (checkIn && checkOut)) {
            quoteBooking(payload).then(setQuote).catch(() => setQuote(null));
        }
    }, [checkIn, checkOut, guest]);

    const checkout = async () => {
        if (!payment) { Alert.alert('Pay With', 'Please choose a payment method first.'); return; }
        try {
            setBusy(true);
            const booking = await createBooking({ ...payload, phone: '123-456-7890' });
            router.push({
                pathname: '/(premium)/checkout',
                params: {
                    bookingId: booking.id,
                    name: p.name, area: p.area, imageUrl: p.imageUrl || '', rating: p.rating || '',
                    price: p.price, paymentLabel: payment.label,
                },
            });
        } catch (e) {
            Alert.alert('Booking failed', e?.response?.data?.message || 'Please try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <SafeAreaView style={st.safe} edges={['top']}>
            <Header title="Request to book" />
            <ScrollView contentContainerStyle={st.body} showsVerticalScrollIndicator={false}>
                <Text style={st.label}>Date</Text>
                <View style={st.dateRow}>
                    <Pressable style={[st.dateBox, { marginRight: 10 }]} onPress={() => setCal(true)}>
                        <View style={st.dateHead}><Ionicons name="calendar-outline" size={13} color={C.sub} /><Text style={st.dateLabel}>  Check - In</Text></View>
                        <Text style={[st.dateVal, !checkIn && { color: C.dim }]}>{fmt(checkIn) || 'Select'}</Text>
                    </Pressable>
                    <Pressable style={st.dateBox} onPress={() => setCal(true)}>
                        <View style={st.dateHead}><Ionicons name="calendar-outline" size={13} color={C.sub} /><Text style={st.dateLabel}>  Check - Out</Text></View>
                        <Text style={[st.dateVal, !checkOut && { color: C.dim }]}>{fmt(checkOut) || 'Select'}</Text>
                    </Pressable>
                </View>

                <View style={st.guestRow}>
                    <Text style={st.label}>Guest</Text>
                    <Stepper value={guest} onChange={setGuest} min={1} />
                </View>

                <Text style={st.label}>Pay With</Text>
                <View style={st.payRow}>
                    <View style={st.payLeft}>
                        <View style={st.payIcon}><Ionicons name="card-outline" size={16} color={C.text} /></View>
                        <View style={{ marginLeft: 10 }}>
                            <Text style={st.payName}>{payment ? payment.label.split(' *')[0] : 'Credit Card'}</Text>
                            {payment?.last4 ? <Text style={st.payLast4}>******{payment.last4}</Text> : null}
                        </View>
                    </View>
                    <Pressable style={st.addPill}
                        onPress={() => router.push({ pathname: '/(premium)/payment-method', params: { total: quote?.totalPayment || p.price } })}>
                        <Text style={st.addPillText}>{payment ? 'Edit' : 'Add'}</Text>
                    </Pressable>
                </View>

                <Text style={st.label}>Payment Details</Text>
                <View style={st.detailRow}>
                    <Text style={st.detailKey}>Total : {quote?.nights || 1} Night</Text>
                    <Text style={st.detailVal}>${quote?.basePrice ?? '-'}</Text>
                </View>
                <View style={st.detailRow}>
                    <Text style={st.detailKey}>Cleaning Fee</Text>
                    <Text style={st.detailVal}>${quote?.cleaningFee ?? 5}</Text>
                </View>
                <View style={st.detailRow}>
                    <Text style={st.detailKey}>Service Fee</Text>
                    <Text style={st.detailVal}>${quote?.serviceFee ?? 5}</Text>
                </View>
                <View style={st.totalRow}>
                    <Text style={st.totalKey}>Total Payment:</Text>
                    <Text style={st.totalVal}>${quote?.totalPayment ?? '-'}</Text>
                </View>
            </ScrollView>

            <View style={st.footer}>
                <GradientButton title="Checkout" onPress={checkout} loading={busy}
                    disabled={!quote || (!isFlight && !(checkIn && checkOut))} />
            </View>

            <CalendarSheet visible={cal} onClose={() => setCal(false)}
                initialStart={checkIn} initialEnd={checkOut}
                onSave={(d) => { if (d.mode === 'calendar') { setCheckIn(d.start); setCheckOut(d.end); } }} />
            <PaymentReturnListener onPick={setPayment} />
        </SafeAreaView>
    );
}

// Picks up the method chosen on /payment-method via a tiny module-level bridge.
function PaymentReturnListener({ onPick }) {
    useFocusEffect(React.useCallback(() => {
        if (paymentSelection.value) {
            onPick(paymentSelection.value);
            paymentSelection.value = null;
        }
    }, []));
    return null;
}

const st = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    body: { paddingHorizontal: 20, paddingBottom: 120 },
    label: { color: C.text, fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', marginTop: 20, marginBottom: 10 },
    dateRow: { flexDirection: 'row' },
    dateBox: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12 },
    dateHead: { flexDirection: 'row', alignItems: 'center' },
    dateLabel: { color: C.sub, fontSize: 11.5 },
    dateVal: { color: C.text, fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', fontWeight: '600', marginTop: 6 },
    guestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    payRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: C.card, borderRadius: 12, padding: 12,
    },
    payLeft: { flexDirection: 'row', alignItems: 'center' },
    payIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#26272B', alignItems: 'center', justifyContent: 'center' },
    payName: { color: C.text, fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', fontWeight: '600' },
    payLast4: { color: C.sub, fontSize: 11, marginTop: 1 },
    addPill: { backgroundColor: '#CCD1DA', borderRadius: 17, paddingHorizontal: 16, paddingVertical: 7 },
    addPillText: { color: '#81D8D0', fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', fontWeight: '600' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
    detailKey: { color: C.dim, fontSize: 13 },
    detailVal: { color: C.dim, fontSize: 13 },
    totalRow: {
        flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border,
    },
    totalKey: { color: C.text, fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    totalVal: { color: C.text, fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 30, backgroundColor: C.bg },
});
