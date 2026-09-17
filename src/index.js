#!/usr/bin/env node
import { resolve } from "node:path";
import { loadConfig, ConfigError } from "./config.js";
import { LogTailer } from "./tailer.js";
import { matchRules } from "./matcher.js";
import { createMailer } from "./mailer.js";

export class Throttle {
  constructor(ms) {
    this.ms = ms;
    this.lastSent = new Map();
  }

  allowed(key) {
    if (this.ms <= 0) return true;
    const now = Date.now();
    const last = this.lastSent.get(key) ?? 0;
    if (now - last < this.ms) return false;
    this.lastSent.set(key, now);
    return true;
  }
}

export async function main() {
  const configPath = resolve(process.argv[2] ?? "./config.json");

  let config;
  try {
    config = loadConfig(configPath);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`Config error: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  const mailer = createMailer(config.mail);
  if (!mailer) console.warn("[log-alert] No mail config provided — running in dry-run mode (no emails sent)");

  const throttle = new Throttle(config.throttleMs);
  const tailers = [];

  for (const log of config.logs) {
    const tailer = new LogTailer(log.path, { label: log.label });
    tailer.on("line", (line) => {
      const hits = matchRules(config.rules, line);
      if (hits.length === 0) return;

      for (const hit of hits) {
        const key = `${log.label}::${hit.rule.name}`;
        if (!throttle.allowed(key)) {
          console.log(`[throttled] ${key}: ${line}`);
          continue;
        }
        console.log(`[match] ${key}: ${line}`);
        if (mailer) {
          mailer
            .send({ file: log.label, rule: hit.rule.name, line, matchedText: hit.match })
            .then((info) => console.log(`[mail] sent ${info.messageId} for ${key}`))
            .catch((err) => console.error(`[mail] failed for ${key}: ${err.message}`));
        }
      }
    });
    tailer.on("error", (err) => console.error(`[tailer:${log.label}] ${err.message}`));
    tailers.push(tailer);
    tailer.start();
    console.log(`[log-alert] following ${log.label}`);
  }

  const shutdown = () => {
    console.log("[log-alert] shutting down");
    for (const t of tailers) t.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
