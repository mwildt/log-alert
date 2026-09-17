import { test } from "node:test";
import assert from "node:assert/strict";
import { Throttle } from "../src/index.js";

test("throttle allows first call then blocks within window", () => {
  const t = new Throttle(1000);
  assert.equal(t.allowed("k"), true);
  assert.equal(t.allowed("k"), false);
});

test("throttle with 0 disables throttling", () => {
  const t = new Throttle(0);
  assert.equal(t.allowed("k"), true);
  assert.equal(t.allowed("k"), true);
});

test("throttle keys are independent", () => {
  const t = new Throttle(1000);
  assert.equal(t.allowed("a"), true);
  assert.equal(t.allowed("b"), true);
  assert.equal(t.allowed("a"), false);
});
