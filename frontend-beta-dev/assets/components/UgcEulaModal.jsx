import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { fetchTerms } from '../../app/src/api/fetchterms';
import { TokenManager } from '../../app/src/config';

// Per-user storage key. We scope it to the user id so a fresh login on the
// same device still re-prompts new accounts.
const buildStorageKey = (userId) => `@ugc_eula_accepted:${userId || 'anon'}`;

// Returns true when the current user has previously accepted the UGC EULA on
// this device. Callers (community/chat/etc.) can use this to decide whether to
// show the gate.
export const hasAcceptedUgcEula = async () => {
    try {
        const userData = await TokenManager.getUserData();
        const userId = userData?.id || userData?.userId;
        const value = await AsyncStorage.getItem(buildStorageKey(userId));
        return value === 'true';
    } catch (error) {
        console.warn('hasAcceptedUgcEula failed:', error);
        return false;
    }
};

const persistAcceptance = async () => {
    try {
        const userData = await TokenManager.getUserData();
        const userId = userData?.id || userData?.userId;
        await AsyncStorage.setItem(buildStorageKey(userId), 'true');
    } catch (error) {
        console.warn('Failed to persist UGC EULA acceptance:', error);
    }
};

// Full-screen modal that satisfies App Store guideline 1.2: a EULA / Terms of
// Use agreement must be presented before the user views or contributes UGC.
// The text is fetched from the existing /api/tnc/v1 endpoint so there is one
// source of truth between the signup flow and this gate.
const UgcEulaModal = ({ visible, onAccept, onDecline }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!visible) return;
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const text = await fetchTerms('1');
                if (!cancelled) setContent(text || '');
            } catch (e) {
                if (!cancelled) {
                    setError('We could not load the terms right now. Please check your connection and try again.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [visible]);

    const handleAccept = async () => {
        await persistAcceptance();
        if (typeof onAccept === 'function') onAccept();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onDecline}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Ionicons name="shield-checkmark" size={22} color="#81d8d0" />
                    <Text style={styles.headerTitle}>Community Terms of Use</Text>
                </View>

                <Text style={styles.intro}>
                    Trippy has zero tolerance for objectionable content or abusive
                    behavior. To view or post community content, please review and
                    accept these Terms of Use.
                </Text>

                <View style={styles.policyBox}>
                    <Text style={styles.policyTitle}>By tapping I Agree, you confirm:</Text>
                    <Text style={styles.policyItem}>• You will not post hateful, harassing, sexually explicit, violent or otherwise objectionable content.</Text>
                    <Text style={styles.policyItem}>• You will not impersonate others or post misleading or illegal content.</Text>
                    <Text style={styles.policyItem}>• You understand that violators will be removed and content moderated, and that you can flag any content or block any user from your feed at any time.</Text>
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator
                >
                    {loading ? (
                        <View style={styles.loadingBlock}>
                            <ActivityIndicator color="#fff" />
                            <Text style={styles.loadingText}>Loading terms...</Text>
                        </View>
                    ) : error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : (
                        <Text style={styles.termsText}>{content}</Text>
                    )}
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.declineButton}
                        onPress={onDecline}
                    >
                        <Text style={styles.declineText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.acceptButton, loading && styles.acceptButtonDisabled]}
                        onPress={handleAccept}
                        disabled={loading || !!error}
                    >
                        <Text style={styles.acceptText}>I Agree</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 12,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 8,
    },
    intro: {
        color: '#abb7c2',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    policyBox: {
        backgroundColor: '#1c1c1e',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
    },
    policyTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    policyItem: {
        color: '#d9d9d9',
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 6,
    },
    scroll: {
        flex: 1,
        backgroundColor: '#101010',
        borderRadius: 12,
        marginBottom: 12,
    },
    scrollContent: {
        padding: 14,
    },
    termsText: {
        color: '#d9d9d9',
        fontSize: 13,
        lineHeight: 19,
    },
    loadingBlock: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    loadingText: {
        color: '#fff',
        marginTop: 8,
        fontSize: 12,
    },
    errorText: {
        color: '#ff6b6b',
        fontSize: 13,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 4,
        paddingBottom: 12,
    },
    declineButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#444',
        alignItems: 'center',
    },
    declineText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    acceptButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
    },
    acceptButtonDisabled: {
        backgroundColor: '#333',
    },
    acceptText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default UgcEulaModal;
