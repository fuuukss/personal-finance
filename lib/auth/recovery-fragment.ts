export type StandardRecoveryFragment =
  | { kind: "none" }
  | { kind: "invalid" }
  | { kind: "recovery"; accessToken: string; refreshToken: string };

export function parseStandardRecoveryFragment(hash: string): StandardRecoveryFragment {
  if (!hash || hash === "#") return { kind: "none" };
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);

  if (params.has("sb") && (params.has("error") || params.has("error_code"))) {
    return { kind: "invalid" };
  }
  if (params.get("type") !== "recovery") return { kind: "none" };

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return { kind: "invalid" };
  return { kind: "recovery", accessToken, refreshToken };
}
