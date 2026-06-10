import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loadPlaces, load100Places } from '../src/api/places';

export const fetchPlaces = createAsyncThunk('places/fetchPlaces', async () => {
    const response = await load100Places();
    return response.filter(place => place && place.name && place.markerType == 1);
});

const placesSlice = createSlice({
    name: 'places',
    initialState: {
        places: [],
        isLoading: false,
    },
    reducers: {
        setPlaces: (state, action) => {
            state.places = action.payload;
        },
        setLoading: (state, action) => {
            state.isLoading = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPlaces.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchPlaces.fulfilled, (state, action) => {
                state.places = action.payload;
                state.isLoading = false;
            })
            .addCase(fetchPlaces.rejected, (state) => {
                state.isLoading = false;
            });
    },
});

export const { setPlaces, setLoading } = placesSlice.actions;
export default placesSlice.reducer;