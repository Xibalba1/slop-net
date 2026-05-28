import { spawn } from "node:child_process";

const processType = process.env.SLOPNET_PROCESS ?? "web";
const command = processType === "worker" ? ["npm", "run", "agents:worker"] : ["npm", "run", "start"];

const child = spawn(command[0], command.slice(1), {
  stdio: "inherit",
  env: process.env
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
