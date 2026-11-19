import { test } from "node:test";
import assert from "node:assert/strict";
import { equipmentImage } from "../lib/equipment-image.ts";
test("demo image cache is fixed and cannot hide owner replacement images", () => {
  const item = {
    demoOnly: true,
    demoId: "EQD-001",
    image: "https://example.test/original.png",
    demoImageSource: "https://example.test/original.png",
  };
  assert.equal(equipmentImage(item), "/assets/equipment/eqd-001.webp");
  assert.equal(
    equipmentImage({ ...item, image: "https://example.test/replacement.png" }),
    "https://example.test/replacement.png",
  );
  assert.equal(equipmentImage({ ...item, demoOnly: false }), item.image);
  for (const demoId of ["../../secret", "EQD-001/secret", "EQD-001\n"]) {
    assert.equal(equipmentImage({ ...item, demoId }), item.image);
  }
});
