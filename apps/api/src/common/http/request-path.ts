/** Keep query values out of logs and public problem responses. */
export function requestPath(originalUrl: string): string {
  return originalUrl.split(/[?#]/, 1)[0] || "/";
}
