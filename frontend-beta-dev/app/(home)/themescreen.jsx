import React, { useState, useEffect } from 'react';
import { View, Text, Alert, SafeAreaView, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    runOnJS
} from 'react-native-reanimated'; import { Gesture } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { GestureDetector } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveThemeOrder } from '../src/api/theme';
import { ALL_THEMES, DEFAULT_THEME_ORDER } from '../../assets/themeConfig';
import { useSingleFlightAction } from '../src/hooks/useSingleFlightAction';

const DraggableTheme = ({ theme, index, onDragStart, onDragEnd }) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const isDragging = useSharedValue(false);

    const panGesture = Gesture.Pan()
        .onBegin(() => {
            isDragging.value = true;
            runOnJS(onDragStart)(theme, index);
        })
        .onUpdate((event) => {
            translateX.value = event.translationX;
            translateY.value = event.translationY;
        })
        .onFinalize((event) => {
            isDragging.value = false;
            translateX.value = withSpring(0);
            translateY.value = withSpring(0);
            runOnJS(onDragEnd)(theme, index, {
                x: event.absoluteX,
                y: event.absoluteY
            });
        });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { scale: isDragging.value ? 1.1 : 1 }
            ],
            zIndex: isDragging.value ? 1000 : 1,
        };
    });

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.themeItem, animatedStyle]}>
                <View style={styles.themeIconContainer}>
                    <Ionicons name={theme.icon} size={24} color="white" />
                </View>
                <Text style={styles.themeLabel}>{theme.label}</Text>
            </Animated.View>
        </GestureDetector>
    );
};

