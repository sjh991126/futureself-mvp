import api from '../config';
import { endpoints } from './endpoints';

// Server enums (must be sent as exact strings).
export const REPORT_TARGET_TYPES = Object.freeze({
    USER: 'USER',
    POST: 'POST',
    COMMENT: 'COMMENT',
    REVIEW: 'REVIEW',
    HIGHLIGHT: 'HIGHLIGHT',
    CHAT_MESSAGE: 'CHAT_MESSAGE',
});

export const REPORT_REASONS = Object.freeze({
    SPAM: 'SPAM',
    HARASSMENT_OR_BULLYING: 'HARASSMENT_OR_BULLYING',
    HATE_SPEECH: 'HATE_SPEECH',
    NUDITY_OR_SEXUAL_CONTENT: 'NUDITY_OR_SEXUAL_CONTENT',
    VIOLENCE_OR_THREATS: 'VIOLENCE_OR_THREATS',
    SELF_HARM: 'SELF_HARM',
    ILLEGAL_ACTIVITY: 'ILLEGAL_ACTIVITY',
    INTELLECTUAL_PROPERTY: 'INTELLECTUAL_PROPERTY',
    MISINFORMATION: 'MISINFORMATION',
    IMPERSONATION: 'IMPERSONATION',
    OTHER: 'OTHER',
});

// Single source of truth for the picker UI: ordered, with user-facing labels.
export const REPORT_REASON_OPTIONS = [
    { value: REPORT_REASONS.HARASSMENT_OR_BULLYING, label: 'Bullying or harassment' },
    { value: REPORT_REASONS.HATE_SPEECH, label: 'Hate speech or symbols' },
    { value: REPORT_REASONS.NUDITY_OR_SEXUAL_CONTENT, label: 'Nudity or sexual content' },
    { value: REPORT_REASONS.VIOLENCE_OR_THREATS, label: 'Violence or threats' },
    { value: REPORT_REASONS.SELF_HARM, label: 'Suicide, self-injury, or eating disorder' },
    { value: REPORT_REASONS.SPAM, label: 'Spam' },
    { value: REPORT_REASONS.ILLEGAL_ACTIVITY, label: 'Sale of illegal or regulated goods' },
    { value: REPORT_REASONS.IMPERSONATION, label: 'Pretending to be someone else' },
    { value: REPORT_REASONS.INTELLECTUAL_PROPERTY, label: 'Intellectual property violation' },
    { value: REPORT_REASONS.MISINFORMATION, label: 'False information' },
    { value: REPORT_REASONS.OTHER, label: 'Something else' },
];

const isValidTargetType = (value) =>
    Object.values(REPORT_TARGET_TYPES).includes(value);

const isValidReason = (value) =>
    Object.values(REPORT_REASONS).includes(value);

// Submit a moderation report. Server emails the moderation inbox automatically.
// Throws if you try to report your own content (HTTP 400).
export const submitReport = async ({ targetType, targetId, reason, details }) => {
    if (!isValidTargetType(targetType)) {
        throw new Error(`submitReport: unknown targetType "${targetType}"`);
    }
    if (!isValidReason(reason)) {
        throw new Error(`submitReport: unknown reason "${reason}"`);
    }
    if (targetId === undefined || targetId === null || targetId === '') {
        throw new Error('submitReport: targetId is required');
    }

    const body = {
        targetType,
        targetId: typeof targetId === 'number' ? targetId : Number(targetId) || targetId,
        reason,
    };
    if (details && String(details).trim()) {
        body.details = String(details).trim().slice(0, 2000);
    }

    try {
        const response = await api.post(endpoints.reports(), body);
        return response.data;
    } catch (error) {
        console.error('Error submitting report:', error?.response?.data || error.message);
        throw error;
    }
};

export const getMyReports = async ({ page = 0, size = 20 } = {}) => {
    try {
        const response = await api.get(endpoints.reports('/my'), {
            params: { page, size },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching my reports:', error?.response?.data || error.message);
        throw error;
    }
};
