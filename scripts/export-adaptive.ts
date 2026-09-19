import fs from "node:fs/promises";
import path from "node:path";
import { strToU8, zipSync } from "fflate";
import { compileAdaptive, createPreset } from "../packages/compiler/v2";
import { nativeKitFiles } from "../src/adaptive/nativeKit";
const folder = path.resolve("examples/adaptive");
await fs.mkdir(folder, { recursive: true });
for (const civ of ["britons", "portuguese"] as const) {
  const project = createPreset(civ);
  const compiled = compileAdaptive(project);
  if (
    !compiled.script ||
    compiled.diagnostics.some((d) => d.severity === "error")
  )
    throw new Error(`${civ}: ${JSON.stringify(compiled.diagnostics)}`);
  const files = {
    ...compiled.files,
    ...Object.fromEntries(
      Object.entries(nativeKitFiles()).map(([key, value]) => [
        `native-test-kit/${key}`,
        value,
      ]),
    ),
  };
  await fs.writeFile(
    path.join(folder, `${project.name}.workshop.json`),
    JSON.stringify(project, null, 2),
  );
  await fs.writeFile(
    path.join(folder, `${project.name}.zip`),
    zipSync(
      Object.fromEntries(
        Object.entries(files).map(([key, value]) => [key, strToU8(value)]),
      ),
    ),
  );
}
await fs.writeFile(
  path.join(folder, "Workshop-Windows-Test-Kit.zip"),
  zipSync(
    Object.fromEntries(
      Object.entries(nativeKitFiles()).map(([key, value]) => [
        key,
        strToU8(value),
      ]),
    ),
  ),
);
console.log(
  "Exported both experimental presets and Windows kit. Native DE status: UNVERIFIED.",
);
