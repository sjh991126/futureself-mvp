/**
 * 인증 관련 에러 클래스
 */
export class AuthError extends Error {
    constructor(message, originalError = null) {
        super(message);
        this.name = 'AuthError';
        this.originalError = originalError;
        this.timestamp = new Date().toISOString();
    }

    /**
     * 사용자 친화적인 에러 메시지 반환
     */
    getUserMessage() {
        if (this.originalError?.response?.status === 409) {
            return '기기 선택이 필요합니다.';
        } else if (this.originalError?.response?.status === 401) {
            return '인증에 실패했습니다. 다시 시도해주세요.';
        } else if (this.originalError?.code === 'NETWORK_ERROR') {
            return '네트워크 연결을 확인해주세요.';
        }
        return this.message;
    }
}