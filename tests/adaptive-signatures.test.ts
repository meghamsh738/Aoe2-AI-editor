import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createPreset } from "../packages/compiler/v2/presets";
import { buildAdaptiveIR } from "../packages/compiler/v2/ir";
const fixture = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/native-command-signatures.json", import.meta.url),
    "utf8",
  ),
) as { commands: Record<string, { arity: number; type: string }> };
type Form = string | Form[];
function parse(text: string): Form {
  const tokens = text.match(/"(?:[^"\\]|\\.)*"|[()]|[^\s()]+/g) ?? [];
  let offset = 0;
  function read(): Form {
    const token = tokens[offset++];
    if (token !== "(") return token;
    const list: Form[] = [];
    while (tokens[offset] !== ")" && offset < tokens.length) list.push(read());
    assert.equal(tokens[offset++], ")", `Unbalanced form: ${text}`);
    return list;
  }
  const result = read();
  assert.equal(offset, tokens.length, `Trailing forms: ${text}`);
  return result;
}
function verify(form: Form, side: "condition" | "action", rule: string) {
  assert.ok(Array.isArray(form), `${rule}: expected form`);
  const name = form[0];
  assert.equal(typeof name, "string");
  const signature = fixture.commands[name as string];
  assert.ok(signature, `${rule}: unknown command ${name}`);
  assert.equal(
    form.length - 1,
    signature.arity,
    `${rule}: ${name} expects ${signature.arity} arguments`,
  );
  if (side === "action")
    assert.match(signature.type, /Action/, `${rule}: ${name} is not an action`);
  else if (
    !["and", "or", "not", "nand", "nor", "xor", "xnor"].includes(name as string)
  )
    assert.match(signature.type, /Fact/, `${rule}: ${name} is not a condition`);
  for (const child of form.slice(1))
    if (Array.isArray(child)) verify(child, side, rule);
  if (
    name === "enable-timer" ||
    name === "disable-timer" ||
    name === "timer-triggered"
  ) {
    const id = Number(form[1]);
    assert.ok(id >= 1 && id <= 50, `${rule}: timer ${id} outside 1–50`);
  }
  if (name === "set-goal") {
    const id = Number(form[1]);
    assert.ok(id >= 1 && id <= 15999, `${rule}: invalid goal ${id}`);
  }
}
test("all emitted preset calls use documented names, arities, categories and timer bounds", () => {
  for (const civilization of ["britons", "portuguese"] as const) {
    const ir = buildAdaptiveIR(createPreset(civilization));
    assert.ok(ir.rules.length > 0);
    for (const rule of ir.rules) {
      for (const condition of rule.conditions)
        verify(parse(condition), "condition", `${civilization}/${rule.id}`);
      for (const action of rule.actions)
        verify(parse(action), "action", `${civilization}/${rule.id}`);
    }
  }
});

test("independent Windows probes use documented command signatures", async () => {
  const { nativeKitFiles } = await import("../src/adaptive/nativeKit");
  for (const [name, script] of Object.entries(nativeKitFiles())) {
    if (!name.endsWith(".per")) continue;
    const forms = parse(`(${script.replace(/;[^\r\n]*/g, "")})`);
    assert.ok(Array.isArray(forms));
    for (const rule of forms) {
      assert.ok(Array.isArray(rule));
      assert.equal(rule[0], "defrule");
      const arrow = rule.indexOf("=>");
      assert.ok(arrow > 0);
      for (const condition of rule.slice(1, arrow))
        verify(condition, "condition", name);
      for (const action of rule.slice(arrow + 1))
        verify(action, "action", name);
    }
  }
});
