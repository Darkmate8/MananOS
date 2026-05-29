import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandMMKVStorage } from '@/lib/mmkv';
import { supabase } from '@/lib/supabaseClient';

interface AuthState {
  userId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInAnonymously: () => Promise<void>;
  rehydrateSession: () => Promise<void>;
  signOut: () => Promise<void>;
  _setUserId: (id: string | null) => void;
}

// Stored outside the store so it's never duplicated across rehydrateSession calls
let authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      userId: null,
      isLoading: true,
      isAuthenticated: false,

      _setUserId: (id) =>
        set({ userId: id, isAuthenticated: id !== null, isLoading: false }),

      rehydrateSession: async () => {
        set({ isLoading: true });
        const { data } = await supabase.auth.getSession();
        const id = data.session?.user.id ?? null;
        set({ userId: id, isAuthenticated: id !== null, isLoading: false });

        // Tear down any existing listener before registering a new one
        authSubscription?.unsubscribe();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          get()._setUserId(session?.user.id ?? null);
        });
        authSubscription = subscription;
      },

      signInAnonymously: async () => {
        set({ isLoading: true });
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          set({ isLoading: false });
          throw error;
        }
        set({
          userId: data.user?.id ?? null,
          isAuthenticated: data.user !== null,
          isLoading: false,
        });
      },

      signOut: async () => {
        set({ isLoading: true });
        authSubscription?.unsubscribe();
        authSubscription = null;
        await supabase.auth.signOut();
        set({ userId: null, isAuthenticated: false, isLoading: false });
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({ userId: state.userId, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
