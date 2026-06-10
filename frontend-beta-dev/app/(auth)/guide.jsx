import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from "@expo/vector-icons";
import MaskedView from '@react-native-masked-view/masked-view';

const { width, height } = Dimensions.get('window');
const PAGES = [0, 1, 2];
const HAS_SEEN_GUIDE_KEY = 'hasSeenGuide';

const ACTIVITY_IMAGES = [
    require('./../../assets/categories_images/budget_friendly.png'),
    require('./../../assets/categories_images/flea_street.png'),
    require('./../../assets/categories_images/girls_night_out.png'),
    require('./../../assets/categories_images/island_hopping.png'),
    require('./../../assets/categories_images/made_for_you.png'),
    require('./../../assets/categories_images/most_popular_visits.png'),
    require('./../../assets/categories_images/music_fest.png'),
    require('./../../assets/categories_images/must_eat_dishes.png'),
    require('./../../assets/categories_images/nature_feels.png'),
    require('./../../assets/categories_images/pets_matter.png'),
    require('./../../assets/categories_images/photogenic_spots.png'),
    require('./../../assets/categories_images/save_your_health_money.png'),
    require('./../../assets/categories_images/wan_chai_wednesday.png'),
    require('./../../assets/categories_images/weather_forecasting.png'),
];

/* ================== 공통 버튼 ================== */
const BackButton = ({ title = 'BACK', onPress }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.backBtn}>
        <Text style={styles.backBtnText}>{title}</Text>
    </TouchableOpacity>
);

const GradientButton = ({ title, onPress }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.gradBtnWrap}>
        <LinearGradient
            colors={['#5468ff', '#81d8d0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradBtn}
        >
            <Text style={styles.gradBtnText}>{title}</Text>
        </LinearGradient>
    </TouchableOpacity>
);

/* ================== 1) 무한 마키 ================== */
const InfiniteMarqueeRow = ({
    items,
    height: rowH = 110,
    gap = 12,
    speed = 60,            // px/sec
    direction = 'left',
    isActive,
}) => {
    const translate = useRef(new Animated.Value(0)).current;
    const [baseW, setBaseW] = useState(0);

    useEffect(() => {
        if (!baseW || !isActive) return;

        // 시작/종료 지점 계산
        const distance = baseW;
        const duration = (distance / speed) * 1000;

        // 방향별 초기값/목표값
        const from = direction === 'left' ? 0 : -distance;
        const to = direction === 'left' ? -distance : 0;

        translate.stopAnimation();
        translate.setValue(from);

        const loop = Animated.loop(
            Animated.timing(translate, {
                toValue: to,
                duration,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        loop.start();
        return () => loop.stop();
    }, [baseW, isActive, direction, speed, translate]);

    const RowOnce = ({ onLayout }) => (
        <View style={{ flexDirection: 'row' }} onLayout={e => onLayout?.(e.nativeEvent.layout.width)}>
            {items.map((it, i) => (
                <View
                    key={`${it.id}-${i}`}
                    style={{
                        width: (width - 48) / 2.5,
                        height: rowH,
                        marginRight: gap,
                        borderRadius: 12,
                        overflow: 'hidden',
                        backgroundColor: '#222',
                    }}
                >
                    <Image
                        source={typeof it.image === 'string' ? { uri: it.image } : it.image}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                </View>
            ))}
        </View>
    );

    return (
        <View style={{ height: rowH, width, overflow: 'hidden' }}>
            <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: translate }] }}>
                {/* 첫 벌: 너비 측정용 */}
                <RowOnce onLayout={(w) => !baseW && setBaseW(w)} />
                {/* 둘째 벌: 이어붙이기 */}
                <RowOnce />
            </Animated.View>
        </View>
    );
};

const PageActivities = ({ isActive, insets }) => {
    const [row1, row2, row3] = useMemo(() => {
        const imgs = ACTIVITY_IMAGES;
        const toRow = (arr, rowId) => arr.map((img, i) => ({ id: `${rowId}-${i}`, image: img }));
        return [
            toRow(imgs.slice(0, 4), 'r1'),
            toRow(imgs.slice(4, 8), 'r2'),
            toRow(imgs.slice(8, 12), 'r3'),
        ];
    }, []);

    return (
        <View style={[styles.slide, { paddingBottom: FOOTER_H + insets.bottom + 20 }]}>
            <View style={{ gap: 14, marginTop: Math.round(height * 0.12) }}>
                {/* 줄마다 방향/속도만 다르게 */}
                <InfiniteMarqueeRow items={row1} isActive={isActive} direction="left" speed={48} />
                <InfiniteMarqueeRow items={row2} isActive={isActive} direction="right" speed={36} />
                <InfiniteMarqueeRow items={row3} isActive={isActive} direction="left" speed={54} />
            </View>

            <View style={[styles.captionBox, { bottom: FOOTER_H + insets.bottom + 96 }]}>
                <Text style={styles.title}>Find the best activities</Text>
                <Text style={styles.subtitle}>Browse or get AI-powered activity suggestions.</Text>
            </View>
        </View>
    );
};

