import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    REPORT_REASON_OPTIONS,
    REPORT_REASONS,
    submitReport,
} from '../../app/src/api/reports';

// Reusable bottom-sheet style report flow used across posts, comments, profiles,
// chat messages, reviews, and highlights so every UGC surface satisfies the
// App Store "flag objectionable content" requirement.
const ReportModal = ({
    visible,
    onClose,
    targetType,
    targetId,
    title = 'Report',
    onSubmitted,
}) => {
    const [selectedReason, setSelectedReason] = useState(null);
    const [details, setDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!visible) {
            setSelectedReason(null);
            setDetails('');
            setSubmitting(false);
            setSubmitted(false);
            setErrorMessage('');
        }
    }, [visible]);

    const isOtherSelected = selectedReason === REPORT_REASONS.OTHER;
    const canSubmit = useMemo(() => {
        if (!selectedReason || submitting) return false;
        if (isOtherSelected && !details.trim()) return false;
        return true;
    }, [selectedReason, submitting, isOtherSelected, details]);

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setErrorMessage('');
        try {
            const result = await submitReport({
                targetType,
                targetId,
                reason: selectedReason,
                details: details.trim() || undefined,
            });
            setSubmitted(true);
            if (typeof onSubmitted === 'function') {
                onSubmitted(result);
            }
        } catch (error) {
            const serverMessage = error?.response?.data?.message;
            setErrorMessage(
                serverMessage
                || 'Could not submit your report. Please try again in a moment.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const renderReasonPicker = () => (
        <ScrollView style={styles.scrollArea} keyboardShouldPersistTaps="handled">
            <Text style={styles.subheading}>
                Why are you reporting this? Your report is anonymous and is sent
                directly to our moderation team.
            </Text>
            {REPORT_REASON_OPTIONS.map((option) => {
                const active = selectedReason === option.value;
                return (
                    <TouchableOpacity
                        key={option.value}
                        style={styles.optionRow}
                        onPress={() => setSelectedReason(option.value)}
                    >
                        <Text style={styles.optionText}>{option.label}</Text>
                        {active && (
                            <Ionicons name="checkmark" size={20} color="#81d8d0" />
                        )}
                    </TouchableOpacity>
                );
            })}

            {selectedReason && (
                <View style={styles.detailsBlock}>
                    <Text style={styles.detailsLabel}>
                        {isOtherSelected
                            ? 'Tell us more (required)'
                            : 'Add more context (optional)'}
                    </Text>
                    <TextInput
                        style={styles.detailsInput}
                        placeholder="Describe the issue..."
                        placeholderTextColor="#666"
                        value={details}
                        onChangeText={setDetails}
                        multiline
                        maxLength={2000}
                    />
                </View>
            )}

            {!!errorMessage && (
                <Text style={styles.errorText}>{errorMessage}</Text>
            )}
        </ScrollView>
    );

    const renderConfirmation = () => (
        <View style={styles.confirmationContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#81d8d0" />
            <Text style={styles.confirmationTitle}>Report submitted</Text>
            <Text style={styles.confirmationBody}>
                Thanks for letting us know. Our moderation team has been notified
                and will review the content within 24 hours.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
                <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay} />
            </TouchableWithoutFeedback>
            <View style={styles.sheet}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{title}</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={10}>
                        <Ionicons name="close" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>

                {submitted ? renderConfirmation() : renderReasonPicker()}

                {!submitted && (
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            !canSubmit && styles.primaryButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={!canSubmit}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.primaryButtonText}>
                                Submit report
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '80%',
        backgroundColor: '#1c1c1e',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 32,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 4,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    scrollArea: {
        maxHeight: 420,
    },
    subheading: {
        color: '#abb7c2',
        fontSize: 13,
        marginBottom: 12,
        lineHeight: 18,
    },
    optionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#2a2a2c',
    },
    optionText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
        marginRight: 12,
    },
    detailsBlock: {
        marginTop: 16,
    },
    detailsLabel: {
        color: '#abb7c2',
        fontSize: 12,
        marginBottom: 8,
    },
    detailsInput: {
        backgroundColor: '#2a2a2c',
        borderRadius: 10,
        padding: 12,
        color: '#fff',
        minHeight: 80,
        textAlignVertical: 'top',
        fontSize: 14,
    },
    errorText: {
        color: '#ff6b6b',
        fontSize: 13,
        marginTop: 12,
    },
    primaryButton: {
        marginTop: 16,
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonDisabled: {
        backgroundColor: '#333',
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
    confirmationContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    confirmationTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 12,
    },
    confirmationBody: {
        color: '#abb7c2',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 16,
        lineHeight: 18,
    },
});

export default ReportModal;
