import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const OnboardingStartModal = ({ visible, userName, userImage, onStart }) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* 프로필 이미지 */}
                    <View style={styles.imageContainer}>
                        {userImage ? (
                            <Image
                                source={{ uri: userImage }}
                                style={styles.profileImage}
                                contentFit="cover"
                            />
                        ) : (
                            <View style={styles.profileImagePlaceholder} />
                        )}
                    </View>

                    {/* 환영 메시지 */}
                    <Text style={styles.title}>Welcome to Trippy</Text>
                    <Text style={styles.subtitle}>{userName}!</Text>

                    {/* 설명 텍스트 */}
                    <Text style={styles.description}>
                        Your answers to the next few questions will help us find the perfect activities for you
                    </Text>

                    {/* 시작 버튼 */}
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={onStart}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.startButtonText}>Let's Get Started</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: width * 0.85,
        backgroundColor: '#2a2a2a',
        borderRadius: 16,
        paddingVertical: 48,
        paddingHorizontal: 32,
        alignItems: 'center',
    },
    imageContainer: {
        marginBottom: 32,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    profileImagePlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#444',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 24,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
        paddingHorizontal: 8,
    },
    startButton: {
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 48,
        borderRadius: 28,
        minWidth: 200,
        alignItems: 'center',
    },
    startButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
});

export default OnboardingStartModal;