/* ================== 2) TripList 티커 ================== */
const PageTriplists = ({ isActive, insets }) => {
    // 3개 고정 데이터
    const BASE = useMemo(() => ([
        { id: 't1', title: "Dragon's Back Hike", image: 'https://picsum.photos/seed/21/200/200', meta: 'Shek O Road · 4.7★' },
        { id: 't2', title: 'Big Wave Bay Surf', image: 'https://picsum.photos/seed/22/200/200', meta: 'Shek O Road · 4.3★' },
        { id: 't3', title: 'Sai Kung Cliff Jumping', image: 'https://picsum.photos/seed/23/200/200', meta: 'Sai Kung · 4.8★' },
    ]), []);

    // 화면에 유지할 3장(회전용 상태)
    const [items, setItems] = useState(BASE);

    const CARD_H = 72;
    const GAP = 12;
    const STEP = CARD_H + GAP;

    // 뷰포트: 정확히 3장만 보이게 - GAP을 빼지 않음
    const VIEWPORT_H = STEP * 3;
    const OFFSET_Y = (insets.top || 0) + Math.round(height * 0.10);

    // 애니메이션 값: 한 칸 이동
    const translateY = useRef(new Animated.Value(0)).current;

    // 렌더셋: 3장 + 버퍼 1장(아래) => 슬라이드 중 아래 빈공간 방지
    const renderList = useMemo(() => [...items, items[0]], [items]);

    useEffect(() => {
        if (!isActive) { translateY.stopAnimation(); return; }
        let running = true;

        const tick = () => {
            if (!running) return;

            // 슬라이드(-STEP)와 가운데 강조가 "동시에" 일어나도록
            translateY.setValue(0);
            Animated.timing(translateY, {
                toValue: -STEP,
                duration: 650,
                easing: Easing.inOut(Easing.cubic),
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (!finished || !running) return;
                setItems(prev => {
                    const [first, ...rest] = prev;
                    return [...rest, first];
                });
                // 리렌더 후 다음 프레임에서 리셋
                requestAnimationFrame(() => translateY.setValue(0));
                setTimeout(tick, 900);
            });
        };

        tick();
        return () => { running = false; translateY.stopAnimation(); };
    }, [isActive, STEP]);

    // 각 카드의 현재 y(뷰포트 기준)로 "가운데일 때"만 확대/그림자
    const renderItem = (item, i) => {
        // 카드 i의 y = i*STEP + translateY
        const y = Animated.add(translateY, new Animated.Value(i * STEP));

        // 가운데(= STEP 지점)에서 최대 확대
        const scale = y.interpolate({
            inputRange: [STEP * 0.5, STEP, STEP * 1.5],
            outputRange: [0.97, 1.08, 0.97],
            extrapolate: 'clamp',
        });
        const shadowOpacity = y.interpolate({
            inputRange: [STEP * 0.5, STEP, STEP * 1.5],
            outputRange: [0.18, 0.55, 0.18],
            extrapolate: 'clamp',
        });

        const isLast = i === renderList.length - 1;

        const isHighlighted = item.id === 't2';
        const iconSize = 22;

        return (
            <Animated.View
                key={`${item.id}-${i}`}
                style={{
                    alignSelf: 'center',
                    transform: [{ scale }],
                    marginBottom: isLast ? 0 : GAP,
                    shadowColor: '#000',
                    shadowOpacity,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 6 },
                }}
                pointerEvents="none"
            >
                <View style={{
                    width: width - 48,
                    height: CARD_H,
                    borderRadius: 16,
                    overflow: 'hidden',
                    backgroundColor: '#1b1b1d',
                }}>
                    <View style={styles.tripCard}>
                        <Image source={{ uri: item.image }} style={styles.tripThumb} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.tripTitle}>{item.title}</Text>
                            <Text style={styles.tripMeta}>{item.meta}</Text>
                        </View>
                        <View style={styles.iconRow}>
                            {isHighlighted ? (
                                <MaskedView
                                    style={{ width: iconSize, height: iconSize }}
                                    maskElement={
                                        <View style={{
                                            backgroundColor: 'transparent',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            width: iconSize,
                                            height: iconSize,
                                        }}>
                                            <Ionicons name="heart" size={iconSize} color="black" />
                                        </View>
                                    }
                                >
                                    <LinearGradient
                                        colors={['#5468ff', '#81d8d0']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={{ width: iconSize, height: iconSize }}
                                    />
                                </MaskedView>
                            ) : (
                                <Ionicons name="heart-outline" size={iconSize} color="#9aa1aa" />
                            )}

                            <Ionicons name="add-circle-outline" size={20} color="white" />
                        </View>
                    </View>
                </View>
            </Animated.View>
        );
    };

    return (
        <View style={[styles.slide, { paddingBottom: FOOTER_H + insets.bottom + 20 }]}>

            <View
                style={{
                    width,
                    height: VIEWPORT_H,
                    overflow: 'hidden',
                    justifyContent: 'flex-start', // center에서 flex-start로 변경
                    alignSelf: 'center',
                    marginTop: OFFSET_Y,
                }}
            >
                <Animated.View
                    style={{
                        transform: [{ translateY }],
                        paddingTop: 0, // 첫 번째 아이템이 뷰포트 상단에 맞춰지도록
                    }}
                >
                    {renderList.map(renderItem)}
                </Animated.View>
            </View>

            <View style={[styles.captionBox, { bottom: FOOTER_H + insets.bottom + 96 }]}>
                <Text style={styles.title}>Save & plan to your TripLists</Text>
                <Text style={styles.subtitle}>Add activities and organize them your way.</Text>
            </View>
        </View>
    );
};

