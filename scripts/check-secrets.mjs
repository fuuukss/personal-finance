import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";

const allowed = new Set([".env.example"]);
const candidates = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
const patterns = [
  ["Supabase service-role key", /(?:service_role|SUPABASE_SERVICE_ROLE_KEY)\s*[=:]\s*["']?[A-Za-z0-9_.-]{20,}/i],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9_]{30,}/],
  ["generic secret assignment", /(?:password|secret|api[_-]?key|access[_-]?token)\s*[=:]\s*["'][^"'\n]{12,}["']/i]
];
const findings = [];

for (const file of candidates) {
  if (/^\.env(?:\.|$)/.test(file) && !allowed.has(file)) findings.push(`${file}: environment file must not be committed`);
  if (!existsSync(file) || statSync(file).size > 2_000_000 || /\.(png|jpg|jpeg|woff2|ico|lock)$/i.test(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const [label, pattern] of patterns) if (pattern.test(text) && file !== ".env.example") findings.push(`${file}: possible ${label}`);
}

if (findings.length) {
  console.error("Secret scan failed:\n" + findings.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log(`Secret scan passed (${candidates.length} repository files checked).`);
