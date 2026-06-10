// Bottom-sheet modals used across the Premium flows (Modal-based, dependency-light).
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, FlatList, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { C, GradientButton, DarkButton, Stepper, Pill } from './_theme';

const Sheet = ({ visible, onClose, children, full }) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={st.backdrop} onPress={onClose} />
        <View style={[st.sheet, full && { height: '92%' }]}>
            <View style={st.grabber} />
            {children}
        </View>
    </Modal>
);

// ── Where → district list (matches "Search destinations" / location select) ──
const HK_ISLAND = ['Kennedy Town', 'Sheung Wan', 'Central', 'Admiralty', 'Eastern', 'Southern', 'Wanchai', 'Causeway Bay', 'North Point'];
const KOWLOON = ['Kowloon City', 'Kwun Tong', 'Sham Shui Po', 'Tsim Sha Tsui', 'Mong Kok'];

export const LocationSheet = ({ visible, onClose, onSelect }) => (
    <Sheet visible={visible} onClose={onClose} full>
        <View style={st.searchBox}>
            <Ionicons name="location-outline" size={16} color="#0B0B0C" />
            <Text style={st.searchPlaceholder}>Select Location</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={st.groupLabel}>Hong Kong Island:</Text>
            {HK_ISLAND.map((d) => (
                <Pressable key={d} style={st.row} onPress={() => { onSelect(d); onClose(); }}>
                    <Text style={st.rowText}>{d}</Text>
                </Pressable>
            ))}
            <Text style={st.groupLabel}>Kowloon:</Text>
            {KOWLOON.map((d) => (
                <Pressable key={d} style={st.row} onPress={() => { onSelect(d); onClose(); }}>
                    <Text style={st.rowText}>{d}</Text>
                </Pressable>
            ))}
        </ScrollView>
    </Sheet>
);

// ── When → Calendar | I'm flexible ───────────────────────────────────────
const MONTH_CHIPS = ['August 2025', 'September 2025', 'October 2025'];
const STAY_CHIPS = ['a weekend', 'the cheapest option'];
const NIGHT_CHIPS = ['1 night', '2 nights', '3 nights', '4 nights', '5 nights', '6 nights', '7 nights'];

