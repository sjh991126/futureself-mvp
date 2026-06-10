import api from '../config';
import { endpoints } from './endpoints';

const LEGACY_API_URL = `/api/triplists/v1/ai`;
// endpoints.triplists()가 `/api/triplists/v1`까지 만들어주므로 suffix는 도메인 이후 경로만.
const SUBMIT_URL = endpoints.triplists('/general');
const RESULT_URL = (requestId) => endpoints.triplists(`/result/${requestId}`);

/**
 * 비동기 트립리스트 생성 요청. 서버는 큐에 메시지만 발행하고 requestId만 반환한다.
 * 결과는 WebSocket(`/user/queue/ai.result`)으로 푸시되거나 pollAiResult로 폴링한다.
 */
export const submitGeneralTripList = async (tripData) => {
    const response = await api.post(SUBMIT_URL, tripData, {
        headers: { 'Content-Type': 'application/json' },
    });
    const requestId = response.data?.requestId;
    if (!requestId) {
        throw new Error('Submit succeeded but requestId is missing');
    }
    return requestId;
};

/**
 * 큐 결과를 한 번 조회. 워커가 아직 안 끝냈으면 404를 던진다.
 * 호출부에서 404는 "아직 처리 중"으로 해석한다.
 */
export const pollAiResult = async (requestId) => {
    const response = await api.get(RESULT_URL(requestId), {
        skipAuthRedirect: true,
    });
    return response.data;
};

/**
 * @deprecated 동기 엔드포인트(/v1/ai). 새 흐름은 submitGeneralTripList 사용.
 * 옛 화면 호환을 위해 남겨두며, 새 코드에서는 호출하지 말 것.
 */
export const generateTripList = async (tripData, abortSignal) => {
    try {
        const response = await api.post(LEGACY_API_URL, tripData, {
            signal: abortSignal,
            headers: { 'Content-Type': 'application/json' },
        });

        if (abortSignal?.aborted) {
            throw new Error('Request canceled by user');
        }

        return response.data;
    } catch (error) {
        if (api.isCancel?.(error)) {
            throw error;
        }
        console.error('Error creating trip list:', error.response?.data || error.message);
        throw error;
    }
};
