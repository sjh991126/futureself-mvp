import axios from 'axios';
import { API_BASE_URL, TokenManager, replaySessionExpireDraftBackup } from './../config'
import WebSocketService from './WebSocketService';
import { handleDeviceSelectionFlow } from './user';
import { AuthError } from './errors/AuthError';

const LOGIN_URL = `${API_BASE_URL}/login`;
const PROFILE_URL = `${API_BASE_URL}/api/users/v1/profile`;

let webSocketService = null;

export const loginUser = async (User, router) => {
  try {
    // 기기 선택 플로우
    const deviceFlowResult = await handleDeviceSelectionFlow(User);

    if (deviceFlowResult.needsDeviceSelection) {
      return {
        needsDeviceSelection: true,
        deviceSelection: deviceFlowResult.deviceSelection,
        deviceId: deviceFlowResult.deviceId
      };
    }

    // 로그인 요청
    const response = await axios.post(LOGIN_URL, User);

    let accessToken, refreshToken, tokenExpiresIn, activeDevices;

    // 토큰 추출
    if (response.headers['authorization']) {
      accessToken = response.headers['authorization']?.replace('Bearer ', '');
      refreshToken = response.headers['refresh-token']?.replace('Bearer ', '');
    }

    if (response.data && response.data.accessToken) {
      accessToken = response.data.accessToken;
      refreshToken = response.data.refreshToken;
      tokenExpiresIn = response.data.tokenExpiresIn;
      activeDevices = response.data.activeDevices;
    }

    if (!accessToken || !refreshToken) {
      throw new AuthError('Tokens missing from login response');
    }

    // 1. 먼저 토큰 저장
    if (tokenExpiresIn) {
      await TokenManager.storeTokensWithExpiration(accessToken, refreshToken, tokenExpiresIn);
    } else {
      await TokenManager.storeTokens(accessToken, refreshToken);
    }

    if (activeDevices) {
      await TokenManager.storeActiveDevices(activeDevices);
    }

    // 2. 사용자 데이터 가져오기
    const authAxios = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const profileResponse = await authAxios.get(PROFILE_URL);
    const userData = profileResponse.data;
    await TokenManager.storeUserData(userData);

    // 세션 만료 시 로컬 백업된 draft가 있으면 로그인 직후 재전송
    try {
      await replaySessionExpireDraftBackup();
    } catch (backupError) {
      console.warn('Session-expire draft replay failed:', backupError);
    }

    // 3. 마지막에 WebSocket 연결
    try {
      webSocketService = new WebSocketService(router);
      await webSocketService.connect(userData.userName, accessToken);
    } catch (wsError) {
      console.error("⚠️ WebSocket connection failed (non-critical):", wsError);
      // 로그인은 성공, WebSocket은 나중에 재시도
    }

    return { userData, activeDevices };

  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error;
  }
};

export const getActiveDevices = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/devices/v1/list`);
    const devices = response.data;
    await TokenManager.storeActiveDevices(devices);
    return devices;
  } catch (error) {
    console.error('Error fetching active devices:', error);
    throw error;
  }
};

export const logoutFromDevice = async (deviceId) => {
  try {
    await axios.delete(`${API_BASE_URL}/api/devices/v1/${deviceId}`);
  } catch (error) {
    console.error('Error logging out from device:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    return await TokenManager.getUserData();
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const logoutUser = async () => {
  try {
    if (webSocketService) {
      webSocketService.disconnect();
      webSocketService = null;
    }
    await TokenManager.clearAll();
  } catch (error) {
    console.error('Error during logout:', error);
  }
};
