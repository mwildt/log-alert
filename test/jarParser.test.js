import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const jarPath = join(here, "..", "lib", "logpipe-parser.jar");

test("jar parser normalizes slash-separated timestamps to ISO-8601", () => {
  if (!existsSync(jarPath)) return; // jar built at packaging time
  const res = spawnSync("java", ["-jar", jarPath], {
    input: "2024/01/02 03:04:05 ERROR boom\n",
    encoding: "utf8",
  });
  assert.equal(res.status, 0);
  assert.equal(res.stdout.trim(), "2024-01-02T03:04:05 ERROR boom");
});

test("jar parser leaves lines without a timestamp unchanged", () => {
  if (!existsSync(jarPath)) return;
  const res = spawnSync("java", ["-jar", jarPath], {
    input: "plain line no timestamp here\n",
    encoding: "utf8",
  });
  assert.equal(res.status, 0);
  assert.equal(res.stdout.trim(), "plain line no timestamp here");
});

test("jar parser handles multiple input lines", () => {
  if (!existsSync(jarPath)) return;
  const res = spawnSync("java", ["-jar", jarPath], {
    input: "2024/01/02 03:04:05 A\nplain B\n2024-01-02T03:04:05.123 C\n",
    encoding: "utf8",
  });
  assert.equal(res.status, 0);
  assert.deepEqual(
    res.stdout.trimEnd().split("\n"),
    ["2024-01-02T03:04:05 A", "plain B", "2024-01-02T03:04:05.123 C"],
  );
});
