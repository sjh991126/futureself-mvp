import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import GetLocation from 'react-native-get-location';
import Geocoder from 'react-native-geocoding';
import { PermissionsAndroid, Platform } from 'react-native';
import { GOOGLE_SECRET_KEY } from '@env';

let isGeocoderInitialized = false;
let google_secret_key = GOOGLE_SECRET_KEY;

// Google Geocoding API 초기화 (앱 시작 시 한 번만)
Geocoder.init(google_secret_key, { language: 'en' });

const initializeGeocoder = () => {
  if (!isGeocoderInitialized && google_secret_key) {
    console.log('🔵 Initializing Geocoder...');
    Geocoder.init(google_secret_key, { language: 'en' });
    isGeocoderInitialized = true;
    console.log('Geocoder initialized');
  }
};

export const fetchLocation = createAsyncThunk('location/fetchLocation', async () => {
  try {

    if (!google_secret_key) {
      console.error('❌ GOOGLE_SECRET_KEY is not defined');
      throw new Error('Google API key is not configured');
    }
    initializeGeocoder();

    // 위치 권한 요청
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error('Location permission denied');
      }
    }

    // GPS 좌표 가져오기
    const location = await GetLocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 60000,
      rationale: {
        title: 'Location permission',
        message: 'Trippy needs the permission to request your location.',
        buttonPositive: 'Allow',
      },
    });

    const { latitude, longitude } = location;
    console.log('Fetched GPS coordinates:', latitude, longitude);

    // Reverse Geocoding
    try {
      const response = await Geocoder.from(latitude, longitude);
      console.log('Geocoding response:', response);

      // 도시 이름 추출 (우선순위: locality > administrative_area)
      const addressComponents = response.results[0]?.address_components || [];

      let city = null;

      // 우선순위대로 검색
      const priorities = [
        'locality',                    // 도시
        'sublocality',                 // 하위 지역
        'administrative_area_level_2', // 군/구
        'administrative_area_level_1'  // 시/도
      ];

      for (const priority of priorities) {
        const component = addressComponents.find(comp =>
          comp.types.includes(priority)
        );
        if (component) {
          city = component.long_name;
          break;
        }
      }

      // Fallback: formatted_address 사용
      if (!city) {
        const formatted = response.results[0]?.formatted_address;
        city = formatted?.split(',')[0] || null;
      }

      console.log('Extracted city:', city);

      // Fallback 좌표 라벨
      const fallbackLabel = `(${latitude.toFixed(3)}, ${longitude.toFixed(3)})`;

      return {
        location: { coords: { latitude, longitude } },
        city: city || fallbackLabel,
      };

    } catch (geocodingError) {
      console.warn('Geocoding failed, using coordinates:', geocodingError);

      // Geocoding 실패 시 좌표만 사용
      const fallbackLabel = `(${latitude.toFixed(3)}, ${longitude.toFixed(3)})`;

      return {
        location: { coords: { latitude, longitude } },
        city: fallbackLabel,
      };
    }

  } catch (error) {
    console.error('Failed to fetch location:', error);
    throw error;
  }
});

const locationSlice = createSlice({
  name: 'location',
  initialState: {
    data: null,
    city: '',
    status: 'idle',
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLocation.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchLocation.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload.location;
        state.city = action.payload.city;
      })
      .addCase(fetchLocation.rejected, (state, action) => {
        state.status = 'failed';
        console.error('Fetch location failed:', action.error.message);
      });
  },
});

export default locationSlice.reducer;