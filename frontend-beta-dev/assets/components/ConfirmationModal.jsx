import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ConfirmationModal = React.memo(({ visible, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onCancel}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalView}>
                    <Text style={styles.modalText}>{title}</Text>
                    <Text style={styles.modalText2}>{message}</Text>
                    <View style={styles.divider} />

                    <View style={styles.buttonContainer}>
                        {cancelText ? (
                            <>
                                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                                    <Text style={styles.cancelButtonText}>{cancelText}</Text>
                                </TouchableOpacity>

                                {/* Vertical divider */}
                                <View style={styles.verticalDivider} />

                                <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
                                    <Text style={styles.confirmButtonText}>{confirmText}</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity style={[styles.confirmButton, { width: '100%' }]} onPress={onConfirm}>
                                <Text style={styles.confirmButtonText}>{confirmText}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        width: '70%',
        backgroundColor: '#202020',
        borderRadius: 10,
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    modalText: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 24,
        marginBottom: 10,
        marginHorizontal: 10,
        color: 'white',
        textAlign: 'center',
    },
    modalText2: {
        fontSize: 14,
        marginHorizontal: 8,
        color: '#c4c4c4',
        textAlign: 'center',
        marginBottom: 24,
    },
    divider: {
        height: 1,
        width: '100%',
        backgroundColor: '#383838',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center', // Align items vertically centered
    },
    confirmButton: {
        backgroundColor: '#202020',
        padding: 16,
        borderRadius: 10,
        width: '48%', // Default to 48% when both buttons are present
        alignItems: 'center',
    },
    confirmButtonText: {
        color: 'red',
        fontSize: 14,
        fontWeight: '600',
    },
    cancelButton: {
        backgroundColor: '#202020',
        padding: 16,
        borderRadius: 10,
        width: '48%',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    verticalDivider: {
        width: 1,
        height: '100%',
        backgroundColor: '#383838',
    },
});

export default ConfirmationModal;
