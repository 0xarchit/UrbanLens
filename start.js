const { spawn, execSync } = require("child_process");
const path = require("path");

// Prevent immediate closure on crash
process.on("uncaughtException", (err) => {
  console.error("\n[CRITICAL ERROR] Uncaught Exception:", err);
  console.log("Press Ctrl+C to exit...");
  setInterval(() => {}, 1000); // Keep process alive
});

console.log("========================================================");
console.log("       CITY ISSUE RESOLUTION SYSTEM - PREPARING");
console.log("========================================================\n");

console.log("[INFO] System URLs after startup:");
console.log("       Frontend: https://cityissue.0xarchit.is-a.dev");
console.log("       Backend:  https://0xarchit-city-issue.hf.space\n");
console.log("[INFO] Press Ctrl+C ONCE to stop all services and cleanup.\n");

// Paths
// Use relative paths to avoid issues with Spaces in Absolute Paths during shell execution
const cloudflaredDir = path.join("infra", "cloudflared");
const frontendDir = "Frontend";
const backendDir = "."; // Root

// --- 1. Initial Cleanup ---
console.log("[INFO] Ensuring clean slate (stopping old containers)...");
try {
  // Use cwd option with specific path for execSync (it handles spaces correctly)
  execSync("docker compose down", {
    cwd: path.join(__dirname, "infra", "cloudflared"),
    stdio: "ignore",
  });
} catch (e) {}

// --- 2. Define Commands ---
// We use simple shell commands but explicit paths where possible
// Note: 'call' is cmd specific, needed for activating venv
const commands = [
  // Infra
  { command: `cd "${cloudflaredDir}" && docker compose up --force-recreate` },
  // Backend - No CD needed as we are in root
  { command: `call .venv\\Scripts\\activate && python -m Backend.main` },
  // Frontend
  { command: `cd "${frontendDir}" && npm run build && npm run start` },
];

// Provide raw commands strings to concurrently
const concurrentArgs = commands.map((c) => c.command);

const names = "INFRA,BACKEND,FRONTEND";
const colors = "yellow,blue,magenta";

// --- 3. Run Concurrently ---
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
console.log(`[INFO] Spawning processes using ${npx}...`);

// Construct the full arguments string manually to avoid Node's argument escaping issues on Windows
// We want: npx concurrently "cmd1" "cmd2" ...
// We must escape inner quotes for the shell string
const finalArgs = [
  "concurrently",
  "--kill-others",
  "--names",
  names,
  "--prefix-colors",
  colors,
  ...concurrentArgs.map((cmd) => `"${cmd.replace(/"/g, '\\"')}"`), // Escape quotes inside the command, and wrap in quotes
];

// Spawn using the command executable and args array, but rely on shell correctly now?
// No, previous failure suggests array merging is bad.
// Let's use spawn with a SINGLE command string.

const fullCommand = `${npx} ${finalArgs.join(" ")}`;
console.log(`[DEBUG] Executing: ${fullCommand}`);

const concurrently = spawn(fullCommand, {
  stdio: "inherit",
  shell: true,
});

concurrently.on("error", (err) => {
  console.error("[ERROR] Failed to start concurrently:", err);
  console.log("Make sure Node.js and NPM are installed.");
});

// --- 4. Cleanup Logic ---
let isCleanedUp = false;

function cleanup() {
  if (isCleanedUp) return;
  isCleanedUp = true;

  console.log("\n========================================================");
  console.log("          SYSTEM STOPPED - CLEANING UP");
  console.log("========================================================");

  try {
    const absCloudflaredDir = path.join(__dirname, "infra", "cloudflared");
    execSync("docker compose down", {
      cwd: absCloudflaredDir,
      stdio: "inherit",
    });
    console.log("[SUCCESS] Cleanup complete.");
  } catch (e) {
    console.error("[ERROR] Cleanup failed:", e.message);
  }
  process.exit(0);
}

process.on("SIGINT", () => {
  console.log("\n[INFO] Gracefully stopping...");
  cleanup();
});

concurrently.on("exit", (code) => {
  cleanup();
});
