import { TokenManager, API_BASE_URL } from '../config';
import axios from 'axios';



// Backend endpoint testing function for points API validation
export const testCorrectedEndpoints = async () => {
  console.log('🔧 Testing Backend Points API...');
  
  try {
    const token = await TokenManager.getAccessToken();
    
    if (!token) {
      console.log('❌ No auth token');
      return;
    }
    
    // Test 1: GET user points
    try {
      console.log('1. Testing GET /api/userPoints/v1...');
      const response = await axios.get(`${API_BASE_URL}/api/userPoints/v1`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ GET points worked:', response.data);
    } catch (error) {
      console.log('❌ GET points failed:', error.response?.data?.message || error.message);
    }
    
    // Test 2: PATCH increment points
    try {
      console.log('2. Testing PATCH /api/userPoints/v1 with increment...');
      const response = await axios.patch(`${API_BASE_URL}/api/userPoints/v1`, 
        { increment: 5 },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log('✅ PATCH increment worked:', response.data);
    } catch (error) {
      console.log('❌ PATCH increment failed:', error.response?.data?.message || error.message);
    }
    
    // Test 3: PUT set points
    try {
      console.log('3. Testing PUT /api/userPoints/v1 with points...');
      const response = await axios.put(`${API_BASE_URL}/api/userPoints/v1`, 
        { points: 100 },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log('✅ PUT points worked:', response.data);
    } catch (error) {
      console.log('❌ PUT points failed:', error.response?.data?.message || error.message);
    }
    
    console.log('🎯 Points API testing completed!');
    
  } catch (error) {
    console.log('❌ Points API test setup failed:', error.message);
  }
};

 
