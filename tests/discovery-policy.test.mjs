import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanIds,
  restoredIds,
  recentIds,
} from "../lib/discovery-policy.mjs";
const a = "a".repeat(24),
  b = "b".repeat(24);
test("device selections retain only bounded unique equipment IDs", () => {
  assert.deepEqual(
    cleanIds([a.toUpperCase(), a, "private@email.test", { id: b }, b], 3),
    [a, b],
  );
  for (const raw of [null, "not-json", "{}", '"' + a + '"', "x".repeat(4097)])
    assert.deepEqual(restoredIds(raw, 3), []);
  assert.equal(
    cleanIds(
      Array.from({ length: 10 }, (_, i) => String(i).repeat(24)),
      3,
    ).length,
    3,
  );
  assert.deepEqual(restoredIds(JSON.stringify([a, b]), 3), [a, b]);
});
test("recent history moves revisited IDs to the front and stays at eight", () => {
  const ids = Array.from({ length: 8 }, (_, i) => String(i).repeat(24));
  assert.equal(recentIds(ids, "f".repeat(24)).length, 8);
  assert.deepEqual(recentIds([a, b], b), [b, a]);
  assert.deepEqual(recentIds([a], "bad"), [a]);
});
