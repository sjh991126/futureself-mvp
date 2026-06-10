import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MenuModal = ({
    isVisible,
    onClose,
    onOptionSelect,
    listImage,
    listName,
    isEditMode,
    userId,
    triplistUserId,
    collaborators,
    isPublic
}) => {
    const isCollaborator = Array.isArray(collaborators) &&
        collaborators.some(collab => collab.collaboratorId === userId);

    const isOwner = String(userId).trim() === String(triplistUserId).trim();

    const privacyOption = isPublic
        ? { icon: 'lock-closed-outline', label: 'Make TripList private' }
        : { icon: 'lock-open-outline', label: 'Make TripList public' };

    const options = isEditMode
        ? [
            { icon: 'save-outline', label: 'Save Changes' },
        ]
        : isOwner
            ? [
                { icon: 'add-circle-outline', label: 'Add to My Trips' },
                { icon: 'create-outline', label: 'Edit TripList' },
                { icon: 'people-outline', label: 'Collaborate with friends' },
                privacyOption,
                { icon: 'trash-outline', label: 'Delete TripList' },
                { icon: 'share-outline', label: 'Share' },
            ]
            : isCollaborator
                ? [
                    { icon: 'add-circle-outline', label: 'Add to My Trips' },
                    { icon: 'create-outline', label: 'Edit TripList' },
                    { icon: 'share-outline', label: 'Share' },
                ]
                : [
                    { icon: 'add-circle-outline', label: 'Add to My Trips' },
                    { icon: 'share-outline', label: 'Share' },
                ];

    return (
        <Modal
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
            animationType="fade"
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">
                                {listName}
                            </Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {options.map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.menuItem}
                                onPress={() => onOptionSelect(option.label)}
                            >
                                <Ionicons name={option.icon} size={24} color="#fff" style={styles.menuIcon} />
                                <Text style={styles.menuText}>{option.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

export default MenuModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1c1c1e',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#2c2c2e',
    },
    modalTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    menuIcon: {
        marginRight: 15,
    },
    menuText: {
        color: '#fff',
        fontSize: 18,
    },
});