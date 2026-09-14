import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import {
  BlockedUsersResponseSchema,
  type BlockedUsersResponse,
} from "@haetteum/contracts";
import { BlockedUsers } from "@/features/profile/components/blocked-users";
import { requireCurrentUser } from "@/features/auth/auth-server";
import { getServerApiBaseUrl } from "@/lib/api-base";

export const metadata: Metadata = { title: "차단한 사용자 | 해뜸" };
export default async function BlockedUsersPage() {
  await requireCurrentUser("/mypage/blocked-users");
  const cookie = (await headers()).get("cookie");
  let data: BlockedUsersResponse | null = null;
  try {
    const response = await fetch(`${getServerApiBaseUrl()}/user-blocks`, {
      cache: "no-store",
      headers: cookie ? { Cookie: cookie } : {},
    });
    if (response.ok)
      data = BlockedUsersResponseSchema.parse(await response.json());
  } catch {
    /* Render a retry path instead of treating a failed load as an empty list. */
  }
  return (
    <main className="mx-auto min-h-screen max-w-[30rem] space-y-6 bg-background px-6 py-8">
      <Link
        href="/mypage"
        className="inline-block min-h-11 content-center text-primary"
      >
        마이페이지로
      </Link>
      <h1 className="type-title-lg">차단한 사용자</h1>
      {data ? (
        <BlockedUsers items={data.items} />
      ) : (
        <div role="alert">
          <p>차단 목록을 불러오지 못했어요.</p>
          <Link
            href="/mypage/blocked-users"
            className="inline-block py-3 text-primary"
          >
            다시 시도
          </Link>
        </div>
      )}
    </main>
  );
}
