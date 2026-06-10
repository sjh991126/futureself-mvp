// import React, { useState, useEffect } from 'react';
// import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
// import { router, useLocalSearchParams } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons';
// import { useStripe } from '@stripe/stripe-react-native';
// import { createPayment } from '../src/api/payment';

// const payment = ({ }) => {
//     const { price, itemName } = useLocalSearchParams();
//     const { initPaymentSheet, presentPaymentSheet } = useStripe();
//     const [loading, setLoading] = useState(false);

//     const fetchPaymentSheetParams = async () => {
//         try {
//             const response = await createPayment(price);
//             console.log('payment response', response);
//             return {
//                 paymentIntent: response.clientSecret,
//                 // ephemeralKey와 customer는 서버에서 제공하지 않으므로 제거
//             };
//         } catch (error) {
//             console.error('Error fetching payment sheet params:', error);
//             Alert.alert('Error', 'Failed to initialize payment. Please try again.');
//         }
//     };

//     const initializePaymentSheet = async () => {
//         try {
//             const { paymentIntent } = await fetchPaymentSheetParams();

//             if (!paymentIntent) {
//                 throw new Error('Failed to fetch payment intent');
//             }

//             const { error } = await initPaymentSheet({
//                 paymentIntentClientSecret: paymentIntent,
//                 merchantDisplayName: 'Trippy Limited',
//                 returnURL: 'trippy://payment-complete'
//             });

//             if (error) {
//                 console.error('Error initializing payment sheet:', error);
//                 Alert.alert('Error', error.message);
//             } else {
//                 setLoading(true);
//             }
//         } catch (error) {
//             console.error('Error in initializePaymentSheet:', error);
//             Alert.alert('Error', 'Failed to initialize payment. Please try again.');
//         }
//     };


//     const openPaymentSheet = async () => {
//         try {
//             const { error } = await presentPaymentSheet();

//             if (error) {
//                 console.error('Error presenting payment sheet:', error);
//                 Alert.alert(`Error: ${error.code}`, error.message);
//             } else {
//                 Alert.alert('Success', 'Your payment is confirmed!');
//             }
//         } catch (error) {
//             console.error('Error in openPaymentSheet:', error);
//             Alert.alert('Error', 'Failed to process payment. Please try again.');
//         }
//     };

//     useEffect(() => {
//         initializePaymentSheet();
//     }, []);


//     return (
//         <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>

//             <View style={styles.container}>
//                 <View style={styles.header}>
//                     <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
//                         <Ionicons name="chevron-back" size={26} color="white" />
//                     </TouchableOpacity>
//                     <Text style={styles.headerTitle}>Payment</Text>
//                 </View>

//                 <View style={styles.receiptContainer}>
//                     <Text style={styles.paymentSummaryTitle}>Payment Summary</Text>
//                     <View style={styles.receiptRow}>
//                         <Text style={styles.receiptItem}>Trippy Pro</Text>
//                         <Text style={styles.receiptPrice}>$ {price}</Text>
//                     </View>
//                     <View style={styles.receiptRow}>
//                         <Text style={styles.receiptItem}>Discount</Text>
//                         <Text style={styles.receiptPrice}>$ 0</Text>
//                     </View>
//                     <View style={styles.separator} />
//                     <View style={styles.receiptRow}>
//                         <Text style={styles.totalText}>Total Payment</Text>
//                         <Text style={styles.totalAmount}>HK$ {price}</Text>
//                     </View>
//                 </View>
//                 <View style={styles.paymentContainer}>

//                     <Text style={styles.paymentTitle}>Payment Method</Text>

//                     <TouchableOpacity
//                         style={styles.paymentButton}
//                         onPress={openPaymentSheet}
//                         disabled={!loading}
//                     >
//                         <Ionicons name="card-outline" size={24} color="#fff" />
//                         <Text style={styles.paymentButtonText}>Pay with Credit Card</Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                         style={styles.paymentButton}
//                         // onPress={openPaymentSheet}
//                         disabled={!loading}
//                     >
//                         <Ionicons name="card-outline" size={24} color="#fff" />
//                         <Text style={styles.paymentButtonText}>Pay with Apple Pay</Text>
//                     </TouchableOpacity>
//                 </View>
//             </View>
//         </SafeAreaView>
//     );
// };

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         backgroundColor: '#000',
//     },
//     header: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//         paddingHorizontal: 16,
//         backgroundColor: '#000',
//         width: '100%',
//         marginVertical: 10,
//         position: 'relative',
//     },
//     backButton: {
//         position: 'absolute',
//         left: 20,
//     },
//     headerTitle: {
//         color: '#fff',
//         fontSize: 20,
//         fontWeight: 'bold',
//     },
//     receiptContainer: {
//         marginVertical: 20,
//         padding: 16,
//         width: '100%'
//     },
//     paymentSummaryTitle: {
//         fontSize: 20,
//         fontWeight: 'bold',
//         color: '#fff',
//         marginBottom: 15,
//     },
//     receiptRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginVertical: 5,
//     },
//     receiptItem: {
//         fontSize: 16,
//         color: '#fff',
//     },
//     receiptPrice: {
//         fontSize: 16,
//         color: '#fff',
//     },
//     separator: {
//         height: 1,
//         backgroundColor: 'white',
//         marginVertical: 10,
//     },
//     totalText: {
//         fontSize: 16,
//         fontWeight: 'bold',
//         color: '#fff',
//     },
//     totalAmount: {
//         fontSize: 16,
//         fontWeight: 'bold',
//         color: '#fff',
//     },
//     paymentContainer: {
//         flex: 1,
//         padding: 16,
//         width: '100%'
//     },
//     paymentTitle: {
//         fontSize: 20,
//         fontWeight: 'bold',
//         color: '#fff',
//         marginBottom: 20,
//     },
//     modal: {
//         backgroundColor: '#1C1C1E',
//         borderRadius: 20,
//         padding: 32,
//         width: '90%',
//         alignItems: 'center',
//         borderColor: 'white',
//         borderWidth: 1,
//     },
//     paymentButton: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         alignSelf: 'center',
//         borderColor: 'white',
//         borderWidth: 1,
//         padding: 20,
//         borderRadius: 10,
//         marginVertical: 8,
//         width: '100%',
//         justifyContent: 'center',
//     },
//     paymentButtonText: {
//         color: '#fff',
//         fontSize: 16,
//         marginLeft: 10,
//     },
// });


// export default payment;
