import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C, Header, Stars } from './_theme';
import { getHotelReviews } from '../src/api/premium';

const HISTO = [0.05, 0.06, 0.1, 0.24, 0.55]; // 1→5 distribution bars

export default function HotelReviews() {
    const { id, rating, count } = useLocalSearchParams();
    const [reviews, setReviews] = useState([]);

    useEffect(() => { getHotelReviews(id).then(setReviews).catch(() => {}); }, [id]);

    return (
        <SafeAreaView style={st.safe} edges={['top']}>
            <Header title="Reviews" right={<Ionicons name="funnel-outline" size={16} color={C.text} />} />
            <View style={st.summary}>
                <View>
                    <Text style={st.big}>{Number(rating || 4.4).toFixed(1)}</Text>
                    <View style={{ flexDirection: 'row', marginTop: 4 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Ionicons key={i} name="star" size={14}
                                color={i <= Math.round(rating || 4.4) ? '#F5C84B' : '#3A3B40'} />
                        ))}
                    </View>
                    <Text style={st.based}>Based on {count || reviews.length} review</Text>
                </View>
                <View style={st.histo}>
                    {[5, 4, 3, 2, 1].map((n, idx) => (
                        <View key={n} style={st.histoRow}>
                            <Text style={st.histoNum}>{6 - n + 0}</Text>
                            <View style={st.histoTrack}>
                                <View style={[st.histoFill, { width: `${HISTO[n - 1] * 100}%` }]} />
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            <Text style={st.listTitle}>Reviews ({count || reviews.length})</Text>
            <FlatList
                data={reviews}
                keyExtractor={(r) => String(r.id)}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
                renderItem={({ item }) => (
                    <View style={st.review}>
                        <Image source={{ uri: item.avatarUrl }} style={st.avatar} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <View style={st.reviewHead}>
                                <Text style={st.reviewer}>{item.authorName}</Text>
                                <Stars rating={item.rating} />
                            </View>
                            <Text style={st.reviewBody}>{item.content}</Text>
                        </View>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    summary: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 6, justifyContent: 'space-between' },
    big: { color: C.text, fontSize: 38, fontFamily: 'PlusJakartaSans_800ExtraBold', fontWeight: '800' },
    based: { color: C.sub, fontSize: 11.5, marginTop: 6 },
    histo: { flex: 1, marginLeft: 30, justifyContent: 'center' },
    histoRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2.5 },
    histoNum: { color: C.sub, fontSize: 10.5, width: 14 },
    histoTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#26272B' },
    histoFill: { height: 5, borderRadius: 3, backgroundColor: '#E8EAED' },
    listTitle: { color: C.text, fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700', paddingHorizontal: 20, marginTop: 22, marginBottom: 10 },
    review: { flexDirection: 'row', marginBottom: 18 },
    avatar: { width: 36, height: 36, borderRadius: 18 },
    reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reviewer: { color: C.text, fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', fontWeight: '700' },
    reviewBody: { color: C.sub, fontSize: 12, marginTop: 4, lineHeight: 17 },
});