const ThemeScreen = () => {
    const router = useRouter();
    const { run: runSave, isRunning: isSaving } = useSingleFlightAction('themescreen:saveThemeOrder');
    const [currentThemes, setCurrentThemes] = useState(() =>
        DEFAULT_THEME_ORDER.map(id => ALL_THEMES.find(theme => theme.id === id))
    );

    const [availableThemes, setAvailableThemes] = useState(() =>
        ALL_THEMES.filter(theme => !DEFAULT_THEME_ORDER.includes(theme.id))
    );

    const [draggedTheme, setDraggedTheme] = useState(null);
    const [dropZoneIndex, setDropZoneIndex] = useState(null);


    // 컴포넌트 마운트 시 저장된 테마 순서 로드
    useEffect(() => {
        const loadSavedThemeOrder = async () => {
            try {
                const savedOrder = await AsyncStorage.getItem('userThemeOrder');
                if (savedOrder) {
                    const parsedOrder = JSON.parse(savedOrder);

                    // 저장된 순서의 테마들을 currentThemes로 설정
                    const newCurrentThemes = parsedOrder.map(id =>
                        ALL_THEMES.find(theme => theme.id === id)
                    );

                    // 나머지 테마들을 availableThemes로 설정
                    const newAvailableThemes = ALL_THEMES.filter(
                        theme => !parsedOrder.includes(theme.id)
                    );

                    setCurrentThemes(newCurrentThemes);
                    setAvailableThemes(newAvailableThemes);
                }
            } catch (error) {
                console.error('Error loading theme order:', error);
            }
        };

        loadSavedThemeOrder();
    }, []);


    const handleSave = async () => {
        await runSave(async () => {
            try {
                const success = await saveThemeOrder(currentThemes);
                if (success) {
                    router.back();
                } else {
                    Alert.alert('Warning', 'Changes saved locally but sync failed');
                    router.back();
                }
            } catch (error) {
                console.error('Error saving theme order:', error);
                Alert.alert('Error', 'Failed to save theme order');
            }
        });
    };

    const handleDragStart = (theme, index) => {
        // 드래그 시작할 때 해당 테마의 정보와 출처를 저장
        setDraggedTheme({
            theme,
            // 현재 테마 목록에서 드래그를 시작했는지 확인
            isFromCurrent: currentThemes.some(t => t.key === theme.key),
            originalIndex: index
        });
        console.log('Drag started:', theme.label, 'from current:', currentThemes.some(t => t.key === theme.key));
    };

    const handleDragEnd = (theme, fromIndex, position) => {
        if (!draggedTheme) return;
        console.log('Drag ended at position:', position);

        // 드롭 영역 계산을 위한 상수
        const headerHeight = 100;
        const currentThemesTop = headerHeight;
        const currentThemesBottom = currentThemesTop + 120;

        // 화면 패딩값
        const PADDING = 12;
        // current themes 영역의 실제 사용 가능한 너비 (패딩 제외)
        const USABLE_WIDTH = 360; // 예상 화면 너비 - (패딩 * 2)
        // 각 아이템의 너비
        const ITEM_WIDTH = USABLE_WIDTH / 4;

        if (position.y >= currentThemesTop && position.y <= currentThemesBottom) {
            console.log('Dropped in current themes area');

            // x 위치에서 왼쪽 패딩값을 빼고 아이템 너비로 나누어 인덱스 계산
            const targetIndex = Math.floor((position.x - PADDING) / ITEM_WIDTH);
            console.log('Target index:', targetIndex);

            if (targetIndex >= 0 && targetIndex < 4) {
                // Case 1: 현재 테마 내에서의 드래그
                if (draggedTheme.isFromCurrent) {
                    console.log('Swapping within current themes');
                    const newCurrentThemes = [...currentThemes];
                    const fromIdx = currentThemes.findIndex(t => t.key === draggedTheme.theme.key);

                    [newCurrentThemes[fromIdx], newCurrentThemes[targetIndex]] =
                        [newCurrentThemes[targetIndex], newCurrentThemes[fromIdx]];

                    setCurrentThemes(newCurrentThemes);
                }
                // Case 2: available에서 current로 드래그
                else {
                    console.log('Moving from available to current');
                    const newCurrentThemes = [...currentThemes];
                    const newAvailableThemes = [...availableThemes];

                    // 기존 테마 저장
                    const replacedTheme = newCurrentThemes[targetIndex];
                    // 새 테마로 교체
                    newCurrentThemes[targetIndex] = draggedTheme.theme;

                    // available themes 업데이트
                    const draggedIndex = newAvailableThemes.findIndex(
                        t => t.key === draggedTheme.theme.key
                    );
                    if (draggedIndex !== -1) {
                        newAvailableThemes[draggedIndex] = replacedTheme;
                    }

                    console.log('New arrangement:',
                        '\nCurrent:', newCurrentThemes.map(t => t.label),
                        '\nAvailable:', newAvailableThemes.map(t => t.label)
                    );

                    setCurrentThemes(newCurrentThemes);
                    setAvailableThemes(newAvailableThemes);
                }
            }
        }

        setDraggedTheme(null);
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <View style={styles.navRow}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Ionicons name="chevron-back" size={26} color="#fff" />
                    </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Your current Instant Themes</Text>
                        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                            <Text style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
                                {isSaving ? 'Saving...' : 'Save'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.currentThemes}>
                        <View style={styles.themeGrid}>
                            {currentThemes.map((theme, index) => (
                                <DraggableTheme
                                    key={theme.key}
                                    theme={theme}
                                    index={index}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                />
                            ))}
                        </View>
                    </View>

                    <View style={styles.divider}>
                        <Text style={styles.dividerText}>Drag & Drop to a Theme You Want!</Text>
                    </View>

                    <View style={styles.availableThemes}>
                        <View style={styles.themeGrid}>
                            {availableThemes.map((theme, index) => (
                                <DraggableTheme
                                    key={theme.key}
                                    theme={theme}
                                    index={index}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                />
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </GestureHandlerRootView>

    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    scrollContainer: {
        flexGrow: 1,
    },
    navRow: {
        paddingHorizontal: 8,
        paddingTop: 4,
        paddingBottom: 4,
        alignItems: 'flex-start',
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    saveButton: {
        color: '#81D8D0',
        fontWeight: '600',
        fontSize: 12,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    currentThemes: {
        paddingHorizontal: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        marginHorizontal: 12,
        padding: 8,
    },
    themeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    divider: {
        padding: 16,
    },
    dividerText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    availableThemes: {
        paddingHorizontal: 12,
    },
    themeItem: {
        width: '25%',
        alignItems: 'center',
        padding: 8,
    },
    themeItemActive: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
    },
    dropZone: {
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderRadius: 8,
    },
    themeSlot: {
        width: '25%',
        aspectRatio: 1,
        padding: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
    },
    themeIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    themeLabel: {
        color: '#fff',
        fontSize: 12,
        textAlign: 'center',
    },
});

export default ThemeScreen;
