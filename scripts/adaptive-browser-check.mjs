import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const evidence = "design-review/builds/adaptive-editor";
await fs.mkdir(evidence, { recursive: true });
try {
  await page.goto("http://127.0.0.1:5173");
  assert.match(await page.title(), /AI Workshop/);
  await expect(
    page.getByRole("heading", { name: "Build a strategy that adapts" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use Portuguese preset" }).click();
  await expect(page.getByLabel("Bot name")).toHaveValue(
    "Portuguese Castle Guns",
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Bot name")).toHaveValue(
    "Greenwood Adaptive Archers",
  );
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByLabel("Bot name")).toHaveValue(
    "Portuguese Castle Guns",
  );
  await page.getByRole("button", { name: "Use Britons preset" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${evidence}/desktop.png` });
  await page.getByRole("button", { name: "Build order", exact: true }).click();
  await page.getByLabel("Villager target", { exact: true }).fill("24");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(page.getByLabel("Generated AI script")).toContainText("24");
  await expect(
    page.getByRole("button", { name: "Download bot ZIP", exact: true }),
  ).toBeEnabled();
  const zipWait = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download bot ZIP", exact: true })
    .click();
  const zipDownload = await zipWait;
  const files = unzipSync(await fs.readFile(await zipDownload.path()));
  const projectName = "Greenwood Adaptive Archers";
  assert.equal(files[`${projectName}.ai`].length, 0);
  const saved = JSON.parse(strFromU8(files[`${projectName}.workshop.json`]));
  assert.equal(saved.schemaVersion, 2);
  assert.equal(saved.phases.dark.villagers, 24);
  assert.match(
    strFromU8(files[`${projectName}.per`]),
    /UNVERIFIED|unverified|NOT.*(PERFORMED|TESTED)/i,
  );
  assert.ok(files["native-test-kit/MATCHES.csv"]);
  await page.getByRole("button", { name: "Build order", exact: true }).click();
  await page.getByLabel("Food", { exact: true }).first().fill("10");
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Download bot ZIP", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  const beforeImport = await page.getByLabel("Bot name").inputValue();
  await page.getByLabel("Open project file").setInputFiles({
    name: "future.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":999}'),
  });
  await expect(page.getByRole("status").last()).toContainText(
    "Unsupported schemaVersion",
  );
  await expect(page.getByLabel("Bot name")).toHaveValue(beforeImport);
  await page.getByLabel("Open project file").setInputFiles({
    name: "roundtrip.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(saved)),
  });
  await page.getByRole("button", { name: "Adaptation", exact: true }).click();
  await page
    .getByLabel("Allow approved strategy pivots", { exact: true })
    .uncheck();
  await page
    .getByText("Edit response conditions and actions", { exact: true })
    .first()
    .click();
  await page.getByLabel("When", { exact: true }).first().selectOption("resource-depleted");
  await expect(page.getByLabel("Affected resource", { exact: true }).first()).toHaveValue("gold");
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("ai-workshop.project.v2")).responses[0].trigger.resource), "gold");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByLabel("Cooldown", { exact: true }).first().fill("50");
  await page.screenshot({
    path: `${evidence}/adaptation.png`,
    fullPage: false,
  });
  await page.reload();
  await page.getByRole("button", { name: "Adaptation", exact: true }).click();
  await expect(
    page.getByLabel("Allow approved strategy pivots", { exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Placement", exact: true }).click();
  await page
    .getByLabel("Preferred distance", { exact: true })
    .first()
    .fill("14");
  await page
    .getByLabel("Direction", { exact: true })
    .first()
    .selectOption("behind");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${evidence}/placement.png` });
  await page.getByRole("button", { name: "Micro", exact: true }).click();
  await page.getByLabel("Global reaction interval", { exact: true }).fill("6");
  await page.getByRole("button", { name: "Testing", exact: true }).click();
  await page.getByLabel("Town is under attack", { exact: true }).check();
  await expect(
    page.getByRole("heading", { name: "Decision trace" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Advance snapshot by 10 seconds",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Game time", { exact: true })).toHaveValue("10");
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByRole("button", { name: "Open version-1 editor", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Build your economy" }),
  ).toBeVisible();
  await page.getByLabel("Villager target", { exact: true }).fill("23");
  const originalLegacy = await page.evaluate(() =>
    localStorage.getItem("ai-workshop.project.v1"),
  );
  await page
    .getByRole("button", { name: "Upgrade a copy to version 2", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Build a strategy that adapts" }),
  ).toBeVisible();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("ai-workshop.project.v1")),
    originalLegacy,
  );
  await page.getByRole("button", { name: "Build order", exact: true }).click();
  await expect(page.getByLabel("Villager target", { exact: true })).toHaveValue(
    "23",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  for (const section of [
    "Overview",
    "Build order",
    "Adaptation",
    "Placement",
    "Micro",
    "Testing",
    "Export",
  ]) {
    await page.getByRole("button", { name: section, exact: true }).click();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      390,
      `${section} overflow`,
    );
  }
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({ path: `${evidence}/mobile.png`, fullPage: true });
  await page.evaluate(() =>
    localStorage.setItem("ai-workshop.project.v2", "{damaged adaptive draft"),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Download recovery copy" }),
  ).toBeVisible();
  await page.getByLabel("Bot name").fill("Recovered Adaptive Bot");
  await page.reload();
  await expect(page.getByLabel("Bot name")).toHaveValue(
    "Recovered Adaptive Bot",
  );
  const recoveryWait = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download recovery copy" }).click();
  assert.equal(
    await fs.readFile(await (await recoveryWait).path(), "utf8"),
    "{damaged adaptive draft",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: v2 presets, edits, history, persistence, actual export contents, validation, future-version rejection, response/micro/placement editing, preview, non-destructive v1 upgrade, all mobile sections, recovery, no console/page errors.",
  );
} finally {
  await browser.close();
}
