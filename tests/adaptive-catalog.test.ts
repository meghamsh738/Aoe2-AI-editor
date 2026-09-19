import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { CIVILIZATION_CATALOG } from "../packages/compiler/v2/catalog";
const evidence = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/civilization-availability.json", import.meta.url),
    "utf8",
  ),
);
test("catalog availability agrees with the pinned independent civilization data subset", () => {
  for (const civilization of ["britons", "portuguese"] as const) {
    const actual = CIVILIZATION_CATALOG[civilization];
    for (const key of ["units", "buildings", "research"] as const) {
      for (const identifier of actual[key]) {
        if (identifier.startsWith("my-")) continue;
        assert.ok(
          evidence.civilizations[civilization][key].includes(identifier),
          `${civilization} ${identifier} missing from pinned source`,
        );
      }
    }
  }
});
