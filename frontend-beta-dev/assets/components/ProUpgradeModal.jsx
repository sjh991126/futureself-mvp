import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import CrownIcon from '../../assets/icons/crown.jsx';

const ProUpgradeModal = ({ visible, onClose, onPurchase }) => {
  if (!visible) return null;

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Trippy Pro Benefits</Text>
          <TouchableOpacity style={styles.skipButton} onPress={onClose}>
            <Text style={styles.skipText}>SKIP</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#5468FF', '#81D8D0']}
                style={styles.iconGradient}
              >
                <CrownIcon size={24} color="white" />
              </LinearGradient>
            </View>
            <Text style={styles.cardTitle}>Trippy PRO</Text>
            <Text style={styles.priceText}>Only $9.99</Text>
            <View style={styles.benefitItem}>
              <View style={styles.checkmarkContainer}>
                <Ionicons name="checkmark" size={18} color="#1C1C1E" />
              </View>
              <Text style={styles.benefitText}>Receive 200 tokens</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={styles.checkmarkContainer}>
                <Ionicons name="checkmark" size={18} color="#1C1C1E" />
              </View>
              <Text style={styles.benefitText}>More AI TripList generations</Text>
            </View>
            <View style={styles.benefitItem}>
              <View style={styles.checkmarkContainer}>
                <Ionicons name="checkmark" size={18} color="#1C1C1E" />
              </View>
              <Text style={styles.benefitText}>?Unlimited usage of Chatbot?</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={onPurchase}>
          <LinearGradient
            colors={['#5468FF', '#81D8D0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.purchaseButton}
          >
            <Text style={styles.purchaseButtonText}>PURCHASE</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 32,
    width: '90%',
    alignItems: 'center',
    borderColor: 'white',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    alignSelf: 'center'
  },
  skipButton: {
    alignSelf: 'center'
  },
  skipText: {
    color: '#888',
    fontSize: 16,
  },
  cardContainer: {
    alignItems: 'center',
    marginVertical: 60,
  },
  priceText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 24,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#2C2C2E',
    borderRadius: 15,
    padding: 30,
    alignItems: 'flex-start',
    width: '100%',
  },
  iconContainer: {
    marginBottom: 20,
    alignSelf: 'center',
    width: '100%',
  },
  iconGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    alignSelf: 'center',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginVertical: 10,
    width: '100%',
  },
  benefitText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 10,
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardPriceText: {
    fontSize: 16,
    color: '#888',
    marginTop: 10,
  },
  purchaseButton: {
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 8,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProUpgradeModal;