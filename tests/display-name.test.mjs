import { test } from "node:test";
import assert from "node:assert/strict";
import { greetingName } from "../lib/display-name.ts";

test("greeting uses a real first name, never an honorific or doubled punctuation", () => {
  assert.equal(greetingName("Md. Rezaul Hasan"), "Rezaul");
  assert.equal(greetingName("MD Rezaul Hasan"), "Rezaul");
  assert.equal(greetingName("Dr. Amina Rahman"), "Amina");
  assert.equal(greetingName("Mohammad Karim"), "Mohammad");
  assert.equal(greetingName("Jamie Park"), "Jamie");
  assert.equal(greetingName("  Sam  "), "Sam");
  assert.equal(greetingName("Sam."), "Sam");
  assert.equal(greetingName("Md."), "Md");
  assert.equal(greetingName(""), "there");
  assert.equal(greetingName(undefined), "there");
});
