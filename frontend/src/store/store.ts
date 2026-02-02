import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth.slice';
import { authApi } from './api/auth.api';
import { schedulesApi } from './api/schedulesApi';
import { usersApi } from './api/users.api';
import { departmentsApi } from './api/departmentsApi';
import { notificationsApi } from './api/notifications.api';
import { shiftSwapsApi } from './api/shiftSwaps.api';
import { leaveRequestsApi } from './api/leaveRequests.api';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [schedulesApi.reducerPath]: schedulesApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [departmentsApi.reducerPath]: departmentsApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,
    [shiftSwapsApi.reducerPath]: shiftSwapsApi.reducer,
    [leaveRequestsApi.reducerPath]: leaveRequestsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      schedulesApi.middleware,
      usersApi.middleware,
      departmentsApi.middleware,
      notificationsApi.middleware,
      shiftSwapsApi.middleware,
      leaveRequestsApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
