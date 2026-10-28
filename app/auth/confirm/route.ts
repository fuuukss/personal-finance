import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clearRecoveryAuthorization, grantRecoveryAuthorization } from "@/lib/auth/recovery-server";
import { isRecoveryCallback, RECOVERY_PATH, sessionIdFromAccessToken } from "@/lib/auth/recovery";

function recoveryRedirect(request: NextRequest, suffix = "") {
  const response = NextResponse.redirect(new URL(`${RECOVERY_PATH}${suffix}`, request.url));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = request.nextUrl.searchParams.get("next");

  if (!tokenHash || !isRecoveryCallback(type, next)) {
    await clearRecoveryAuthorization();
    return recoveryRedirect(request, "?error=invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
  const sessionId = sessionIdFromAccessToken(data.session?.access_token);
  if (error || !data.user || !sessionId) {
    await clearRecoveryAuthorization();
    return recoveryRedirect(request, "?error=invalid");
  }

  const { data: allowed } = await supabase.rpc("is_current_owner");
  if (!allowed) {
    await supabase.auth.signOut({ scope: "local" });
    await clearRecoveryAuthorization();
    return recoveryRedirect(request, "?error=invalid");
  }

  try {
    await grantRecoveryAuthorization(data.user.id, sessionId);
  } catch {
    await supabase.auth.signOut({ scope: "local" });
    return recoveryRedirect(request, "?error=configuration");
  }

  return recoveryRedirect(request);
}
