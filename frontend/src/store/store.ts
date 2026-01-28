import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth.slice';
import { authApi } from './api/auth.api';
import { schedulesApi } from './api/schedulesApi';
import { usersApi } from './api/users.api';
import { departmentsApi } from './api/departmentsApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [schedulesApi.reducerPath]: schedulesApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [departmentsApi.reducerPath]: departmentsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      schedulesApi.middleware,
      usersApi.middleware,
      departmentsApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
