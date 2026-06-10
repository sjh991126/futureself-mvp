import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const DraftRestoreModal = ({ 
    visible, 
    onRestore, 
    onDiscard, 
    draftData 
}) => {
    const formatRelativeSavedTime = (dateString) => {
        if (!dateString) return '저장 시간 정보 없음';
        const saved = new Date(dateString);
        if (Number.isNaN(saved.getTime())) return '저장 시간 정보 없음';

        const diffMs = Date.now() - saved.getTime();
        if (diffMs < 0) return '방금 저장됨';

        const minutes = Math.floor(diffMs / (1000 * 60));
        if (minutes < 1) return '방금 저장됨';
        if (minutes < 60) return `${minutes}분 전에 저장됨`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}시간 전에 저장됨`;

        const days = Math.floor(hours / 24);
        return `${days}일 전에 저장됨`;
    };

    const draft = draftData?.draft || {};
    const draftName = draft.name || draftData?.name || '제목 없음';
    const draftMessage = draftData?.message || '이전에 편집하던 TripList가 있습니다.';
    const lastModifiedAt = draft.lastModifiedAt || draftData?.lastModifiedAt || draftData?.savedAt;
    const startDate = draft.startDate || draftData?.startDate;
    const endDate = draft.endDate || draftData?.endDate;

    const formatTripDateRange = (start, end) => {
        if (!start || !end) return null;
        const s = new Date(start);
        const e = new Date(end);
        if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
        const sText = s.toLocaleDateString('ko-KR');
        const eText = e.toLocaleDateString('ko-KR');
        return `${sText} ~ ${eText}`;
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.title}>임시저장된 작업 발견</Text>
                    
                    {draftData && (
                        <View style={styles.draftInfo}>
                            <Text style={styles.draftTitle}>
                                {draftName}
                            </Text>
                            <Text style={styles.draftDate}>
                                {formatRelativeSavedTime(lastModifiedAt)}
                            </Text>
                            {formatTripDateRange(startDate, endDate) && (
                                <Text style={styles.draftDate}>
                                    여행 일정: {formatTripDateRange(startDate, endDate)}
                                </Text>
                            )}
                            <Text style={styles.draftMessage}>
                                {draftMessage}
                            </Text>
                        </View>
                    )}

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={styles.discardButton} 
                            onPress={onDiscard}
                        >
                            <Text style={styles.discardButtonText}>삭제</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.restoreButton} 
                            onPress={onRestore}
                        >
                            <LinearGradient
                                colors={['#5468FF', '#81D8D0']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.restoreButtonGradient}
                            >
                                <Text style={styles.restoreButtonText}>복원</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        width: '80%',
        maxWidth: 400,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
        color: '#333',
    },
    draftInfo: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
    },
    draftTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    draftDate: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    draftMessage: {
        fontSize: 14,
        color: '#888',
        lineHeight: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    discardButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    discardButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    restoreButton: {
        flex: 1,
        borderRadius: 8,
        overflow: 'hidden',
    },
    restoreButtonGradient: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    restoreButtonText: {
        fontSize: 16,
        color: 'white',
        fontWeight: '600',
    },
});

export default DraftRestoreModal;
