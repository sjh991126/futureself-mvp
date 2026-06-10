// Design tokens + shared UI for the Premium (Trippy Premium Figma) screens.
import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Tokens pulled from the "Trippy Premium" Figma file (28z9P68PMwjsrgw9ymN1Pr):
// bg #000000 · cards/inputs #25282D · sub #878787 · labels #66707A ·
// price/accent #81D8D0 · CTA "Blue Gradient Horizontal" #5468FF → #81D8D0 ·
// type: Plus Jakarta Sans.
export const C = {
    bg: '#000000',
    card: '#25282D',
    cardAlt: '#25282D',
    input: '#25282D',
    border: '#2F333A',
    text: '#FFFFFF',
    sub: '#878787',
    dim: '#66707A',
    cyan: '#81D8D0',
    gradient: ['#5468FF', '#81D8D0'],
    danger: '#FF5A5A',
    green: '#34C759',
};

export const F = {
    reg: 'PlusJakartaSans_400Regular',
    med: 'PlusJakartaSans_500Medium',
    semi: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
    extra: 'PlusJakartaSans_800ExtraBold',
};

export const GradientButton = ({ title, onPress, disabled, loading, style }) => (
    <Pressable onPress={onPress} disabled={disabled || loading} style={[{ opacity: disabled ? 0.4 : 1 }, style]}>
        <LinearGradient colors={C.gradient} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={s.gbtn}>
            {loading
                ? <ActivityIndicator color="#0B0B0C" />
                : <Text style={s.gbtnText}>{title}</Text>}
        </LinearGradient>
    </Pressable>
);

export const DarkButton = ({ title, onPress, style }) => (
    <Pressable onPress={onPress} style={[s.dbtn, style]}>
        <Text style={s.dbtnText}>{title}</Text>
    </Pressable>
);

export const WhiteButton = ({ title, onPress, disabled, style }) => (
    <Pressable onPress={onPress} disabled={disabled} style={[s.wbtn, { opacity: disabled ? 0.4 : 1 }, style]}>
        <Text style={s.wbtnText}>{title}</Text>
    </Pressable>
);

export const Header = ({ title, right, transparent }) => (
    <View style={[s.header, transparent && { backgroundColor: 'transparent' }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={s.headerTitle}>{title}</Text>
        <View style={s.backBtn}>{right || null}</View>
    </View>
);

export const Field = ({ label, value, placeholder, icon, onPress, style }) => (
    <Pressable onPress={onPress} style={[s.field, style]}>
        {icon ? <Ionicons name={icon} size={16} color={value ? C.text : C.dim} style={{ marginRight: 8 }} /> : null}
        <Text style={[s.fieldText, !value && { color: C.dim }]} numberOfLines={1}>
            {value || placeholder}
        </Text>
    </Pressable>
);

export const Stepper = ({ value, onChange, min = 0 }) => (
    <View style={s.stepperRow}>
        <Pressable onPress={() => onChange(Math.max(min, value - 1))} style={[s.stepBtn, { backgroundColor: '#3A3B40' }]}>
            <Ionicons name="remove" size={16} color={C.text} />
        </Pressable>
        <Text style={s.stepVal}>{value}</Text>
        <Pressable onPress={() => onChange(value + 1)} style={[s.stepBtn, { backgroundColor: '#3D6BFF' }]}>
            <Ionicons name="add" size={16} color={C.text} />
        </Pressable>
    </View>
);

export const Pill = ({ label, active, onPress, style }) => active ? (
    <Pressable onPress={onPress} style={style}>
        <LinearGradient colors={C.gradient} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={s.pill}>
            <Text style={[s.pillText, { color: '#0B0B0C', fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' }]}>{label}</Text>
        </LinearGradient>
    </Pressable>
) : (
    <Pressable onPress={onPress} style={[s.pill, s.pillIdle, style]}>
        <Text style={s.pillText}>{label}</Text>
    </Pressable>
);

export const Stars = ({ rating, size = 12 }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="star" size={size} color="#F5C84B" />
        <Text style={{ color: C.text, fontSize: size, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', marginLeft: 3 }}>
            {Number(rating).toFixed(1)}
        </Text>
    </View>
);

const s = StyleSheet.create({
    gbtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    gbtnText: { color: '#FFFFFF', fontSize: 15.5, fontFamily: 'Jost_600SemiBold', fontWeight: '600', letterSpacing: 0.3 },
    dbtn: {
        height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#141518', borderWidth: 1, borderColor: C.border,
    },
    dbtnText: { color: C.text, fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', letterSpacing: 0.5 },
    wbtn: { height: 50, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
    wbtnText: { color: '#0B0B0C', fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 52, backgroundColor: C.bg },
    backBtn: { width: 40, alignItems: 'flex-start' },
    headerTitle: { flex: 1, textAlign: 'center', color: C.text, fontSize: 18, fontFamily: 'Jost_600SemiBold', fontWeight: '600' },
    field: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: C.input,
        borderRadius: 10, paddingHorizontal: 14, height: 48,
    },
    fieldText: { color: C.text, fontSize: 14, flex: 1 },
    stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    stepBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    stepVal: { color: C.text, fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', minWidth: 18, textAlign: 'center' },
    pill: { paddingHorizontal: 16, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    pillIdle: { backgroundColor: '#222327' },
    pillText: { color: C.text, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', fontWeight: '600' },
});
