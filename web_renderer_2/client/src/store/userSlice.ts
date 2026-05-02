import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DeviceInfo } from '../types';

interface UserState {
  onlineCount: number;
  devices: DeviceInfo[];
  wsConnected: boolean;
}

const initialState: UserState = {
  onlineCount: 0,
  devices: [],
  wsConnected: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    updateUserStatus(
      state,
      action: PayloadAction<{ onlineCount: number; devices: DeviceInfo[] }>
    ) {
      state.onlineCount = action.payload.onlineCount;
      state.devices = action.payload.devices;
    },

    setWsConnected(state, action: PayloadAction<boolean>) {
      state.wsConnected = action.payload;
    },
  },
});

export const { updateUserStatus, setWsConnected } = userSlice.actions;
export default userSlice.reducer;
