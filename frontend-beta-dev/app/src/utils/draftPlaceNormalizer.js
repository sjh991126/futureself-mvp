import { fetchPlacesByIds } from '../api/google_places';

export const normalizeDraftPlaces = (draftItinerary) => {
  if (!draftItinerary || !Array.isArray(draftItinerary)) return [];

  return draftItinerary.map((day) => ({
    ...day,
    places: (day?.places || []).map((place) => {
      if (typeof place === 'string') {
        return {
          id: place,
          name: '',
          address: '',
          latitude: 0,
          longitude: 0,
          _needsFetch: true,
        };
      }

      const normalized = {
        id: place?.id || place?.placeId || null,
        name: place?.name || place?.placeName || '',
        address: place?.address || place?.formattedAddress || '',
        latitude: place?.latitude || place?.lat || 0,
        longitude: place?.longitude || place?.lng || 0,
        imageUrl: place?.imageUrl || place?.photoUrl || place?.image || null,
        category: place?.category || null,
        ...place,
      };

      if (!normalized.imageUrls && normalized.imageUrl) {
        normalized.imageUrls = [normalized.imageUrl];
      }

      if (!normalized.name && !normalized.latitude && normalized.id) {
        normalized._needsFetch = true;
      }

      return normalized;
    }),
  }));
};

const normalizeFetchedPlace = (place) => {
  const normalized = {
    id: place?.id || place?.placeId || null,
    name: place?.name || place?.placeName || '',
    address: place?.address || place?.formattedAddress || '',
    latitude: place?.latitude || place?.lat || 0,
    longitude: place?.longitude || place?.lng || 0,
    imageUrl: place?.imageUrl || place?.photoUrl || place?.image || null,
    category: place?.category || null,
    ...place,
  };

  if (!normalized.imageUrls && normalized.imageUrl) {
    normalized.imageUrls = [normalized.imageUrl];
  }

  return normalized;
};

const extractPlaceList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.places)) return payload.places;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
};

export const hydrateDraftPlacesDetails = async (normalizedItinerary) => {
  if (!Array.isArray(normalizedItinerary)) return [];

  const idsToFetch = Array.from(
    new Set(
      normalizedItinerary
        .flatMap((day) => day?.places || [])
        .filter((place) => place?._needsFetch && place?.id)
        .map((place) => String(place.id))
    )
  );

  if (idsToFetch.length === 0) {
    return normalizedItinerary;
  }

  let fetchedMap = new Map();
  try {
    const fetched = await fetchPlacesByIds(idsToFetch);
    const placeList = extractPlaceList(fetched);
    fetchedMap = new Map(
      placeList
        .map(normalizeFetchedPlace)
        .filter((p) => p?.id)
        .map((p) => [String(p.id), p])
    );
  } catch (error) {
    console.error('Failed to fetch place details for restored draft:', error);
  }

  return normalizedItinerary.map((day) => ({
    ...day,
    places: (day?.places || []).map((place) => {
      if (!place?._needsFetch || !place?.id) return place;

      const fetched = fetchedMap.get(String(place.id));
      if (fetched) {
        return {
          ...place,
          ...fetched,
          _needsFetch: false,
          _fetchFailed: false,
        };
      }

      return {
        ...place,
        name: place.name || '정보 없음',
        address: place.address || '정보 없음',
        _needsFetch: false,
        _fetchFailed: true,
      };
    }),
  }));
};
