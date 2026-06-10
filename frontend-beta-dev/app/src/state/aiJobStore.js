import React, { createContext, useCallback, useContext, useMemo, useReducer, useRef } from 'react';

/**
 * AI 비동기 트립리스트 작업 전역 상태.
 *
 * 흐름:
 *   submit(requestId, type, requestPayload) → status='pending'
 *   complete(requestId, result)             → status='complete' + 결과 캐시
 *   fail(requestId, error)                  → status='failed'
 *   consume(requestId)                      → 토스트 숨김 (result는 보존, 결과 화면에서 읽음)
 *   dismiss(requestId)                      → 항목 완전 제거 (X 버튼 등)
 *
 * 결과(result)는 토스트/알림 클릭 시 즉시 navigate하기 위해 메모리에 캐시한다.
 * navigation에 큰 JSON을 URL params로 직렬화하지 않고 store에서 직접 읽기 위함.
 * WS로 결과를 못 받았을 경우엔 호출부에서 pollAiResult로 보강.
 */

const Ctx = createContext(null);

const initialState = {
    jobs: {}, // { [requestId]: { type, status, requestPayload, result, error, submittedAt, completedAt } }
};

const reducer = (state, action) => {
    switch (action.type) {
        case 'submit': {
            const { requestId, jobType, requestPayload } = action;
            return {
                ...state,
                jobs: {
                    ...state.jobs,
                    [requestId]: {
                        type: jobType,
                        status: 'pending',
                        requestPayload,
                        submittedAt: Date.now(),
                    },
                },
            };
        }
        case 'complete': {
            const { requestId, result } = action;
            const existing = state.jobs[requestId];
            // 이 클라가 submit한 적 없는 잡(WS backlog 등)은 토스트로 띄우지 않는다.
            // 알림 탭에는 서버가 별도 저장하므로 사용자가 거기서 확인.
            if (!existing) return state;
            return {
                ...state,
                jobs: {
                    ...state.jobs,
                    [requestId]: {
                        ...existing,
                        status: 'complete',
                        result,
                        completedAt: Date.now(),
                    },
                },
            };
        }
        case 'fail': {
            const { requestId, error } = action;
            const existing = state.jobs[requestId];
            if (!existing) return state;
            return {
                ...state,
                jobs: {
                    ...state.jobs,
                    [requestId]: {
                        ...existing,
                        status: 'failed',
                        error,
                        completedAt: Date.now(),
                    },
                },
            };
        }
        case 'consume': {
            const existing = state.jobs[action.requestId];
            if (!existing) return state;
            return {
                ...state,
                jobs: {
                    ...state.jobs,
                    [action.requestId]: { ...existing, consumed: true },
                },
            };
        }
        case 'dismiss': {
            const next = { ...state.jobs };
            delete next[action.requestId];
            return { ...state, jobs: next };
        }
        case 'reset':
            return initialState;
        default:
            return state;
    }
};

export const AiJobProvider = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    // pending submit과 동시에 들어오는 빠른 WS 결과 처리를 위해 ref 미러도 둠
    const stateRef = useRef(state);
    stateRef.current = state;

    const submit = useCallback((requestId, jobType, requestPayload) => {
        dispatch({ type: 'submit', requestId, jobType, requestPayload });
    }, []);

    const complete = useCallback((requestId, result, jobType) => {
        dispatch({ type: 'complete', requestId, result, jobType });
    }, []);

    const fail = useCallback((requestId, error, jobType) => {
        dispatch({ type: 'fail', requestId, error, jobType });
    }, []);

    const consume = useCallback((requestId) => {
        dispatch({ type: 'consume', requestId });
    }, []);

    const dismiss = useCallback((requestId) => {
        dispatch({ type: 'dismiss', requestId });
    }, []);

    const reset = useCallback(() => dispatch({ type: 'reset' }), []);

    const getJob = useCallback((requestId) => stateRef.current.jobs[requestId], []);

    const value = useMemo(
        () => ({ jobs: state.jobs, submit, complete, fail, consume, dismiss, reset, getJob }),
        [state.jobs, submit, complete, fail, consume, dismiss, reset, getJob]
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAiJobStore = () => {
    const ctx = useContext(Ctx);
    if (!ctx) {
        throw new Error('useAiJobStore must be used inside <AiJobProvider>');
    }
    return ctx;
};

/**
 * 토스트 호스트가 보여줄 가장 최근 항목 하나만 골라 반환.
 * pending은 시작 직후 Alert으로 안내했으므로 토스트는 complete/failed만.
 */
export const selectActiveToast = (jobs) => {
    const entries = Object.entries(jobs).filter(([, j]) => !j.consumed);
    if (entries.length === 0) return null;

    const sorted = entries.sort((a, b) => {
        const ta = a[1].completedAt || a[1].submittedAt || 0;
        const tb = b[1].completedAt || b[1].submittedAt || 0;
        return tb - ta;
    });

    const failed = sorted.find(([, j]) => j.status === 'failed');
    if (failed) return { requestId: failed[0], ...failed[1] };

    const complete = sorted.find(([, j]) => j.status === 'complete');
    if (complete) return { requestId: complete[0], ...complete[1] };

    return null;
};
