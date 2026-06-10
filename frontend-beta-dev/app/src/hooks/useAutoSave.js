import { useEffect, useRef, useCallback } from 'react';
import { autoSaveTripList } from '../api/autosave';
import { setCurrentEditingDraft } from '../utils/editingDraftSession';

export const useAutoSave = ({ tripData, isEnabled = true, debounceMs = 1500 }) => {
    const timerRef = useRef(null);
    const lastSavedRef = useRef(null);

    // 저장 조건 확인
    const shouldSave = useCallback((data, force = false) => {
        if (!data) return false;

        if (force) return true;

        // 자동저장 조건: startDate, endDate가 있거나, itinerary에 장소가 있거나, name이 있음
        const hasValidData =
            data.startDate ||
            data.endDate ||
            (data.itinerary && data.itinerary.some(day => day.places && day.places.length > 0)) ||
            (data.name && data.name.trim() !== '');

        // 이전 저장된 데이터와 다른지 확인
        const isDifferent = JSON.stringify(data) !== JSON.stringify(lastSavedRef.current);

        return hasValidData && isDifferent;
    }, []);

    // 자동저장 실행
    const performAutoSave = useCallback(async (force = false) => {
        if ((!isEnabled && !force) || !shouldSave(tripData, force)) {
            console.log('[AutoSave] Skipped:', {
                isEnabled,
                force,
                hasData: !!tripData,
                itineraryLength: tripData?.itinerary?.length ?? 0,
                itineraryPlaces: tripData?.itinerary?.map(d => d?.places?.length ?? 0) ?? [],
            });
            return;
        }

        try {
            console.log('[AutoSave] Saving payload:', JSON.stringify({
                name: tripData?.name,
                startDate: tripData?.startDate,
                endDate: tripData?.endDate,
                itineraryDays: tripData?.itinerary?.length ?? 0,
                itineraryPlaces: tripData?.itinerary?.map(d => d?.places?.length ?? 0) ?? [],
            }));
            await autoSaveTripList(tripData);
            lastSavedRef.current = JSON.parse(JSON.stringify(tripData));
            console.log('[AutoSave] Saved successfully at:', new Date().toLocaleTimeString());
        } catch (error) {
            console.error('[AutoSave] Failed:', error);
        }
    }, [tripData, isEnabled, shouldSave]);
    
    useEffect(() => {
        if (tripData) {
            setCurrentEditingDraft(tripData);
        }
    }, [tripData]);

    // 변경 후 debounce 저장
    useEffect(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        if (!isEnabled || !shouldSave(tripData)) {
            return;
        }

        timerRef.current = setTimeout(() => {
            performAutoSave();
        }, debounceMs);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [tripData, isEnabled, debounceMs, performAutoSave, shouldSave]);

    // 수동 저장 함수 반환
    return {
        saveNow: () => performAutoSave(true),
        isAutoSaveEnabled: isEnabled
    };
};
