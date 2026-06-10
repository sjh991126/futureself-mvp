import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { TokenManager } from './../src/config';

export const fetchUser = createAsyncThunk('user/fetchUser', async () => {
  const userData = await TokenManager.getUserData();
  return userData;
});

const initialState = {
  data: null,
  status: 'idle',
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    updateUser: (state, action) => {
      state.data = action.payload;
    },
    clearUserData: (state) => {
      state.data = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchUser.rejected, (state) => {
        state.status = 'failed';
        state.data = null;
      });
  },
});

export const { updateUser, clearUserData } = userSlice.actions;
export default userSlice.reducer;