export const CalendarSheet = ({ visible, onClose, onSave, initialStart, initialEnd }) => {
    const [mode, setMode] = useState('calendar'); // 'calendar' | 'flexible'
    const [start, setStart] = useState(initialStart || null);
    const [end, setEnd] = useState(initialEnd || null);
    const [months, setMonths] = useState([]);
    const [stay, setStay] = useState(null);
    const [nights, setNights] = useState(null);

    const onDay = (d) => {
        const ds = d.dateString;
        if (!start || (start && end)) { setStart(ds); setEnd(null); return; }
        if (ds < start) { setStart(ds); return; }
        setEnd(ds);
    };

    const marked = useMemo(() => {
        const m = {};
        if (start) m[start] = { startingDay: true, color: '#3D6BFF', textColor: '#fff' };
        if (start && end) {
            let cur = new Date(start);
            const last = new Date(end);
            while (cur < last) {
                cur.setDate(cur.getDate() + 1);
                const k = cur.toISOString().slice(0, 10);
                m[k] = k === end
                    ? { endingDay: true, color: '#3D6BFF', textColor: '#fff' }
                    : { color: '#21304F', textColor: '#fff' };
            }
        }
        return m;
    }, [start, end]);

    const reset = () => { setStart(null); setEnd(null); setMonths([]); setStay(null); setNights(null); };
    const save = () => {
        onSave(mode === 'calendar'
            ? { mode, start, end }
            : { mode, months, stay, nights });
        onClose();
    };

    return (
        <Sheet visible={visible} onClose={onClose} full>
            <View style={st.toggleRow}>
                <Pill label="Calendar" active={mode === 'calendar'} onPress={() => setMode('calendar')} />
                <Pill label="I'm flexible" active={mode === 'flexible'} onPress={() => setMode('flexible')} style={{ marginLeft: 8 }} />
            </View>

            {mode === 'calendar' ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Calendar
                        markingType="period"
                        markedDates={marked}
                        onDayPress={onDay}
                        firstDay={1}
                        hideExtraDays
                        theme={{
                            calendarBackground: 'transparent',
                            dayTextColor: C.text,
                            monthTextColor: C.text,
                            textSectionTitleColor: C.sub,
                            textDisabledColor: C.dim,
                            arrowColor: C.text,
                            todayTextColor: C.cyan,
                        }}
                    />
                </ScrollView>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={st.sectionLabel}>Months{months.length ? `: ${months.map(m => m.split(' ')[0]).join(', ')}` : ''}</Text>
                    <View style={st.chipWrap}>
                        {MONTH_CHIPS.map((m) => {
                            const on = months.includes(m);
                            return (
                                <Pressable key={m} onPress={() => setMonths(on ? months.filter(x => x !== m) : [...months, m])}
                                    style={[st.monthChip, on && { borderColor: C.cyan }]}>
                                    <Text style={st.monthChipTop}>{m.split(' ')[0]}</Text>
                                    <Text style={st.monthChipSub}>{m.split(' ')[1]}</Text>
                                </Pressable>
                            );
                        })}
                    </View>
                    <Text style={st.sectionLabel}>Stay length{stay ? `: ${stay}` : ''}</Text>
                    {stay === 'a weekend' && <Text style={st.hint}>Check in on Saturday and check out on Sunday</Text>}
                    <View style={st.chipWrap}>
                        {STAY_CHIPS.map((c) => (
                            <Pressable key={c} onPress={() => setStay(c)} style={[st.stayChip, stay === c && { borderColor: C.cyan }]}>
                                <Text style={st.stayChipText}>{c}</Text>
                            </Pressable>
                        ))}
                    </View>
                    {stay === 'the cheapest option' && (
                        <>
                            <Text style={st.sectionLabel}>Stay length (nights){nights ? `: ${nights.split(' ')[0]} night` : ''}</Text>
                            <View style={st.chipWrap}>
                                {NIGHT_CHIPS.map((n) => (
                                    <Pressable key={n} onPress={() => setNights(n)} style={[st.stayChip, nights === n && { borderColor: C.cyan }]}>
                                        <Text style={st.stayChipText}>{n}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </>
                    )}
                </ScrollView>
            )}

            <View style={st.footerRow}>
                <DarkButton title="RESET" onPress={reset} style={{ flex: 1, marginRight: 10 }} />
                <GradientButton title="SAVE" onPress={save} style={{ flex: 1.4 }}
                    disabled={mode === 'calendar' ? !(start && end) : months.length === 0} />
            </View>
        </Sheet>
    );
};

// ── Rooms & Travelers (hotels) ───────────────────────────────────────────
export const GuestsSheet = ({ visible, onClose, onConfirm, initial }) => {
    const [rooms, setRooms] = useState(initial?.rooms ?? 1);
    const [adults, setAdults] = useState(initial?.adults ?? 1);
    const [children, setChildren] = useState(initial?.children ?? 1);
    return (
        <Sheet visible={visible} onClose={onClose}>
            <Text style={st.sheetTitle}>Guests & Rooms</Text>
            {[['Rooms', rooms, setRooms, 1], ['Adults', adults, setAdults, 1], ['Children', children, setChildren, 0]].map(([label, v, set, min]) => (
                <View key={label} style={st.counterRow}>
                    <Text style={st.counterLabel}>{label}</Text>
                    <Stepper value={v} onChange={set} min={min} />
                </View>
            ))}
            <GradientButton title="CONFIRM" style={{ marginTop: 18 }}
                onPress={() => { onConfirm({ rooms, adults, children }); onClose(); }} />
        </Sheet>
    );
};

// ── Travelers & Seat Class (flights) ─────────────────────────────────────
const CABINS = ['Economy', 'Premium Economy', 'Business', 'First Class'];

export const TravelersClassSheet = ({ visible, onClose, onConfirm, initial }) => {
    const [adults, setAdults] = useState(initial?.adults ?? 1);
    const [children, setChildren] = useState(initial?.children ?? 1);
    const [cabins, setCabins] = useState(initial?.cabins ?? ['Economy']);
    const toggle = (c) => setCabins(cabins.includes(c) ? cabins.filter(x => x !== c) : [...cabins, c]);
    return (
        <Sheet visible={visible} onClose={onClose}>
            <Text style={st.sheetTitle}>Travelers & Seat Class</Text>
            {[['Adults', adults, setAdults], ['Children', children, setChildren]].map(([label, v, set]) => (
                <View key={label} style={st.counterRow}>
                    <Text style={st.counterLabel}>{label}</Text>
                    <Stepper value={v} onChange={set} min={0} />
                </View>
            ))}
            <View style={{ height: 1, backgroundColor: C.border, marginVertical: 14 }} />
            {CABINS.map((c) => (
                <View key={c} style={st.counterRow}>
                    <Text style={st.counterLabel}>{c}</Text>
                    <Switch value={cabins.includes(c)} onValueChange={() => toggle(c)}
                        trackColor={{ true: '#3D6BFF', false: '#2A2B30' }} thumbColor="#fff" />
                </View>
            ))}
            <GradientButton title="CONFIRM" style={{ marginTop: 18 }}
                disabled={cabins.length === 0}
                onPress={() => { onConfirm({ adults, children, cabins }); onClose(); }} />
        </Sheet>
    );
};

const st = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: {
        backgroundColor: '#101114', borderTopLeftRadius: 22, borderTopRightRadius: 22,
        paddingHorizontal: 20, paddingBottom: 28, paddingTop: 8, maxHeight: '92%',
    },
    grabber: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: '#3A3B40', marginBottom: 14 },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        borderRadius: 22, height: 42, paddingHorizontal: 14, marginBottom: 14, gap: 6,
    },
    searchPlaceholder: { color: '#7A7F86', fontSize: 14 },
    groupLabel: { color: C.dim, fontSize: 13, marginTop: 14, marginBottom: 4 },
    row: { paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    rowText: { color: C.text, fontSize: 15 },
    toggleRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 14 },
    sectionLabel: { color: C.text, fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', marginTop: 16, marginBottom: 10 },
    hint: { color: C.sub, fontSize: 12, marginBottom: 8 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    monthChip: {
        width: 86, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border,
        alignItems: 'center', backgroundColor: '#141518',
    },
    monthChipTop: { color: C.text, fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    monthChipSub: { color: C.sub, fontSize: 11, marginTop: 2 },
    stayChip: {
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, borderWidth: 1,
        borderColor: C.border, backgroundColor: '#141518',
    },
    stayChipText: { color: C.text, fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', fontWeight: '600' },
    footerRow: { flexDirection: 'row', marginTop: 16 },
    sheetTitle: { color: C.text, fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', marginBottom: 16 },
    counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    counterLabel: { color: C.text, fontSize: 15 },
});
