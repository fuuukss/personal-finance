import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clearRecoveryAuthorization, grantRecoveryAuthorization, isRecoveryAuthorizationConfigured } from "@/lib/auth/recovery-server";
import { isRecentImplicitRecoverySession, sessionIdFromAccessToken } from "@/lib/auth/recovery";

function noStore(status: number) {
  return new NextResponse(null, { status, headers: { "Cache-Control": "no-store" } });
}

function hasTrustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const configured = process.env.APP_ORIGIN;
  const fetchSite = request.headers.get("sec-fetch-site");
  try {
    const expected = configured ? new URL(configured).origin : request.nextUrl.origin;
    return Boolean(origin && new URL(origin).origin === expected && (!fetchSite || fetchSite === "same-origin"));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return noStore(403);
  if (!isRecoveryAuthorizationConfigured()) return noStore(503);

  let tokens: { accessToken?: unknown; refreshToken?: unknown };
  try {
    tokens = await request.json() as { accessToken?: unknown; refreshToken?: unknown };
  } catch {
    return noStore(400);
  }
  if (typeof tokens.accessToken !== "string" || tokens.accessToken.length < 20 || tokens.accessToken.length > 20_000
    || typeof tokens.refreshToken !== "string" || tokens.refreshToken.length < 8 || tokens.refreshToken.length > 2_000) {
    return noStore(400);
  }

  const supabase = await createSupabaseServerClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  const accessToken = sessionData.session?.access_token;
  const sessionId = sessionIdFromAccessToken(accessToken);

  if (sessionError || userError || !user || !sessionId || !isRecentImplicitRecoverySession(accessToken)) {
    if (sessionData.session) await supabase.auth.signOut({ scope: "local" });
    await clearRecoveryAuthorization();
    return noStore(403);
  }

  const { data: allowed, error: ownerError } = await supabase.rpc("is_current_owner");
  if (ownerError || !allowed) {
    await supabase.auth.signOut({ scope: "local" });
    await clearRecoveryAuthorization();
    return noStore(403);
  }

  try {
    await grantRecoveryAuthorization(user.id, sessionId);
    return noStore(204);
  } catch {
    await supabase.auth.signOut({ scope: "local" });
    return noStore(503);
  }
}
