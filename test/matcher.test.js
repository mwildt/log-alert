import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeConfig } from "../src/config.js";
import { matchRules } from "../src/matcher.js";

const rules = normalizeConfig(
  {
    logs: [{ path: "/x.log" }],
    rules: [
      { name: "error", pattern: "error", flags: "i" },
      { name: "code500", pattern: "status[=: ]+500" },
    ],
  },
  "/c/c.json",
).rules;

test("matches a single rule", () => {
  const hits = matchRules(rules, "2024-01-01 ERROR something failed");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].rule.name, "error");
  assert.equal(hits[0].match, "ERROR");
});

test("matches multiple rules", () => {
  const hits = matchRules(rules, "error status=500");
  assert.equal(hits.length, 2);
  assert.deepEqual(hits.map((h) => h.rule.name).sort(), ["code500", "error"]);
});

test("returns no hits on non-matching line", () => {
  const hits = matchRules(rules, "all good");
  assert.equal(hits.length, 0);
});
