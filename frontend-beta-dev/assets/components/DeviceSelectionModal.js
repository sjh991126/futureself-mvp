import React, { useState } from 'react';
import { 
    Modal, 
    View, 
    Text, 
    TouchableOpacity, 
    StyleSheet, 
    FlatList,
    Alert 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const DeviceSelectionModal = ({ 
    visible, 
    deviceSelection, 
    onDeviceSelected,
    onCancel 
}) => {
    const [selectedDevices, setSelectedDevices] = useState([]);

    const toggleDeviceSelection = (deviceId) => {
        setSelectedDevices(prev => {
            if (prev.includes(deviceId)) {
                return prev.filter(id => id !== deviceId);
            } else {
                return [...prev, deviceId];
            }
        });
    };

    const handleConfirm = () => {
        if (selectedDevices.length === 0) {
            Alert.alert('선택 필요', '로그아웃할 기기를 선택해주세요.');
            return;
        }
        onDeviceSelected(selectedDevices);
    };

    const renderDeviceItem = ({ item }) => (
        <TouchableOpacity
            style={styles.deviceItem}
            onPress={() => toggleDeviceSelection(item.id)}
        >
            <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{item.name}</Text>
                <Text style={styles.deviceDetails}>
                    {item.platform} • {item.lastActivity}
                </Text>
            </View>
            <View style={styles.checkboxContainer}>
                {selectedDevices.includes(item.id) && (
                    <Ionicons name="checkmark" size={20} color="#5468FF" />
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.title}>기기 선택</Text>
                    <Text style={styles.subtitle}>
                        로그아웃할 기기를 선택해주세요
                    </Text>
                    
                    <FlatList
                        data={deviceSelection}
                        renderItem={renderDeviceItem}
                        keyExtractor={(item) => item.id}
                        style={styles.deviceList}
                    />

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={styles.cancelButton} 
                            onPress={onCancel}
                        >
                            <Text style={styles.cancelButtonText}>취소</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.confirmButton} 
                            onPress={handleConfirm}
                        >
                            <LinearGradient
                                colors={['#5468FF', '#81D8D0']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.confirmButtonGradient}
                            >
                                <Text style={styles.confirmButtonText}>확인</Text>
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
        width: '85%',
        maxWidth: 400,
        maxHeight: '70%',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        color: '#333',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        color: '#666',
    },
    deviceList: {
        maxHeight: 300,
        marginBottom: 20,
    },
    deviceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    deviceInfo: {
        flex: 1,
    },
    deviceName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    deviceDetails: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    checkboxContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#5468FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    confirmButton: {
        flex: 1,
        borderRadius: 8,
        overflow: 'hidden',
    },
    confirmButtonGradient: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: 16,
        color: 'white',
        fontWeight: '600',
    },
});

export default DeviceSelectionModal;