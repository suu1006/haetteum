import type { ReactNode } from "react";

import { requireCurrentUser } from "@/features/auth/auth-server";

export default async function ChatLayout({ children }: { children: ReactNode }) {
  await requireCurrentUser("/chat");
  return children;
}
