import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const css = readFileSync(join(root, "app/globals.css"), "utf8");
const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
const manifest = readFileSync(join(root, "app/manifest.ts"), "utf8");

describe("mobile safe-area contract", () => {
  it("uses the iOS viewport cover mode and standalone PWA display", () => {
    expect(layout).toContain('viewportFit: "cover"');
    expect(manifest).toContain('display: "standalone"');
  });

  it("keeps page content below the status bar", () => {
    expect(css).toContain("env(safe-area-inset-top)");
    expect(css).toMatch(/\.page\s*\{[^}]*safe-area-inset-top/s);
  });

  it("anchors navigation to the safe bottom edge without a floating gap", () => {
    expect(css).toMatch(/\.nav\s*\{[^}]*bottom:0;/s);
    expect(css).toMatch(/\.nav\s*\{[^}]*safe-area-inset-bottom/s);
  });

  it("keeps sheets and the floating action button above the home indicator", () => {
    expect(css).toMatch(/\.sheet\s*\{[^}]*safe-area-inset-bottom/s);
    expect(css).toMatch(/\.fab\s*\{[^}]*safe-area-inset-bottom/s);
  });
});
