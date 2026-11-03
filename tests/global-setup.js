import { execSync } from "node:child_process";

// Re-seed the emulator before every run so tests start from the same data.
export default async function () {
  try {
    await fetch("http://127.0.0.1:9000/.json?ns=life-care-app-64d04-default-rtdb");
  } catch {
    throw new Error("Firebase emulator not running. Start it with: npm run emulator");
  }
  execSync("node scripts/seed-emulator.mjs", { stdio: "inherit" });
}
