const fs = require("fs");

if (!fs.existsSync("processes.json")) {
  console.log("⚠️ No processes file found. Nothing to stop.");
  process.exit(0);
}

const processes = JSON.parse(fs.readFileSync("processes.json", "utf-8"));

const { execSync } = require("child_process");

processes.forEach((proc) => {
  try {
    console.log(`🛑 Stopping ${proc.name} (PID: ${proc.pid})`);
    if (process.platform === "win32") {
      execSync(`taskkill /F /T /PID ${proc.pid}`, { stdio: "ignore" });
    } else {
      process.kill(proc.pid);
    }
  } catch (err) {
    console.log(`⚠️ Failed to stop ${proc.name}:`, err.message);
  }
});

fs.unlinkSync("processes.json");

console.log("✅ All services stopped");