/* ================== 3) Connect ================== */
const AvatarPin = ({ uri, top, left, delay = 0, isActive }) => {
    const scale = useRef(new Animated.Value(0.2)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!isActive) { scale.stopAnimation(); opacity.stopAnimation(); pulse.stopAnimation(); return; }
        const pop = Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
                Animated.spring(scale, { toValue: 1.05, useNativeDriver: true, friction: 6, tension: 110 }),
                Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
            ]),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 110 }),
        ]);
        const pulseLoop = Animated.loop(Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]));
        pop.start(() => pulseLoop.start());
        return () => { scale.stopAnimation(); opacity.stopAnimation(); pulse.stopAnimation(); };
    }, [isActive]);

    const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
    const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

    return (
        <View style={[styles.pin, { top: `${top}%`, left: `${left}%` }]}>
            <Animated.View style={[styles.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
            <Animated.Image source={{ uri }} style={[styles.avatar, { transform: [{ scale }], opacity }]} resizeMode="cover" />
        </View>
    );
};

const PageConnect = ({ isActive, insets }) => (

    <View style={[styles.slide, { paddingBottom: FOOTER_H + insets.bottom + 20 }]}>
        <View style={{ marginTop: (insets.top || 0) + Math.round(height * 0.10) }}>
            <Image source={require('./../../assets/world_map_dots.png')} style={styles.mapBg} resizeMode="contain" />
            <AvatarPin isActive={isActive} uri={'https://picsum.photos/seed/30/160/160'} top={26} left={14} delay={0} />
            <AvatarPin isActive={isActive} uri={'https://picsum.photos/seed/31/160/160'} top={18} left={74} delay={250} />
            <AvatarPin isActive={isActive} uri={'https://picsum.photos/seed/32/160/160'} top={62} left={30} delay={450} />
            <AvatarPin isActive={isActive} uri={'https://picsum.photos/seed/33/160/160'} top={52} left={68} delay={700} />
        </View>
        <View style={[styles.captionBox, { bottom: FOOTER_H + insets.bottom + 96 }]}>
            <Text style={styles.title}>Connect</Text>
            <Text style={styles.subtitle}>Get tips from other travelers & connect with friends!</Text>
        </View>
    </View>
);

/* ================== 메인 ================== */
export default function GuideScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const listRef = useRef(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const [index, setIndex] = useState(0);

    const pages = [
        (active) => <PageActivities isActive={active} insets={insets} />,
        (active) => <PageTriplists isActive={active} insets={insets} />,
        (active) => <PageConnect isActive={active} insets={insets} />,
    ];

    const onMomentumEnd = (e) => {
        const i = Math.round(e.nativeEvent.contentOffset.x / width);
        setIndex(i);
    };

    const onGetStarted = async () => {
        await AsyncStorage.setItem(HAS_SEEN_GUIDE_KEY, 'true');
        router.replace('/EmailVerify');
    };

    return (
        <View style={styles.container}>
            <Animated.FlatList
                ref={listRef}
                data={PAGES}
                keyExtractor={i => `p-${i}`}
                renderItem={({ index: i }) => (
                    <View style={{ width, height, overflow: 'hidden' }}>
                        {pages[i](index === i)}
                    </View>
                )}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onMomentumEnd}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
                decelerationRate="fast"
                bounces={false}
                initialNumToRender={1}
                windowSize={3}
                removeClippedSubviews
            />

            {/* 하단 가독성 마스크 */}
            <View style={[styles.bottomMask, { height: FOOTER_H + insets.bottom + 20 }]} pointerEvents="none">
                <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)', '#000']} style={{ flex: 1 }} />
            </View>

            {/* 인디케이터 + 버튼 */}
            <View style={[styles.footer, { bottom: insets.bottom + 20 }]}>
                <View style={styles.dots}>
                    {PAGES.map((_, i) => {
                        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                        const scale = scrollX.interpolate({ inputRange, outputRange: [0.6, 1.1, 0.6], extrapolate: 'clamp' });
                        const opacity = scrollX.interpolate({ inputRange, outputRange: [0.4, 1.0, 0.4], extrapolate: 'clamp' });
                        return <Animated.View key={i} style={[styles.dot, { transform: [{ scale }], opacity }]} />;
                    })}
                </View>

                <View style={styles.btnRow}>
                    {index > 0 ? (
                        <BackButton onPress={() => {
                            const prev = Math.max(index - 1, 0);
                            listRef.current?.scrollToIndex({ index: prev, animated: true });
                            setIndex(prev);
                        }} />
                    ) : <View style={{ width: 112 }} />}

                    {index < PAGES.length - 1
                        ? <GradientButton title="NEXT" onPress={() => {
                            const next = Math.min(index + 1, PAGES.length - 1);
                            listRef.current?.scrollToIndex({ index: next, animated: true });
                            setIndex(next);
                        }} />
                        : <GradientButton title="GET STARTED" onPress={onGetStarted} />}
                </View>
            </View>
        </View>
    );
}

