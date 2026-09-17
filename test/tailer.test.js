import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, appendFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LogTailer } from "../src/tailer.js";

function collect(tailer, { lines = 1, timeout = 1500 } = {}) {
  return new Promise((resolve, reject) => {
    const got = [];
    const timer = setTimeout(() => resolve(got), timeout);
    tailer.on("line", (line) => {
      got.push(line);
      if (got.length >= lines) {
        clearTimeout(timer);
        resolve(got);
      }
    });
    tailer.on("error", reject);
  });
}

test("emits appended lines after start", async () => {
  const dir = await mkdtemp(join(tmpdir(), "log-alert-"));
  const file = join(dir, "app.log");
  await appendFile(file, "preexisting\n");
  const tailer = new LogTailer(file);
  const done = collect(tailer, { lines: 2 });
  await tailer.start();
  await new Promise((r) => setTimeout(r, 100));
  await appendFile(file, "first appended\n");
  await appendFile(file, "second appended\n");
  const lines = await done;
  tailer.stop();
  assert.deepEqual(lines, ["first appended", "second appended"]);
  await rm(dir, { recursive: true, force: true });
});

test("does not emit old content before start", async () => {
  const dir = await mkdtemp(join(tmpdir(), "log-alert-"));
  const file = join(dir, "app.log");
  await appendFile(file, "old line\n");
  const tailer = new LogTailer(file);
  const done = collect(tailer, { lines: 1, timeout: 400 });
  await tailer.start();
  const lines = await done;
  tailer.stop();
  assert.equal(lines.length, 0);
  await rm(dir, { recursive: true, force: true });
});
