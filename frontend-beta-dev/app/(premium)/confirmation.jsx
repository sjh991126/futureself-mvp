import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { C, Header, GradientButton } from './_theme';

export default function Confirmation() {
    const { bookingId } = useLocalSearchParams();
    return (
        <SafeAreaView style={st.safe} edges={['top']}>
            <Header title="Confirmation Page" />
            <View style={st.body}>
                {/* Phone-with-receipt illustration */}
                <View style={st.illus}>
                    <View style={st.phone}>
                        <View style={st.receiptLine} />
                        <View style={[st.receiptLine, { width: 46 }]} />
                        <View style={[st.receiptLine, { width: 58, backgroundColor: '#8EE3EF' }]} />
                    </View>
                    <View style={st.check}>
                        <Ionicons name="checkmark" size={22} color="#fff" />
                    </View>
                </View>

                <Text style={st.title}>Payment Complete</Text>
                <Text style={st.subtitle}>
                    Your booking is confirmed. A receipt has been saved to your trips.
                </Text>
            </View>
            <View style={st.footer}>
                <GradientButton title="View Booking"
                    onPress={() => router.replace({ pathname: '/(premium)/booking-detail', params: { id: bookingId } })} />
            </View>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    body: { flex: 1, alignItems: 'center', paddingTop: 70, paddingHorizontal: 36 },
    illus: { width: 150, height: 170, alignItems: 'center', justifyContent: 'center' },
    phone: {
        width: 104, height: 150, borderRadius: 18, backgroundColor: '#F2F3F5',
        paddingTop: 30, alignItems: 'center', gap: 8,
    },
    receiptLine: { width: 60, height: 8, borderRadius: 4, backgroundColor: '#C9CDD3' },
    check: {
        position: 'absolute', bottom: 8, left: 18, width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#34C759', alignItems: 'center', justifyContent: 'center',
        borderWidth: 3, borderColor: C.bg,
    },
    title: { color: C.text, fontSize: 21, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800', marginTop: 28 },
    subtitle: { color: C.sub, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 10 },
    footer: { padding: 20, paddingBottom: 30 },
});
