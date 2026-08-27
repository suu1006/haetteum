"use client";

import { useEffect } from "react";

import { loadCurrentUser } from "@/features/auth/auth-client";
import { useAuthStore } from "@/features/auth/auth-store";

export function AuthBootstrap() {
  const status = useAuthStore((state) => state.status);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);

  useEffect(() => {
    if (status !== "unknown") return;

    let cancelled = false;
    void loadCurrentUser()
      .then((user) => {
        if (cancelled) return;
        if (user) {
          setAuthenticated(user);
        } else {
          setAnonymous();
        }
      })
      .catch(() => {
        if (!cancelled) setAnonymous();
      });

    return () => {
      cancelled = true;
    };
  }, [setAnonymous, setAuthenticated, status]);

  return null;
}
