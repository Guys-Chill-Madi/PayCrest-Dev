const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// ─── Service Definitions ────────────────────────────────────────────────────
// Ports match api-gateway/.env exactly
const services = [
  // Python / FastAPI microservices
  { name: "auth-service",         port: 3001, path: "./services/auth-service" },
  { name: "loan-service",         port: 3002, path: "./services/loan-service" },
  { name: "emi-service",          port: 3003, path: "./services/emi-service" },
  { name: "wallet-service",       port: 3004, path: "./services/wallet-service" },
  { name: "payment-service",      port: 3005, path: "./services/payment-service" },
  { name: "verification-service", port: 3006, path: "./services/verification-service" },
  { name: "admin-service",        port: 3007, path: "./services/admin-service" },
  { name: "manager-service",      port: 3008, path: "./services/manager-service" },

  // Node.js API Gateway
  { name: "api-gateway", port: 3000, path: "./api-gateway", isNode: true, nodeScript: "server.js" },

  // Vite frontend
  { name: "frontend", port: 5173, path: "./frontend", isFrontend: true },
];

// ─── Process Registry ────────────────────────────────────────────────────────
const runningProcesses = [];

// ─── Start a Single Service ──────────────────────────────────────────────────
function startService(service) {
  let command, args;

  if (service.isFrontend) {
    // npm run dev — Vite dev server
    command = "npm";
    args = ["run", "dev"];
  } else if (service.isNode) {
    command = "node";
    args = [service.nodeScript || "server.js"];
  } else {
    // Python FastAPI via uvicorn
    command = "python";
    args = [
      "-m", "uvicorn",
      "app.main:app",
      "--host", "0.0.0.0",
      "--port", String(service.port),
      "--reload",
    ];
  }

  const label = `[${service.name}:${service.port}]`;
  console.log(`🚀 Starting ${label}...`);

  const proc = spawn(command, args, {
    cwd: path.resolve(__dirname, service.path),
    stdio: "inherit",
    shell: true,
  });

  proc.on("error", (err) => {
    console.error(`❌ ${label} failed to start: ${err.message}`);
  });

  proc.on("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`⚠️  ${label} exited with code ${code}`);
    }
  });

  runningProcesses.push({ name: service.name, port: service.port, pid: proc.pid });
  return proc;
}

// ─── Start Everything (all in parallel) ─────────────────────────────────────
function startAll() {
  console.log("═══════════════════════════════════════════════");
  console.log(" Paycrest — Starting all services");
  console.log("═══════════════════════════════════════════════");

  for (const service of services) {
    startService(service);
  }

  // Give processes a moment to register their PIDs before writing
  setTimeout(() => {
    fs.writeFileSync(
      path.join(__dirname, "processes.json"),
      JSON.stringify(runningProcesses, null, 2)
    );
    console.log("\n✅ All services started — processes.json written");
    console.log("   Run `node stopall.js` to stop everything.\n");
    printTable();
  }, 500);
}

// ─── Pretty Table ────────────────────────────────────────────────────────────
function printTable() {
  console.log("┌─────────────────────────┬──────┬────────┐");
  console.log("│ Service                 │ Port │ PID    │");
  console.log("├─────────────────────────┼──────┼────────┤");
  for (const p of runningProcesses) {
    const name = p.name.padEnd(23);
    const port = String(p.port).padEnd(4);
    const pid  = String(p.pid ?? "—").padEnd(6);
    console.log(`│ ${name} │ ${port} │ ${pid} │`);
  }
  console.log("└─────────────────────────┴──────┴────────┘");
}

// ─── Graceful Exit ───────────────────────────────────────────────────────────
process.on("SIGINT", () => {
  console.log("\n🛑 SIGINT received — stopping startall.js (child processes keep running)");
  console.log("   Run `node stopall.js` to kill all services.");
  process.exit(0);
});

startAll();