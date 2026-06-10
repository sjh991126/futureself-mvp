import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, Header, GradientButton } from './_theme';
import { addCard } from '../src/api/premium';

const formatCardNumber = (v) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');

const formatExpiry = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export default function AddCard() {
    const { total } = useLocalSearchParams();
    const [holder, setHolder] = useState('');
    const [number, setNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [busy, setBusy] = useState(false);

    const complete = holder.trim().length > 1
        && number.replace(/\s/g, '').length >= 15
        && expiry.length === 5
        && cvv.length >= 3;

    const submit = async () => {
        try {
            setBusy(true);
            await addCard({ holderName: holder.trim(), cardNumber: number, expiry, cvv });
            router.back(); // returns to Payment — list refreshes on focus
        } catch (e) {
            Alert.alert('Add Card', e?.response?.data?.message || 'Could not add this card.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <SafeAreaView style={st.safe} edges={['top']}>
            <Header title="Add New Card" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={st.body}>
                    <TextInput
                        style={st.input} placeholder="Card Holder Name" placeholderTextColor={C.dim}
                        value={holder} onChangeText={setHolder} autoCapitalize="characters" />
                    <TextInput
                        style={st.input} placeholder="Card Number" placeholderTextColor={C.dim}
                        value={number} onChangeText={(v) => setNumber(formatCardNumber(v))}
                        keyboardType="number-pad" maxLength={19} />
                    <View style={st.row}>
                        <TextInput
                            style={[st.input, { flex: 1, marginRight: 12 }]} placeholder="Expiry Date" placeholderTextColor={C.dim}
                            value={expiry} onChangeText={(v) => setExpiry(formatExpiry(v))}
                            keyboardType="number-pad" maxLength={5} />
                        <TextInput
                            style={[st.input, { flex: 1 }]} placeholder="CVV" placeholderTextColor={C.dim}
                            value={cvv} onChangeText={(v) => setCvv(v.replace(/\D/g, '').slice(0, 4))}
                            keyboardType="number-pad" secureTextEntry maxLength={4} />
                    </View>
                </View>

                <View style={st.footer}>
                    <View style={st.totalChipRow}>
                        <MaterialCommunityIcons name="contactless-payment" size={16} color="#fff" />
                        <View style={st.totalChip}><Text style={st.totalChipText}>HK$ {total || '—'}</Text></View>
                    </View>
                    <GradientButton title="Add Card" onPress={submit} disabled={!complete} loading={busy} />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    body: { paddingHorizontal: 20, paddingTop: 8, flex: 1 },
    input: {
        backgroundColor: C.input, borderRadius: 12, height: 50, paddingHorizontal: 16,
        color: C.text, fontSize: 14, marginBottom: 14,
    },
    row: { flexDirection: 'row' },
    footer: {
        backgroundColor: '#000', borderTopLeftRadius: 18, borderTopRightRadius: 18,
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
    },
    totalChipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    totalChip: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 5 },
    totalChipText: { color: '#0B0B0C', fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },
});
