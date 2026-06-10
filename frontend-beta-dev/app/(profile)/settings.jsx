import React, { useEffect, useState } from 'react';
import { Alert, Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { clearUserData } from '../slices/userSlice';
import api, { TokenManager } from '../src/config';
import { endpoints } from '../src/api/endpoints';
import ConfirmationModal from '../../assets/components/ConfirmationModal';
import DeleteAccountModal from '../../assets/components/DeleteAccountModal';

const ABOUT_LINKS = [
  { label: 'Terms of service', url: 'https://www.trippy.global/terms' },
  { label: 'Business information', url: 'https://www.trippy.global' },
  { label: 'Privacy policy', url: 'https://www.trippy.global/privacy' },
];

const SettingsScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [isOAuthUser, setIsOAuthUser] = useState(false);

  useEffect(() => {
    const detectAuthType = async () => {
      try {
        const userData = await TokenManager.getUserData();
        const provider = String(
          userData?.loginMethod ||
          userData?.authProvider ||
          userData?.provider ||
          ''
        ).toLowerCase();
        const hasSocialProviderId = Boolean(
          userData?.googleId ||
          userData?.appleId ||
          userData?.oauthId ||
          userData?.socialId ||
          userData?.providerId
        );

        const isOAuth =
          hasSocialProviderId ||
          provider.includes('google') ||
          provider.includes('apple') ||
          provider.includes('oauth') ||
          provider.includes('social');

        setIsOAuthUser(isOAuth);
      } catch (error) {
        setIsOAuthUser(false);
      }
    };

    detectAuthType();
  }, []);

  const openExternalLink = async (url) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', 'Unable to open this page right now.');
    }
  };

  const handleLogout = async () => {
    try {
      dispatch(clearUserData());
      await AsyncStorage.clear();
      await TokenManager.clearAll();
      router.replace('/login');
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    } finally {
      setLogoutModalVisible(false);
    }
  };

  // handleDeleteAccount에서 실제 API 연결
  const handleDeleteAccount = async ({ reason, password }) => {
    try {
      // Backend API 호출
      await api.post(endpoints.users('/withdrawal'), {
        password: isOAuthUser ? null : (password || null),
        reason
      });

      // 로컬 데이터 삭제
      await AsyncStorage.clear();
      await TokenManager.clearAll();

      // 로그인 화면으로
      router.replace('/login');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account.');
      throw error;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/blocked_users')}
          >
            <Text style={styles.rowText}>Blocked Users</Text>
            <Ionicons name="chevron-forward" size={22} color="#81D8D0" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          {ABOUT_LINKS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.row}
              onPress={() => openExternalLink(item.url)}
            >
              <Text style={styles.rowText}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={22} color="#81D8D0" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.actionRow} onPress={() => setLogoutModalVisible(true)}>
            <Text style={styles.actionText}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={() => setDeleteAccountModalVisible(true)}>
            <Text style={styles.actionText}>Remove Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ConfirmationModal
        visible={logoutModalVisible}
        title="Do you want to logout?"
        message="This cannot be undone."
        onConfirm={handleLogout}
        onCancel={() => setLogoutModalVisible(false)}
        confirmText="Log out"
        cancelText="Cancel"
      />

      <DeleteAccountModal
        visible={deleteAccountModalVisible}
        onCancel={() => setDeleteAccountModalVisible(false)}
        onConfirm={handleDeleteAccount}
        isOAuth={isOAuthUser}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 14,
    padding: 4,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingLeft: 32,
  },
  rowText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '400',
  },
  actionSection: {
    marginTop: 4,
  },
  actionRow: {
    paddingVertical: 12,
  },
  actionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '400',
  },
});

export default SettingsScreen;
