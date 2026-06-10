let currentEditingDraft = null;

const toPlaceId = (place) => {
    if (place == null) return null;
    if (typeof place === 'string' || typeof place === 'number') return place;
    if (typeof place === 'object') {
        return place.id ?? place.placeId ?? null;
    }
    return null;
};

const normalizeItinerary = (itinerary) => {
    if (!Array.isArray(itinerary)) return [];
    return itinerary.map((day) => {
        const sourcePlaces = Array.isArray(day?.places)
            ? day.places
            : (Array.isArray(day?.placesMeta) ? day.placesMeta : []);
        const places = sourcePlaces
            .map(toPlaceId)
            .filter((id) => id !== null && id !== undefined);

        return { places };
    });
};

export const normalizeTripListRequestDto = (raw) => {
    if (!raw || typeof raw !== 'object') return null;

    return {
        tripListId: raw.tripListId ?? null,
        name: raw.name ?? '',
        categoryId: raw.categoryId ?? null,
        imageUrl: raw.imageUrl ?? null,
        startDate: raw.startDate ?? null,
        endDate: raw.endDate ?? null,
        isPublic: raw.isPublic ?? false,
        itinerary: normalizeItinerary(raw.itinerary),
    };
};

export const setCurrentEditingDraft = (rawDraft) => {
    const normalized = normalizeTripListRequestDto(rawDraft);
    currentEditingDraft = normalized;
    return normalized;
};

export const getCurrentEditingDraft = () => currentEditingDraft;

export const clearCurrentEditingDraft = () => {
    currentEditingDraft = null;
};

