export async function register() {
  const { logPublicWebEnvironmentStatus } = await import("@/lib/environment-contract");
  logPublicWebEnvironmentStatus();
}
