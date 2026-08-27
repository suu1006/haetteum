"use client";

import { useEffect } from "react";

import type { AuthUser } from "@/features/auth/auth-model";
import { useAuthStore } from "@/features/auth/auth-store";

export function AuthUserHydrator({ user }: { user: AuthUser }) {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

  useEffect(() => {
    setAuthenticated(user);
  }, [setAuthenticated, user]);

  return null;
}
