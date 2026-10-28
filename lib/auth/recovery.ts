import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const RECOVERY_COOKIE_NAME = "saldo_recovery_authorization";
export const RECOVERY_MAX_AGE_SECONDS = 10 * 60;
export const RECOVERY_PATH = "/reset-password";

type RecoveryAuthorization = {
  sub: string;
  sid: string;
  exp: number;
  nonce: string;
};

function requireStrongSecret(secret: string) {
  if (secret.length < 32) throw new Error("AUTH_RECOVERY_SECRET must contain at least 32 characters.");
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createRecoveryAuthorization(userId: string, sessionId: string, secret: string, now = Date.now()) {
  requireStrongSecret(secret);
  if (!sessionId || sessionId.length > 200) throw new Error("A valid recovery session is required.");
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    sid: sessionId,
    exp: Math.floor(now / 1000) + RECOVERY_MAX_AGE_SECONDS,
    nonce: randomBytes(16).toString("base64url"),
  } satisfies RecoveryAuthorization)).toString("base64url");

  return `${payload}.${signature(payload, secret)}`;
}

export function verifyRecoveryAuthorization(token: string | undefined, userId: string, sessionId: string, secret: string, now = Date.now()) {
  requireStrongSecret(secret);
  if (!token) return false;

  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return false;

  const expectedSignature = signature(payload, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;

  try {
    const authorization = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<RecoveryAuthorization>;
    return authorization.sub === userId
      && authorization.sid === sessionId
      && typeof authorization.exp === "number"
      && authorization.exp > Math.floor(now / 1000)
      && typeof authorization.nonce === "string"
      && authorization.nonce.length >= 16;
  } catch {
    return false;
  }
}

export function sessionIdFromAccessToken(accessToken: string | undefined) {
  if (!accessToken) return null;
  const payload = accessToken.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { session_id?: unknown };
    return typeof claims.session_id === "string" && claims.session_id.length > 0 && claims.session_id.length <= 200
      ? claims.session_id
      : null;
  } catch {
    return null;
  }
}

export function validateRecoveryPasswords(password: string, confirmation: string) {
  if (password.length < 12 || password.length > 128) {
    return "Lozinka mora imati između 12 i 128 karaktera.";
  }
  if (password !== confirmation) return "Lozinke se ne podudaraju.";
  return null;
}

export function isRecoveryCallback(type: string | null, next: string | null) {
  return type === "recovery" && next === RECOVERY_PATH;
}
