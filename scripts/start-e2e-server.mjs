import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const nextBin = resolve("node_modules/next/dist/bin/next");
const build = spawnSync(process.execPath, [nextBin, "build", "--webpack"], {
  env: process.env,
  stdio: "inherit",
});

if (build.status !== 0) process.exit(build.status ?? 1);

const server = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", "3100"], {
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
server.on("exit", (code) => process.exit(code ?? 0));
