import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasRecoveryAuthorization } from "@/lib/auth/recovery-server";
import { getDictionary } from "@/lib/i18n/server";
import { RecoveryPasswordForm } from "@/components/recovery-password-form";
import { sessionIdFromAccessToken } from "@/lib/auth/recovery";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const { dictionary } = await getDictionary();
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  let authorized = false;

  if (user) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const sessionId = sessionIdFromAccessToken(session?.access_token);
      if (!sessionId) throw new Error("Missing recovery session.");
      const [{ data: allowed }, recoveryAuthorized] = await Promise.all([
        supabase.rpc("is_current_owner"),
        hasRecoveryAuthorization(user.id, sessionId),
      ]);
      authorized = Boolean(allowed && recoveryAuthorized);
    } catch {
      authorized = false;
    }
  }

  if (!authorized) {
    return <main className="login-shell">
      <section className="card login-card">
        <p className="eyebrow">{dictionary.appName}</p>
        <h1>{dictionary.invalidRecoveryTitle}</h1>
        <p className="muted" style={{ margin: "1rem 0" }}>{dictionary.invalidRecoveryMessage}</p>
        <Link className="button" href="/login" style={{ display: "block", textAlign: "center" }}>{dictionary.backToLogin}</Link>
      </section>
    </main>;
  }

  return <main className="login-shell"><RecoveryPasswordForm dictionary={dictionary} /></main>;
}
