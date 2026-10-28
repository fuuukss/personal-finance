import { describe, expect, it } from "vitest";
import {
  createRecoveryAuthorization,
  isRecoveryCallback,
  RECOVERY_MAX_AGE_SECONDS,
  sessionIdFromAccessToken,
  verifyRecoveryAuthorization,
  validateRecoveryPasswords,
} from "@/lib/auth/recovery";

const signingKey = ["test-only", "recovery-key", "longer-than-thirty-two-characters"].join("-");
const userId = "00000000-0000-4000-8000-000000000001";
const sessionId = "00000000-0000-4000-8000-000000000099";

describe("password recovery authorization", () => {
  it("accepts an unexpired marker for the same user", () => {
    const now = Date.UTC(2026, 9, 28);
    const marker = createRecoveryAuthorization(userId, sessionId, signingKey, now);
    expect(verifyRecoveryAuthorization(marker, userId, sessionId, signingKey, now + 1_000)).toBe(true);
  });

  it("rejects markers for another user, tampering, and expiry", () => {
    const now = Date.UTC(2026, 9, 28);
    const marker = createRecoveryAuthorization(userId, sessionId, signingKey, now);
    expect(verifyRecoveryAuthorization(marker, "00000000-0000-4000-8000-000000000002", sessionId, signingKey, now)).toBe(false);
    expect(verifyRecoveryAuthorization(marker, userId, "another-session", signingKey, now)).toBe(false);
    expect(verifyRecoveryAuthorization(`${marker}x`, userId, sessionId, signingKey, now)).toBe(false);
    expect(verifyRecoveryAuthorization(marker, userId, sessionId, signingKey, now + (RECOVERY_MAX_AGE_SECONDS + 1) * 1_000)).toBe(false);
  });

  it("requires a strong server-only signing secret", () => {
    expect(() => createRecoveryAuthorization(userId, sessionId, "too-short")).toThrow(/32 characters/);
  });

  it("extracts the stable Supabase session identifier from a JWT", () => {
    const header = Buffer.from(JSON.stringify({ alg: "RS256" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ session_id: sessionId })).toString("base64url");
    expect(sessionIdFromAccessToken(`${header}.${payload}.signature`)).toBe(sessionId);
    expect(sessionIdFromAccessToken("not-a-jwt")).toBeNull();
  });
});

describe("password recovery inputs", () => {
  it("requires at least 12 matching characters", () => {
    expect(validateRecoveryPasswords("short", "short")).toMatch(/12/);
    expect(validateRecoveryPasswords("a-secure-password", "different-password")).toMatch(/podudaraju/);
    expect(validateRecoveryPasswords("a-secure-password", "a-secure-password")).toBeNull();
  });

  it("only recognizes the fixed recovery callback destination", () => {
    expect(isRecoveryCallback("recovery", "/reset-password")).toBe(true);
    expect(isRecoveryCallback("signup", "/reset-password")).toBe(false);
    expect(isRecoveryCallback("recovery", "https://attacker.example")).toBe(false);
  });
});
