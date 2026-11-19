"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/lib/types";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  activeStoreId: number | null;
  setSession: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  setActiveStoreId: (storeId: number | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      activeStoreId: null,
      setSession: (token, user) =>
        set((state) => ({
          token,
          user,
          activeStoreId:
            state.activeStoreId ??
            (user.stores && user.stores.length > 0 ? user.stores[0].id : null),
        })),
      setUser: (user) => set({ user }),
      setActiveStoreId: (activeStoreId) => set({ activeStoreId }),
      clearSession: () => set({ token: null, user: null, activeStoreId: null }),
    }),
    {
      name: "enterprise-pos-auth",
    }
  )
);
