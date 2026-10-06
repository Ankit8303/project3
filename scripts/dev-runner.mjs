import { spawn, execSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");

try {
  if (process.loadEnvFile) {
    process.loadEnvFile(path.join(root, ".env"));
  }
} catch {}

const services = [
  { name: "auth", port: 5000, cwd: "services/auth", cmd: "node", args: ["dist/index.js"], color: "\x1b[35m" },
  { name: "restaurant", port: 5001, cwd: "services/restaurant", cmd: "node", args: ["dist/index.js"], color: "\x1b[32m" },
  { name: "utils", port: 5002, cwd: "services/utils", cmd: "node", args: ["dist/index.js"], color: "\x1b[33m" },
  { name: "realtime", port: 5004, cwd: "services/realtime", cmd: "node", args: ["dist/index.js"], color: "\x1b[34m" },
  { name: "rider", port: 5005, cwd: "services/rider", cmd: "node", args: ["dist/index.js"], color: "\x1b[36m" },
  { name: "admin", port: 5006, cwd: "services/admin", cmd: "node", args: ["dist/index.js"], color: "\x1b[90m" },
  { name: "frontend", port: 5173, cwd: "frontend", cmd: process.platform === "win32" ? "npm.cmd" : "npm", args: ["run", "dev", "--", "--host"], color: "\x1b[31m" },
];

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

console.log(`${BOLD}🍅 Starting Tomato Microservices & Frontend Stack...${RESET}\n`);

const children = [];

function killTree(pid) {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(-pid, "SIGTERM");
    }
  } catch {}
}

function cleanup() {
  console.log(`\n${BOLD}Shutting down all services...${RESET}`);
  for (const child of children) {
    if (child?.pid) {
      killTree(child.pid);
    }
  }
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", () => {
  for (const child of children) {
    if (child?.pid) killTree(child.pid);
  }
});

for (const svc of services) {
  const fullCwd = path.join(root, svc.cwd);
  const child = spawn(svc.cmd, svc.args, {
    cwd: fullCwd,
    env: { ...process.env, PORT: String(svc.port) },
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

  children.push(child);

  const prefix = `${svc.color}[${svc.name}:${svc.port}]${RESET} `;

  child.stdout.on("data", (chunk) => {
    const lines = chunk.toString().split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      console.log(`${prefix}${line}`);
    }
  });

  child.stderr.on("data", (chunk) => {
    const lines = chunk.toString().split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      console.error(`${prefix}\x1b[31m${line}${RESET}`);
    }
  });

  child.on("exit", (code, signal) => {
    console.log(`${prefix}exited with code ${code ?? signal}`);
  });
}

// Health check verification after 5 seconds
setTimeout(async () => {
  console.log(`\n${BOLD}🔍 Verifying service health status...${RESET}`);
  for (const svc of services) {
    if (svc.name === "frontend") continue;
    try {
      const res = await fetch(`http://127.0.0.1:${svc.port}/health`);
      if (res.ok) {
        const body = await res.json();
        console.log(`  \x1b[32m✔ ${svc.name} (${svc.port}) is HEALTHY\x1b[0m ->`, body);
      } else {
        console.log(`  \x1b[33m⚠ ${svc.name} (${svc.port}) returned HTTP ${res.status}\x1b[0m`);
      }
    } catch (err) {
      console.log(`  \x1b[31m✖ ${svc.name} (${svc.port}) unreachable: ${err.message}\x1b[0m`);
    }
  }

  try {
    const fe = await fetch(`http://127.0.0.1:5173`);
    if (fe.ok) {
      console.log(`  \x1b[32m✔ frontend (5173) is READY at http://localhost:5173\x1b[0m`);
    }
  } catch (err) {
    console.log(`  \x1b[33m⏳ frontend (5173) still starting up\x1b[0m`);
  }

  console.log(`\n${BOLD}🎉 All systems operational! Press Ctrl+C to stop all services.${RESET}\n`);
}, 6000);
