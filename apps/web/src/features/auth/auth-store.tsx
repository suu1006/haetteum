"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useState,
} from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";

import type { AuthState, AuthUser } from "@/features/auth/auth-model";

type AuthActions = {
  setAuthenticated: (user: AuthUser) => void;
  setAnonymous: () => void;
};

export type AuthStore = AuthState & AuthActions;

type AuthStoreApi = StoreApi<AuthStore>;

const AuthStoreContext = createContext<AuthStoreApi | null>(null);

function createAuthStore(): AuthStoreApi {
  return createStore<AuthStore>()((set) => ({
    status: "unknown",
    user: null,
    setAuthenticated: (user) => set({ status: "authenticated", user }),
    setAnonymous: () => set({ status: "anonymous", user: null }),
  }));
}

export function AuthStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createAuthStore);

  return (
    <AuthStoreContext.Provider value={store}>
      {children}
    </AuthStoreContext.Provider>
  );
}

export function useAuthStore<T>(selector: (state: AuthStore) => T): T {
  const store = useContext(AuthStoreContext);
  if (store === null) {
    throw new Error("useAuthStore must be used within AuthStoreProvider.");
  }
  return useStore(store, selector);
}
