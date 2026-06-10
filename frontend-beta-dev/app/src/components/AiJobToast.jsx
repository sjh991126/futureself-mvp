import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { selectActiveToast, useAiJobStore } from '../state/aiJobStore';
import { pollAiResult } from '../api/aiGenerate';

/**
 * Bottom toast for AI trip plan jobs.
 * - complete: teal gradient, persistent. Tap to open the result page.
 * - failed: red, persistent. Tap to retry with the same input.
 *
 * Pending submissions are announced via a native Alert in the trigger screen,
 * so this component only renders complete/failed states.
 */
const AiJobToast = () => {
    const { jobs, complete, consume, dismiss } = useAiJobStore();
    const insets = useSafeAreaInsets();
    const translateY = useRef(new Animated.Value(120)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const [opening, setOpening] = useState(false);

    const active = useMemo(() => selectActiveToast(jobs), [jobs]);

    useEffect(() => {
        if (active) {
            Animated.parallel([
                Animated.timing(translateY, { toValue: 0, duration: 240, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(translateY, { toValue: 120, duration: 200, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [active, opacity, translateY]);

    if (!active) return null;

    const handlePress = async () => {
        if (opening) return;
        if (active.status === 'complete') {
            setOpening(true);
            try {
                // 결과(result)가 store에 유효한 형태로 있는지 확인. 없으면 폴링으로 보강.
                let result = active.result;
                const looksValid = result && typeof result === 'object' && Array.isArray(result.itinerary);
                if (!looksValid) {
                    result = await pollAiResult(active.requestId);
                    complete(active.requestId, result, active.type);
                }
                // 큰 JSON을 URL params로 직렬화하지 않고 store에서 읽도록 aiRequestId만 전달.
                router.push({
                    pathname: '/triplist',
                    params: {
                        isEditMode: 'true',
                        aiRequestId: active.requestId,
                    },
                });
                consume(active.requestId);
            } catch (e) {
                Alert.alert('Error', "Couldn't load the AI trip result.");
            } finally {
                setOpening(false);
            }
        } else if (active.status === 'failed') {
            router.push({
                pathname: '/aifilter',
                params: {
                    location: (active.requestPayload?.regions || []).join(','),
                    categories: (active.requestPayload?.categories || []).join(','),
                    groupSize: active.requestPayload?.groupType || '',
                    startDate: active.requestPayload?.startDate || '',
                    endDate: active.requestPayload?.endDate || '',
                },
            });
            consume(active.requestId);
        }
    };

    const handleClose = () => dismiss(active.requestId);

    const bottom = insets.bottom + 16;

    return (
        <Animated.View
            pointerEvents="box-none"
            style={[styles.container, { bottom, opacity, transform: [{ translateY }] }]}
        >
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePress}
                style={styles.touchable}
            >
                {active.status === 'complete' ? (
                    <LinearGradient
                        colors={['#5468FF', '#81D8D0']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.inner}
                    >
                        <ToastBody
                            icon="sparkles"
                            title="Your AI trip plan is ready"
                            subtitle="Tap to view"
                        />
                        <CloseButton onPress={handleClose} />
                    </LinearGradient>
                ) : (
                    <View style={[styles.inner, styles.failed]}>
                        <ToastBody
                            icon="alert-circle"
                            title="AI trip plan generation failed"
                            subtitle="Tap to retry"
                        />
                        <CloseButton onPress={handleClose} />
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const ToastBody = ({ icon, title, subtitle }) => (
    <View style={styles.body}>
        <Ionicons name={icon} size={22} color="#fff" style={styles.icon} />
        <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
    </View>
);

const CloseButton = ({ onPress }) => (
    <TouchableOpacity onPress={onPress} hitSlop={10} style={styles.close}>
        <Ionicons name="close" size={18} color="rgba(255,255,255,0.85)" />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 12,
        right: 12,
    },
    touchable: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    failed: {
        backgroundColor: '#d9534f',
    },
    body: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 10,
    },
    title: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    subtitle: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        marginTop: 2,
    },
    close: {
        marginLeft: 12,
        padding: 4,
    },
});

export default AiJobToast;
