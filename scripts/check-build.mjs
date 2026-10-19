import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), ".next", "static");
if (!existsSync(root)) {
  console.error("Static build output is missing. Run the production build first.");
  process.exit(1);
}
const patterns = [
  ["service-role credential", /(?:service_role|SUPABASE_SERVICE_ROLE_KEY)/i],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["owner allowlist identifier", /OWNER_AUTH_USER_UUID|owner_allowlist/i],
  ["financial export marker", /(?:account_number|broker_statement|real_financial_data)/i]
];
const findings = [];
for (const file of walk(root)) {
  if (!/\.(?:js|css|json|map|txt)$/i.test(file) || statSync(file).size > 10_000_000) continue;
  const content = readFileSync(file, "utf8");
  for (const [label, pattern] of patterns) if (pattern.test(content)) findings.push(`${file}: ${label}`);
}
if (findings.length) {
  console.error("Static build scan failed:\n" + findings.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
console.log("Static browser bundle scan passed.");

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
