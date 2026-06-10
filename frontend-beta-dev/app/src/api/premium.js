import api from '../config';
import { endpoints } from './endpoints';

// ── Hotels ──────────────────────────────────────────────────────────────
export const searchHotels = async ({ area, minPrice, maxPrice } = {}) => {
    const res = await api.get(endpoints.hotels(), { params: { area, minPrice, maxPrice } });
    return res.data;
};

export const getHotelDeals = async () => {
    const res = await api.get(endpoints.hotels('/deals'));
    return res.data;
};

export const getHotelDetail = async (id) => {
    const res = await api.get(endpoints.hotels(`/${id}`));
    return res.data;
};

export const getHotelReviews = async (id) => {
    const res = await api.get(endpoints.hotels(`/${id}/reviews`));
    return res.data;
};

// ── Flights ─────────────────────────────────────────────────────────────
export const searchFlights = async ({ from = 'HKG', to, roundTrip = true }) => {
    const res = await api.get(endpoints.flights(), { params: { from, to, roundTrip } });
    return res.data;
};

// ── Bookings ────────────────────────────────────────────────────────────
export const quoteBooking = async (payload) => {
    const res = await api.post(endpoints.bookings('/quote'), payload);
    return res.data;
};

export const createBooking = async (payload) => {
    const res = await api.post(endpoints.bookings(), payload);
    return res.data;
};

export const confirmBooking = async ({ bookingId, paymentLabel }) => {
    const res = await api.post(endpoints.bookings('/confirm'), { bookingId, paymentLabel });
    return res.data;
};

export const getMyBookings = async () => {
    const res = await api.get(endpoints.bookings());
    return res.data;
};

export const getBooking = async (id) => {
    const res = await api.get(endpoints.bookings(`/${id}`));
    return res.data;
};

// ── Payment methods ─────────────────────────────────────────────────────
export const getCards = async () => {
    const res = await api.get(endpoints.paymentMethods());
    return res.data;
};

export const addCard = async ({ holderName, cardNumber, expiry, cvv }) => {
    const res = await api.post(endpoints.paymentMethods(), { holderName, cardNumber, expiry, cvv });
    return res.data;
};
