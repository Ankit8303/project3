import test from "node:test";
import assert from "node:assert/strict";

test("formats an uploaded image buffer as a data URI without the datauri package", async () => {
  const { default: getBuffer } = await import("../dist/config/datauri.js");
  const result = getBuffer({ originalname: "menu.jpg", buffer: Buffer.from("tomato") });

  assert.equal(result.content, "data:image/jpeg;base64,dG9tYXRv");
});
