import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { C, Header, GradientButton, WhiteButton } from './_theme';
import { getCards } from '../src/api/premium';
import { paymentSelection } from './_paymentBridge';

// Wallet rows exactly as the design lists them (each "Balance $9.99").
const WALLETS = [
    { key: 'gpay', label: 'Google Pay', icon: <FontAwesome5 name="google-pay" size={22} color="#fff" /> },
    { key: 'paypal', label: 'Paypal', icon: <FontAwesome5 name="paypal" size={18} color="#fff" /> },
    { key: 'visa', label: 'Visa', icon: <FontAwesome5 name="cc-visa" size={18} color="#fff" /> },
    { key: 'apay', label: 'Apple Pay', icon: <FontAwesome5 name="apple-pay" size={24} color="#fff" /> },
];

const brandIcon = (brand) => {
    if (brand === 'Visa') return <FontAwesome5 name="cc-visa" size={18} color="#fff" />;
    if (brand === 'Mastercard') return <FontAwesome5 name="cc-mastercard" size={18} color="#fff" />;
    if (brand === 'Amex') return <FontAwesome5 name="cc-amex" size={18} color="#fff" />;
    return <MaterialCommunityIcons name="credit-card-outline" size={20} color="#fff" />;
};

export default function PaymentMethod() {
    const { total } = useLocalSearchParams();
    const [cards, setCards] = useState([]);
    const [picked, setPicked] = useState(null); // {label, brand, last4}

    const load = () => getCards().then(setCards).catch(() => {});
    useEffect(() => { load(); }, []);
    useFocusEffect(React.useCallback(() => { load(); }, []));

    const apply = () => {
        paymentSelection.value = picked;
        router.back();
    };

    const Row = ({ icon, label, sub, selected, onPress, dark }) => (
        <Pressable onPress={onPress} style={[st.row, selected && st.rowSelected, dark && { backgroundColor: '#101114' }]}>
            <View style={st.rowIcon}>{icon}</View>
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={st.rowLabel}>{label}</Text>
                <Text style={st.rowSub}>{sub}</Text>
            </View>
            <View style={[st.radio, selected && st.radioOn]}>
                {selected ? <View style={st.radioDot} /> : null}
            </View>
        </Pressable>
    );

    return (
        <SafeAreaView style={st.safe} edges={['top']}>
            <Header title="Payment" />
            <ScrollView contentContainerStyle={st.body} showsVerticalScrollIndicator={false}>
                <Text style={st.sectionTitle}>Payment Method</Text>

                {WALLETS.map((w) => (
                    <Row key={w.key} icon={w.icon} label={w.label} sub="Balance    $9.99"
                        selected={picked?.label === w.label}
                        onPress={() => setPicked({ label: w.label, brand: w.label, last4: null })} />
                ))}

                {cards.map((c) => (
                    <Row key={c.id} icon={brandIcon(c.brand)} label={c.brand} sub={`******${c.last4}`}
                        selected={picked?.last4 === c.last4 && picked?.brand === c.brand}
                        onPress={() => setPicked({ label: `${c.brand} ******${c.last4}`, brand: c.brand, last4: c.last4 })} />
                ))}

                <Pressable style={st.addCard}
                    onPress={() => router.push({ pathname: '/(premium)/add-card', params: { total: total || '' } })}>
                    <Text style={st.addCardText}>Add Card</Text>
                </Pressable>
            </ScrollView>

            <View style={st.footer}>
                <View style={st.totalChipRow}>
                    <MaterialCommunityIcons name="contactless-payment" size={16} color="#fff" />
                    <View style={st.totalChip}><Text style={st.totalChipText}>HK$ {total || '—'}</Text></View>
                </View>
                {picked
                    ? <GradientButton title="Apply" onPress={apply} />
                    : <WhiteButton title="Apply" disabled />}
            </View>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    body: { paddingHorizontal: 20, paddingBottom: 150 },
    sectionTitle: { color: C.text, fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', marginTop: 6, marginBottom: 14 },
    row: {
        flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border,
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12,
        backgroundColor: '#0E0F12',
    },
    rowSelected: { borderColor: C.cyan },
    rowIcon: { width: 44, alignItems: 'center' },
    rowLabel: { color: C.text, fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    rowSub: { color: C.sub, fontSize: 11.5, marginTop: 3 },
    radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#3A3B40', alignItems: 'center', justifyContent: 'center' },
    radioOn: { borderColor: C.cyan },
    radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.cyan },
    addCard: {
        backgroundColor: '#222327', borderRadius: 12, height: 46,
        alignItems: 'center', justifyContent: 'center', marginTop: 4,
    },
    addCardText: { color: C.sub, fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#000',
        borderTopLeftRadius: 18, borderTopRightRadius: 18,
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
    },
    totalChipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    totalChip: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 5 },
    totalChipText: { color: '#0B0B0C', fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },
});
