import { getApiBaseUrl } from "@/lib/api-base";

export async function mutateModeration(
  path: string,
  method: "POST" | "DELETE",
  body?: unknown,
): Promise<void> {
  const base = getApiBaseUrl();
  if (!base)
    throw new Error("요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      credentials: "include",
      ...(body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
  } catch {
    throw new Error("연결을 확인하고 다시 시도해 주세요.");
  }
  if (response.status === 401)
    throw new Error("로그인이 필요해요. 다시 로그인해 주세요.");
  if (response.status === 409) throw new Error("이미 신고한 후기입니다.");
  if (response.status === 404)
    throw new Error(
      "후기 또는 사용자를 찾을 수 없어요. 화면을 새로고침해 주세요.",
    );
  if (!response.ok)
    throw new Error("요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
}
