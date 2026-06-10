import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import locationReducer from './slices/locationSlice';
import categoriesReducer from './slices/categoriesSlice';
import placesReducer from './slices/placesSlice';
import postsReducer from './slices/postsSlice';

const store = configureStore({
  reducer: {
    user: userReducer,
    location: locationReducer,
    categories: categoriesReducer,
    places: placesReducer,
    posts: postsReducer,
  },
});

export default store;