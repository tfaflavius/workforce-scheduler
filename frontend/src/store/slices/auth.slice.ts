import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../types/user.types';
import { supabase } from '../../lib/supabase';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

// Check for existing session on app load
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔐 Initializing auth...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        return null;
      }

      console.log('📦 Session:', session ? 'exists' : 'null');

      if (session) {
        console.log('🎫 Token (first 20 chars):', session.access_token.substring(0, 20));
        console.log('⏰ Token expires at:', new Date(session.expires_at! * 1000).toLocaleString());

        // Get user data from backend
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        console.log('📡 Backend /auth/me response:', response.status);

        if (response.ok) {
          const user = await response.json();
          console.log('✅ User loaded:', user.email);
          return { user, token: session.access_token };
        } else {
          const errorText = await response.text();
          console.error('❌ Backend error:', errorText);
        }
      }
      return null;
    } catch (error) {
      console.error('❌ Initialize auth error:', error);
      return rejectWithValue('Failed to initialize auth');
    }
  }
);

// Logout with Supabase
export const logoutAsync = createAsyncThunk(
  'auth/logoutAsync',
  async () => {
    await supabase.auth.signOut();
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    updateToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
        }
        state.isLoading = false;
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });
  },
});

export const { setCredentials, updateToken, logout, setLoading } = authSlice.actions;
export default authSlice.reducer;
