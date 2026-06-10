import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchCategories } from "../src/api/category";

export const loadCategories = createAsyncThunk('categories/loadCategories', async () => {
  const data = await fetchCategories();
  return data;
});

const categoriesSlice = createSlice({
  name: 'categories',
  initialState: {
    data: [],
    status: 'idle',
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadCategories.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadCategories.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(loadCategories.rejected, (state) => {
        state.status = 'failed';
      });
  },
});

export default categoriesSlice.reducer;