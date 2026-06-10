// import React from "react";
// import { View, Text, TouchableOpacity } from "react-native";
// import { Ionicons } from '@expo/vector-icons';
// import { router } from 'expo-router';
// import styles from './onboard_styles';
// import BaseScreen from './onboard_base';

// const TermsScreen = () => {
//     const [consents, setConsents] = React.useState({
//         all: false,
//         personal: false,
//         other: false,
//     });

//     const toggleConsent = (key) => {
//         if (key === 'all') {
//             const newValue = !consents.all;
//             setConsents({
//                 all: newValue,
//                 personal: newValue,
//                 other: newValue,
//             });
//         } else {
//             setConsents(prev => ({
//                 ...prev,
//                 [key]: !prev[key],
//                 all: false,
//             }));
//         }
//     };

//     return (
//         <BaseScreen 
//             title="Consents to Terms & Conditions"
//             subtitle="Before you can use Trippy, we need to go over our Terms & Conditions. These are mandatory to continue swiping"
//             onNext={() => router.push('/setpassword')}
//             buttonText="I AGREE"
//             buttonStyle={styles.whiteButton}
//             buttonTextStyle={styles.blackButtonText}
//         >
//             <View style={styles.consentContainer}>
//                 <TouchableOpacity 
//                     style={styles.consentRow}
//                     onPress={() => toggleConsent('all')}
//                 >
//                     <View style={[styles.checkbox, consents.all && styles.checkboxChecked]}>
//                         {consents.all && <Ionicons name="checkmark" size={16} color="white" />}
//                     </View>
//                     <Text style={styles.consentText}>I consent to all of the below</Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity 
//                     style={styles.consentRow}
//                     onPress={() => toggleConsent('personal')}
//                 >
//                     <View style={[styles.checkbox, consents.personal && styles.checkboxChecked]}>
//                         {consents.personal && <Ionicons name="checkmark" size={16} color="white" />}
//                     </View>
//                     <Text style={styles.consentText}>
//                         I consent to the (mandatory) collection and use of my personal information (including location information).
//                     </Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity 
//                     style={styles.consentRow}
//                     onPress={() => toggleConsent('other')}
//                 >
//                     <View style={[styles.checkbox, consents.other && styles.checkboxChecked]}>
//                         {consents.other && <Ionicons name="checkmark" size={16} color="white" />}
//                     </View>
//                     <Text style={styles.consentText}>I consent to the ...</Text>
//                 </TouchableOpacity>
//             </View>
//         </BaseScreen>
//     );
// };

// export default TermsScreen;