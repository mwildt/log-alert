import { readFileSync } from "node:fs";
import { extname, isAbsolute, resolve } from "node:path";

export class ConfigError extends Error {}

export function loadConfig(configPath) {
  if (!configPath) throw new ConfigError("No config path provided");

  let raw;
  try {
    raw = readFileSync(configPath, "utf8");
  } catch (err) {
    throw new ConfigError(`Cannot read config file: ${configPath} (${err.message})`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new ConfigError(`Invalid JSON in config: ${err.message}`);
  }

  return normalizeConfig(parsed, configPath);
}

export function normalizeConfig(parsed, configPath) {
  const baseDir = configPath ? resolve(configPath, "..") : process.cwd();

  const logs = Array.isArray(parsed.logs) ? parsed.logs : [];
  if (logs.length === 0) throw new ConfigError("Config must define at least one log in 'logs'");

  const normalizedLogs = logs.map((entry, i) => {
    if (!entry || typeof entry !== "object" || !entry.path) {
      throw new ConfigError(`logs[${i}] is missing a 'path'`);
    }
    const abs = isAbsolute(entry.path) ? entry.path : resolve(baseDir, entry.path);
    return { path: abs, label: entry.label ?? abs };
  });

  const rules = Array.isArray(parsed.rules) ? parsed.rules : [];
  const compiledRules = rules
    .filter((r) => r && r.enabled !== false)
    .map((rule, i) => {
      if (!rule.pattern) throw new ConfigError(`rules[${i}] is missing a 'pattern'`);
      const flags = rule.flags ?? "";
      const re = new RegExp(rule.pattern, flags);
      return { name: rule.name ?? `rule-${i}`, pattern: rule.pattern, flags, regex: re };
    });

  if (compiledRules.length === 0) throw new ConfigError("Config must define at least one enabled rule in 'rules'");

  const mail = parsed.mail ?? null;
  if (mail && (typeof mail !== "object")) throw new ConfigError("'mail' must be an object");

  return {
    logs: normalizedLogs,
    rules: compiledRules,
    mail,
    throttleMs: typeof parsed.throttleMs === "number" ? parsed.throttleMs : 0,
  };
}
