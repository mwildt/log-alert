import { spawn } from "node:child_process";

export function createJarParser(jarPath) {
  if (!jarPath) return null;

  return {
    jarPath,

    async transformLine(line) {
      return new Promise((resolve, reject) => {
        const child = spawn("java", ["-jar", jarPath], { stdio: ["pipe", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => {
          stdout += chunk.toString("utf8");
        });
        child.stderr.on("data", (chunk) => {
          stderr += chunk.toString("utf8");
        });
        child.on("error", reject);
        child.on("close", (code) => {
          if (code !== 0) {
            reject(new Error(`jar parser exited ${code}: ${stderr.trim()}`));
            return;
          }
          resolve(stdout.replace(/\r?\n$/, ""));
        });
        child.stdin.write(line + "\n");
        child.stdin.end();
      });
    },
  };
}
