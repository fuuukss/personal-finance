import { test, expect } from "@playwright/test";

test("anonymous visitor is redirected to the owner login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: /Prijava|Sign in/ })).toBeVisible();
});

test("login page contains no registration flow", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("link", { name: /sign up|register|registr/i })).toHaveCount(0);
});

test("standard ConfirmationURL fragment is removed and submitted for recovery authorization", async ({ page }) => {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const jwt = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    sub: "00000000-0000-4000-8000-000000000001",
    session_id: "00000000-0000-4000-8000-000000000099",
    iat: now,
    exp: now + 3600,
    amr: [{ method: "otp", timestamp: now }],
  })}.test-signature`;

  const authorization = page.waitForRequest((request) => request.url().endsWith("/auth/recovery/authorize") && request.method() === "POST");
  await page.route("**/auth/recovery/authorize", (route) => route.fulfill({ status: 204 }));
  await page.route("**/reset-password", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Reset</title>" }));

  await page.goto(`/login#access_token=${encodeURIComponent(jwt)}&refresh_token=synthetic-refresh&type=recovery&expires_in=3600&token_type=bearer`);
  await authorization;
  await expect(page).toHaveURL(/\/reset-password$/);
  expect(await page.evaluate(() => window.location.hash)).toBe("");
});
