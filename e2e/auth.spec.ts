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
