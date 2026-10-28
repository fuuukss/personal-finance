import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clearRecoveryAuthorization, grantRecoveryAuthorization } from "@/lib/auth/recovery-server";
import { isRecoveryCallback, RECOVERY_PATH, sessionIdFromAccessToken } from "@/lib/auth/recovery";

function redirectWithoutCaching(request: NextRequest, path: string) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const recovery = isRecoveryCallback(
    request.nextUrl.searchParams.get("type"),
    request.nextUrl.searchParams.get("next"),
  );

  if (!code) {
    if (recovery) await clearRecoveryAuthorization();
    return redirectWithoutCaching(request, recovery ? `${RECOVERY_PATH}?error=invalid` : "/login");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    if (recovery) await clearRecoveryAuthorization();
    return redirectWithoutCaching(request, recovery ? `${RECOVERY_PATH}?error=invalid` : "/login");
  }

  if (recovery) {
    const user = data.user;
    const sessionId = sessionIdFromAccessToken(data.session?.access_token);
    const { data: allowed } = user ? await supabase.rpc("is_current_owner") : { data: false };
    if (!user || !sessionId || !allowed) {
      await supabase.auth.signOut({ scope: "local" });
      await clearRecoveryAuthorization();
      return redirectWithoutCaching(request, `${RECOVERY_PATH}?error=invalid`);
    }

    try {
      await grantRecoveryAuthorization(user.id, sessionId);
    } catch {
      await supabase.auth.signOut({ scope: "local" });
      return redirectWithoutCaching(request, `${RECOVERY_PATH}?error=configuration`);
    }
    return redirectWithoutCaching(request, RECOVERY_PATH);
  }

  return redirectWithoutCaching(request, "/");
}
