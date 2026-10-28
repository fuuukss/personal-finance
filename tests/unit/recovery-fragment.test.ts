import { describe, expect, it } from "vitest";
import { parseStandardRecoveryFragment } from "@/lib/auth/recovery-fragment";

describe("standard Supabase ConfirmationURL recovery fragments", () => {
  it("extracts the implicit session returned by the unmodified template", () => {
    expect(parseStandardRecoveryFragment("#access_token=a&refresh_token=r&type=recovery&expires_in=3600&token_type=bearer")).toEqual({
      kind: "recovery",
      accessToken: "a",
      refreshToken: "r",
    });
  });

  it("rejects incomplete, expired, and unrelated fragments", () => {
    expect(parseStandardRecoveryFragment("#type=recovery&access_token=missing-refresh")).toEqual({ kind: "invalid" });
    expect(parseStandardRecoveryFragment("#error=access_denied&error_code=otp_expired&sb=")).toEqual({ kind: "invalid" });
    expect(parseStandardRecoveryFragment("#type=signup&access_token=value&refresh_token=value")).toEqual({ kind: "none" });
    expect(parseStandardRecoveryFragment("")).toEqual({ kind: "none" });
  });
});
