import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeConfig } from "../src/config.js";

test("normalizes relative log paths against config dir", () => {
  const cfg = normalizeConfig(
    { logs: [{ path: "./app.log" }], rules: [{ name: "err", pattern: "error" }] },
    "/etc/log-alert/config.json",
  );
  assert.equal(cfg.logs.length, 1);
  assert.ok(cfg.logs[0].path.endsWith("app.log"));
  assert.ok(cfg.logs[0].path.startsWith("/"));
});

test("compiles enabled rules and skips disabled ones", () => {
  const cfg = normalizeConfig({
    logs: [{ path: "/var/x.log" }],
    rules: [
      { name: "a", pattern: "foo", enabled: true },
      { name: "b", pattern: "bar", enabled: false },
    ],
  });
  assert.equal(cfg.rules.length, 1);
  assert.equal(cfg.rules[0].name, "a");
  assert.ok(cfg.rules[0].regex instanceof RegExp);
});

test("throws when no logs defined", () => {
  assert.throws(() => normalizeConfig({ rules: [{ pattern: "x" }] }, "/c/c.json"), /at least one log/);
});

test("throws when no enabled rule", () => {
  assert.throws(
    () => normalizeConfig({ logs: [{ path: "/x" }], rules: [{ pattern: "x", enabled: false }] }, "/c/c.json"),
    /at least one enabled rule/,
  );
});

test("throws on invalid regex", () => {
  assert.throws(
    () => normalizeConfig({ logs: [{ path: "/x" }], rules: [{ pattern: "(" }] }, "/c/c.json"),
  );
});
