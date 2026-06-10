import api from '../config';
import { getDeviceId } from '../utils/deviceId';
import { endpoints } from './endpoints';

export const autoSaveTripList = async (tripData) => {
    const deviceId = await getDeviceId();
    const response = await api.post(endpoints.triplists('/autosave'), tripData, {
        headers: {
            'Device-Id': deviceId,
        },
    });
    return response.data;
};

export const restoreDraftById = async (draftId) => {
    const deviceId = await getDeviceId();
    const response = await api.post(endpoints.drafts(`/${draftId}/restore`), null, {
        headers: {
            'Device-Id': deviceId,
        },
    });
    return response.data;
};

export const autosaveService = {
    // 자동 저장
    async autoSave(tripData) {
        try {
            return await autoSaveTripList(tripData);
        } catch (error) {
            console.error('Auto save error:', error);
            throw error;
        }
    },

    // 임시저장 복원 확인
    async checkDraft() {
        try {
            const deviceId = await getDeviceId();
            const response = await api.get(endpoints.drafts('/recent'), {
                headers: {
                    'Device-Id': deviceId,
                },
            });
            const data = response.data || {};
            const draft = data.draft || null;

            return {
                hasDraft: !!data.hasDraft,
                draft,
                message: data.message || '',
                id: data.id ?? draft?.id ?? null,
                name: data.name ?? draft?.name ?? '',
                savedAt: data.savedAt ?? draft?.savedAt ?? draft?.updatedAt ?? draft?.lastModifiedAt ?? null,
                lastModifiedAt: data.lastModifiedAt ?? draft?.lastModifiedAt ?? draft?.updatedAt ?? draft?.savedAt ?? null,
            };
        } catch (error) {
            console.error('Check draft error:', error);
            return { hasDraft: false };
        }
    },

    restoreDraftById,

    async getDraftById(draftId) {
        try {
            const deviceId = await getDeviceId();
            const response = await api.get(endpoints.drafts(`/${draftId}`), {
                headers: {
                    'Device-Id': deviceId,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Get draft by id error:', error);
            throw error;
        }
    },

    // 임시저장 목록 조회
    async getDrafts() {
        try {
            const deviceId = await getDeviceId();
            const response = await api.get(endpoints.drafts(), {
                params: { type: 'autosave' },
                headers: {
                    'Device-Id': deviceId,
                },
            });
            const data = response.data || {};
            return {
                drafts: data.drafts || [],
                count: data.count ?? 0,
                page: data.page ?? 0,
                size: data.size ?? 0,
                totalPages: data.totalPages ?? 0,
            };
        } catch (error) {
            console.error('Get drafts error:', error);
            throw error;
        }
    },

    // 임시저장 삭제
    async deleteDraft(draftId) {
        try {
            const deviceId = await getDeviceId();
            const response = await api.delete(endpoints.drafts(`/${draftId}`), {
                headers: {
                    'Device-Id': deviceId,
                },
            });
            return response.data;
        } catch (error) {
            console.error('Delete draft error:', error);
            throw error;
        }
    }
};
