import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { compileAdaptive, createPreset, parseAdaptiveProject } from "../packages/compiler/v2";
import { nativeKitFiles } from "../src/adaptive/nativeKit";

// A fixed first-test release: names distinguish these files from existing AIs.
const revision = "2026-10-30";
const compilerSource = "8caa310d5cb33115828e520f863f0f696dc65995";
const nativeHashes = {
  britons: "612101402a986b12fdcfba8919cca31b4c8e13985afe7131fa8114ce2809dc64",
  portuguese: "b9f196fdae1e419a803cf18dadf12f748116c1f7bcd2d773180fe30228779a2d",
};
const root = "AI-Workshop-First-Test";
const folder = path.resolve("examples/first-test");
const files: Record<string, string> = {};
const sha256 = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

for (const civ of ["britons", "portuguese"] as const) {
  const original = createPreset(civ);
  const baseline = compileAdaptive(original);
  assert.equal(baseline.diagnostics.filter((d) => d.severity === "error").length, 0);
  assert.equal(sha256(baseline.script), nativeHashes[civ], "A new compiler requires a new test-package revision");
  const existing = unzipSync(await fs.readFile(`examples/adaptive/${original.name}.zip`));
  assert.equal(strFromU8(existing[`${original.name}.per`]), baseline.script, "Current preset archive must match compiler");
  assert.deepEqual(parseAdaptiveProject(strFromU8(existing[`${original.name}.workshop.json`])), original);

  const project = { ...original, name: `Workshop Test ${civ === "britons" ? "Britons" : "Portuguese"} ${revision}` };
  const compiled = compileAdaptive(project);
  assert.equal(compiled.diagnostics.filter((d) => d.severity === "error").length, 0);
  assert.deepEqual({ ...project, name: original.name }, original, "Packaging must not change preset settings");
  assert.equal(compiled.script.split("\r\n").slice(1).join("\r\n"), baseline.script.split("\r\n").slice(1).join("\r\n"), "Only the native name comment may change");
  const json = compiled.files[`${project.name}.workshop.json`];
  assert.deepEqual(parseAdaptiveProject(json), project);
  assert.equal(compileAdaptive(parseAdaptiveProject(json)).script, compiled.script);
  files[`AI/${project.name}.ai`] = compiled.files[`${project.name}.ai`];
  files[`AI/${project.name}.per`] = compiled.script;
  files[`Projects/${project.name}.workshop.json`] = json;
  files[`Diagnostics/${civ}-source-map.json`] = compiled.files["source-map.json"];
}

const kit = nativeKitFiles();
const kitBytes = await fs.readFile("examples/adaptive/Workshop-Windows-Test-Kit.zip");
assert.equal(sha256(kitBytes), "09cf136b89309a3033ea77c555376cbe57b58f8b1b128a3034b3b386fddb76d7", "Use the reviewed readiness kit for this package revision");
const kitArchive = unzipSync(kitBytes);
assert.deepEqual(Object.keys(kitArchive).sort(), Object.keys(kit).sort());
for (const [name, text] of Object.entries(kit)) assert.equal(strFromU8(kitArchive[name]), text, `Current test kit: ${name}`);
files[`AI/Workshop Test Load ${revision}.ai`] = kit["probes/Workshop Load Probe.ai"];
files[`AI/Workshop Test Load ${revision}.per`] = kit["probes/Workshop Load Probe.per"];
files["README.md"] = await fs.readFile("docs/FIRST_GAME_TEST.md", "utf8");
files["RESULTS.txt"] = `AI WORKSHOP FIRST GAME TEST — ${revision}
Native result: NOT RUN — fill after playing.

Date:
macOS version:
In-game AoE II version (screenshot is fine):
Did an ordinary built-in AI match run/save/reload?:
AI folder used:
Any changed settings or active gameplay mods:

BRITONS — NOT RUN
Exact AI selected: Workshop Test Britons ${revision}
Bot civilization set to Britons?:
Name appeared in opponent selector?:
Match started without script errors?:
At 10 game minutes (what you could see, or unknown):
At 20 game minutes:
Later ages/army, if continued:
Exact error / stuck behavior and game time:
Match setup screenshot:
Save / recorded game filenames:
Map seed if available:

PORTUGUESE — NOT RUN
Exact AI selected: Workshop Test Portuguese ${revision}
Bot civilization set to Portuguese?:
Name appeared in opponent selector?:
Match started without script errors?:
At 10 game minutes:
At 20 game minutes:
Castle / Organ Guns / later ages, if observed:
Exact error / stuck behavior and game time:
Match setup screenshot:
Save / recorded game filenames:
Map seed if available:

OPTIONAL LOAD PROBE — NOT RUN
Only needed if diagnosing a load problem.
Name appeared?:
Match started?:
Errors?:
Local message visible, not visible, or not checked?:

Use PASS only for an observed check; FAIL for an observed problem;
BLOCKED if the setup prevented testing; NOT RUN for anything not tried.
Unknown because of fog is a valid answer. Keep earlier results when repeating.
`;
files["MANIFEST.json"] = JSON.stringify({
  package: root,
  revision,
  compilerSourceCommit: compilerSource,
  projectVersion: 2,
  nativeResult: "NOT RUN",
  platformForFirstTest: "macOS Steam",
  presetChanges: "Names only; native rule bodies and preset settings preserved",
  files: Object.fromEntries(Object.entries(files).map(([name, text]) => [name, { bytes: strToU8(text).length, sha256: sha256(text) }])),
}, null, 2) + "\n";

const bytes = zipSync(Object.fromEntries(Object.entries(files).map(([name, text]) => [
  `${root}/${name}`, [strToU8(text), { mtime: new Date(`${revision}T12:00:00Z`) }],
])), { level: 9 });
const unpacked = unzipSync(bytes);
assert.deepEqual(Object.keys(unpacked).sort(), Object.keys(files).map((name) => `${root}/${name}`).sort());
for (const [name, text] of Object.entries(files)) assert.equal(strFromU8(unpacked[`${root}/${name}`]), text);
const nativePaths = Object.keys(unpacked).filter((name) => name.startsWith(`${root}/AI/`));
assert.equal(nativePaths.length, 6);
for (const name of nativePaths.filter((name) => name.endsWith(".per"))) {
  assert.equal(unpacked[name.replace(/\.per$/, ".ai")].length, 0);
  assert.match(strFromU8(unpacked[name]), /UNVERIFIED/);
}

await fs.mkdir(path.join(folder, "Working"), { recursive: true });
const candidate = path.join(folder, "Working", `${root}.zip`);
await fs.writeFile(candidate, bytes);
assert.equal(sha256(await fs.readFile(candidate)), sha256(bytes));
const destination = path.join(folder, `${root}.zip`);
try {
  const previous = await fs.readFile(destination);
  if (sha256(previous) !== sha256(bytes)) {
    const archive = path.join(folder, "Archive");
    await fs.mkdir(archive, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await fs.writeFile(path.join(archive, `${root}-${timestamp}-r1-${sha256(previous).slice(0, 12)}.zip`), previous, { flag: "wx" });
  }
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
await fs.rename(candidate, destination);
await fs.rmdir(path.join(folder, "Working"));
console.log(JSON.stringify({ file: destination, bytes: bytes.length, sha256: sha256(bytes), entries: Object.keys(unpacked).length, aiPairs: 3, nativeResult: "NOT RUN" }, null, 2));