/* ================== 스타일 ================== */
const FOOTER_H = 120;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', paddingTop: 20, paddingBottom: 0 },

    slide: { width, height, alignItems: 'center', paddingTop: 24, overflow: 'hidden' },
    captionBox: { position: 'absolute', bottom: FOOTER_H + 48, width, paddingHorizontal: 24, alignItems: 'center' },
    title: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
    subtitle: { color: '#9aa1aa', fontSize: 14, textAlign: 'center' },

    /* trip cards */
    tripCard: { height: 72, flexDirection: 'row', alignItems: 'center', padding: 12 },
    tripThumb: { width: 48, height: 48, borderRadius: 8, marginRight: 12, backgroundColor: '#333' },
    tripTitle: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 2 },
    tripMeta: { color: '#9aa1aa', fontSize: 12 },
    tripIcon: { color: '#9aa1aa', fontSize: 16, marginLeft: 8 },

    mapBg: { width: width * 1.1, height: height * 0.35, opacity: 0.9 },
    pin: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#000' },
    ring: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: '#81d8d0' },

    /* 하단 레이어 */
    bottomMask: { position: 'absolute', left: 0, right: 0, bottom: 0, height: FOOTER_H + 40, zIndex: 5 },
    footer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 10 },

    dots: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

    btnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: width - 48 },

    /* 버튼 스타일 */
    backBtn: {
        backgroundColor: '#222',
        paddingVertical: 12, paddingHorizontal: 22,
        borderRadius: 10, minWidth: 112, alignItems: 'center',
        borderWidth: 1, borderColor: '#2c2c2e'
    },
    backBtnText: { color: '#fff', fontWeight: '700' },

    gradBtnWrap: { borderRadius: 10, overflow: 'hidden', minWidth: 112 },
    gradBtn: {
        paddingVertical: 12, paddingHorizontal: 24,
        alignItems: 'center', justifyContent: 'center',
        borderRadius: 10,
    },
    gradBtnText: { color: '#fff', fontWeight: '700' },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    heartWrapper: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        overflow: 'hidden',
    },
});
