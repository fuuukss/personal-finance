import "server-only";

import { cookies } from "next/headers";
import {
  createRecoveryAuthorization,
  RECOVERY_COOKIE_NAME,
  RECOVERY_MAX_AGE_SECONDS,
  RECOVERY_PATH,
  verifyRecoveryAuthorization,
} from "@/lib/auth/recovery";

function recoverySecret() {
  const secret = process.env.AUTH_RECOVERY_SECRET ?? "";
  if (secret.length < 32) throw new Error("Recovery authorization is not configured.");
  return secret;
}

export function isRecoveryAuthorizationConfigured() {
  return (process.env.AUTH_RECOVERY_SECRET ?? "").length >= 32;
}

export async function grantRecoveryAuthorization(userId: string, sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(RECOVERY_COOKIE_NAME, createRecoveryAuthorization(userId, sessionId, recoverySecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: RECOVERY_PATH,
    maxAge: RECOVERY_MAX_AGE_SECONDS,
  });
}

export async function hasRecoveryAuthorization(userId: string, sessionId: string) {
  const token = (await cookies()).get(RECOVERY_COOKIE_NAME)?.value;
  return verifyRecoveryAuthorization(token, userId, sessionId, recoverySecret());
}

export async function clearRecoveryAuthorization() {
  (await cookies()).set(RECOVERY_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: RECOVERY_PATH,
    maxAge: 0,
  });
}
