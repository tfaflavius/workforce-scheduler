import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth.slice';
import { authApi } from './api/auth.api';
import { schedulesApi } from './api/schedulesApi';
import { usersApi } from './api/users.api';
import { departmentsApi } from './api/departmentsApi';
import { notificationsApi } from './api/notifications.api';
import { shiftSwapsApi } from './api/shiftSwaps.api';
import { leaveRequestsApi } from './api/leaveRequests.api';
import { parkingApi } from './api/parking.api';
import { handicapApi } from './api/handicap.api';
import { domiciliuApi } from './api/domiciliu.api';
import { dailyReportsApi } from './api/dailyReports.api';
import { timeTrackingApi } from './api/time-tracking.api';
import { acquisitionsApi } from './api/acquisitions.api';
import { pvDisplayApi } from './api/pvDisplay.api';

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
    [parkingApi.reducerPath]: parkingApi.reducer,
    [handicapApi.reducerPath]: handicapApi.reducer,
    [domiciliuApi.reducerPath]: domiciliuApi.reducer,
    [dailyReportsApi.reducerPath]: dailyReportsApi.reducer,
    [timeTrackingApi.reducerPath]: timeTrackingApi.reducer,
    [acquisitionsApi.reducerPath]: acquisitionsApi.reducer,
    [pvDisplayApi.reducerPath]: pvDisplayApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      schedulesApi.middleware,
      usersApi.middleware,
      departmentsApi.middleware,
      notificationsApi.middleware,
      shiftSwapsApi.middleware,
      leaveRequestsApi.middleware,
      parkingApi.middleware,
      handicapApi.middleware,
      domiciliuApi.middleware,
      dailyReportsApi.middleware,
      timeTrackingApi.middleware,
      acquisitionsApi.middleware,
      pvDisplayApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
