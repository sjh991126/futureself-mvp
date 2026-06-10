import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LoadingSpinner from '../../app/LoadingSpinner';

const DeleteAccountModal = ({ visible, onCancel, onConfirm, isOAuth = false }) => {
    const [step, setStep] = useState(1); // 1: 초기 확인, 2: 상세 입력, 3: 비밀번호 확인(비OAuth)
    const [reason, setReason] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleContinue = () => {
        setStep(2);
    };

    const handleKeepAccount = () => {
        resetAndClose();
    };

    const handleDelete = async () => {
        if (!reason.trim()) {
            Alert.alert('Required', 'Please provide a reason for deletion.');
            return;
        }
        if (!isConfirmed) {
            Alert.alert('Confirmation Required', 'Please confirm account deletion.');
            return;
        }

        if (!isOAuth) {
            setStep(3);
            return;
        }
        try {
            setIsSubmitting(true);
            await onConfirm({ reason: reason.trim(), password: null });
            resetAndClose();
        } catch (error) {
            console.error('Delete account failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteWithPassword = async () => {
        if (!password.trim()) {
            Alert.alert('Required', 'Please enter your current password.');
            return;
        }
        try {
            setIsSubmitting(true);
            await onConfirm({ reason: reason.trim(), password: password.trim() });
            resetAndClose();
        } catch (error) {
            console.error('Delete account with password failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackToReasonStep = () => {
        setStep(2);
    };

    const handleCancel = () => {
        resetAndClose();
    };

    const resetAndClose = () => {
        setStep(1);
        setReason('');
        setIsConfirmed(false);
        setPassword('');
        setIsSubmitting(false);
        onCancel();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={resetAndClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={!isSubmitting ? resetAndClose : undefined}
                />

                <View style={styles.modalContainer}>
                    {step === 1 ? (
                        // Step 1: 초기 확인
                        <View style={styles.modalContent}>
                            <Text style={styles.title}>Delete account</Text>

                            <Text style={styles.descriptionCenter}>
                                This will permanently delete your account and all associated data.
                                This action cannot be undone.
                            </Text>

                            <LinearGradient
                                colors={['#5468FF', '#81D8D0']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.primaryButton}
                            >
                                <TouchableOpacity
                                    style={styles.buttonInner}
                                    onPress={handleKeepAccount}
                                    disabled={isSubmitting}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.primaryButtonText}>Keep my account</Text>
                                </TouchableOpacity>
                            </LinearGradient>

                            <View style={styles.stepDivider} />

                            <TouchableOpacity
                                style={styles.textButton}
                                onPress={handleContinue}
                                disabled={isSubmitting}
                            >
                                <Text style={styles.textButtonText}>
                                    Continue with account deletion
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : step === 2 ? (
                        // Step 2: 상세 입력
                        <ScrollView
                            style={styles.modalContent}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={styles.title}>Delete account</Text>

                            <View style={styles.warningBox}>
                                <Ionicons name="warning" size={20} color="#ff6b6b" />
                                <Text style={styles.warningText}>
                                    Please read carefully before deleting
                                </Text>
                            </View>

                            <Text style={styles.warningDescription}>
                                Deleting your account will{' '}
                                <Text style={styles.bold}>permanently</Text> remove your
                                information, trip plans, guides, and other documents associated
                                with your account.{' '}
                                <Text style={styles.bold}>It cannot be restored.</Text>
                            </Text>

                            <Text style={styles.confirmQuestion}>
                                Are you sure you want to delete your account?
                            </Text>

                            <Text style={styles.label}>Reason (required)</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Please tell us why: was anything missing or too hard to use? 😢"
                                placeholderTextColor="#666"
                                multiline
                                numberOfLines={4}
                                value={reason}
                                onChangeText={setReason}
                                textAlignVertical="top"
                            />

                            <TouchableOpacity
                                style={styles.checkboxRow}
                                onPress={() => setIsConfirmed(!isConfirmed)}
                                activeOpacity={0.7}
                            >
                                {isConfirmed ? (
                                    <LinearGradient
                                        colors={['#5468FF', '#81D8D0']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.checkboxCheckedGradient}
                                    />
                                ) : (
                                    <View style={styles.checkbox} />
                                )}
                                <Text style={styles.checkboxLabel}>
                                    Yes, I want to permanently close my account and data associated
                                    with my account.
                                </Text>
                            </TouchableOpacity>

                            <LinearGradient
                                colors={
                                    isConfirmed && reason.trim()
                                        ? ['#5468FF', '#81D8D0']
                                        : ['#4a4a4a', '#4a4a4a']
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.deleteButton}
                            >
                                <TouchableOpacity
                                    style={styles.buttonInner}
                                    onPress={handleDelete}
                                    disabled={!isConfirmed || !reason.trim() || isSubmitting}
                                    activeOpacity={0.8}
                                >
                                    <Text
                                        style={[
                                            styles.deleteButtonText,
                                            (!isConfirmed || !reason.trim()) && styles.disabledText,
                                        ]}
                                    >
                                        {isOAuth ? 'Delete my account' : 'Continue'}
                                    </Text>
                                </TouchableOpacity>
                            </LinearGradient>

                            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={isSubmitting}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    ) : (
                        <View style={styles.modalContent}>
                            <Text style={styles.title}>Final verification</Text>
                            <Text style={styles.passwordDescription}>
                                Enter your current password to permanently delete your account.
                            </Text>
                            <Text style={styles.label}>Current password</Text>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Enter current password"
                                placeholderTextColor="#666"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />

                            <LinearGradient
                                colors={password.trim() ? ['#5468FF', '#81D8D0'] : ['#4a4a4a', '#4a4a4a']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.deleteButton}
                            >
                                <TouchableOpacity
                                    style={styles.buttonInner}
                                    onPress={handleDeleteWithPassword}
                                    disabled={!password.trim() || isSubmitting}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.deleteButtonText, !password.trim() && styles.disabledText]}>
                                        Delete my account
                                    </Text>
                                </TouchableOpacity>
                            </LinearGradient>

                            <TouchableOpacity style={styles.cancelButton} onPress={handleBackToReasonStep} disabled={isSubmitting}>
                                <Text style={styles.cancelButtonText}>Back</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {isSubmitting && (
                        <View style={styles.loadingOverlay}>
                            <LoadingSpinner />
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    modalContainer: {
        width: '94%',
        maxWidth: 500,
        maxHeight: '88%',
        backgroundColor: '#1f1f23',
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    modalContent: {
        paddingHorizontal: 20,
        paddingTop: 26,
        paddingBottom: 24,
    },
    scrollContent: {
        paddingBottom: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 16,
        textAlign: 'center',
    },
    descriptionCenter: {
        fontSize: 15,
        color: '#d3d3d6',
        lineHeight: 24,
        marginBottom: 20,
        textAlign: 'center',
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(140, 34, 34, 0.45)',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        marginBottom: 22,
    },
    warningText: {
        color: '#ff6b6b',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 10,
        flex: 1,
    },
    warningDescription: {
        fontSize: 14,
        color: '#ccc',
        lineHeight: 20,
        marginBottom: 24,
    },
    bold: {
        fontWeight: '700',
        color: '#fff',
    },
    confirmQuestion: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 18,
    },
    passwordDescription: {
        fontSize: 14,
        color: '#ccc',
        lineHeight: 20,
        marginBottom: 16,
        textAlign: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#fff',
        marginBottom: 12,
    },
    textInput: {
        backgroundColor: '#2b2c31',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#44464f',
        padding: 16,
        color: '#fff',
        fontSize: 14,
        minHeight: 118,
        marginBottom: 18,
    },
    passwordInput: {
        backgroundColor: '#2b2c31',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#44464f',
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#fff',
        fontSize: 14,
        marginBottom: 18,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        backgroundColor: '#292a2f',
        borderWidth: 1,
        borderColor: '#2f3138',
        marginRight: 12,
        marginTop: 2,
    },
    checkboxCheckedGradient: {
        width: 20,
        height: 20,
        borderRadius: 6,
        marginRight: 12,
        marginTop: 2,
    },
    checkboxLabel: {
        flex: 1,
        fontSize: 13,
        color: '#ccc',
        lineHeight: 22,
    },
    primaryButton: {
        borderRadius: 32,
        marginBottom: 16,
        overflow: 'hidden',
        alignSelf: 'center',
        minWidth: 275,
    },
    deleteButton: {
        borderRadius: 32,
        marginBottom: 12,
        overflow: 'hidden',
    },
    buttonInner: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    disabledText: {
        opacity: 0.5,
    },
    textButton: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    textButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '400',
    },
    cancelButton: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#c3c3c7',
        fontSize: 14,
        fontWeight: '400',
    },
    stepDivider: {
        width: '100%',
        height: 1,
        backgroundColor: '#2d2e36',
        marginBottom: 4,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default DeleteAccountModal;
