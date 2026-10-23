/** Original, deliberately small probes. Passing these is not full-bot certification. */
const rule = (conditions: string[], actions: string[]) =>
  `(defrule\n${conditions.map((x) => `    ${x}`).join("\n")}\n=>\n${actions.map((x) => `    ${x}`).join("\n")}\n)\n`;
const probe = (name: string, body: string) =>
  `; AI Workshop: ${name}\n; Native DE status: UNVERIFIED. Run only in the documented test scenario.\n${body}`;
const csv = (rows: (string | number)[][]) =>
  rows.map((row) => row.map((cell) => {
    const text = String(cell);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }).join(",")).join("\n");

export const nativeProbeChecks = [
  ["load", "Workshop Load Probe", "Select this AI in a controlled single-player scenario; inspect its own chat output.", "Loads without parser errors and reports Workshop: load probe started once."],
  ["allocation", "Workshop Allocation Probe", "Provide villagers, food and wood accessible to player 1.", "Food and wood allocation responds to the 50/50 targets; no parser errors."],
  ["placement", "Workshop Placement Probe", "Provide a player-1 town center, villagers and wood with open space nearby.", "House construction starts without a queue flood; record actual placement, including native search expansion."],
  ["observation", "Workshop Observation Probe", "Place player-2 archers outside sight, reveal them, then remove sight. The probe does not scout.", "No report before a sighting; a local report follows a seen archer. Record how long remembered sightings persist."],
  ["control", "Workshop Control Probe", "Provide eight player-1 archers on an accessible map.", "Archers move toward map center without competing native group orders."],
] as const;
export const nativeScenarios = [
  [
    "load",
    "Load both presets",
    "Dark Age standard start; select the matching civilization.",
    "No native parser errors; economy starts.",
  ],
  [
    "builder-loss",
    "Builder or foundation lost",
    "Destroy a builder during construction, then separately destroy its foundation.",
    "Replace the worker / foundation without advancing the step prematurely.",
  ],
  [
    "housing",
    "Housing blocked",
    "Reach housing limit while a house is under construction.",
    "No duplicate queue flood; production resumes after housing completes.",
  ],
  [
    "resource-loss",
    "Resources exhausted",
    "Use a small accessible gold/wood deposit, then exhaust it.",
    "Recover gathering where possible; no fabricated knowledge of hidden deposits.",
  ],
  [
    "gold-denial",
    "Gold threatened",
    "Place visible enemy units at the active mining site.",
    "Only permitted defense or fallback activates; respect spending limits.",
  ],
  [
    "raid",
    "Raid and recovery",
    "Send a small raid, then remove it.",
    "Defense activates after configured delay; returns after the recovery threshold and dwell.",
  ],
  [
    "forward-defense",
    "Forward tower",
    "Build an enemy tower near the base after scouting it.",
    "Respond to observed threat; no reaction while the structure remains undiscovered.",
  ],
  [
    "placement",
    "Blocked placement",
    "Obstruct the preferred region with terrain/buildings.",
    "Try only configured fallback positions; surface a blocked step if exhausted.",
  ],
  [
    "castle-loss",
    "Portuguese castle lost",
    "Destroy the production castle after Organ Guns are produced.",
    "Rebuild when possible; archer fallback only when enabled.",
  ],
  [
    "counter",
    "Counter units observed",
    "Reveal cavalry, ranged units, or defensive buildings, then withdraw.",
    "Allowed support responds; stale sightings do not imply a current threat.",
  ],
  [
    "age",
    "Age progression interrupted",
    "Interrupt or destroy age-research production in a controlled scenario.",
    "Research is not marked completed until the new age is observed.",
  ],
  [
    "ranged",
    "Ranged retreat",
    "Fight with a ranged group, then reduce its numbers below its retreat threshold.",
    "Group retreats/regroups; no alternating ownership or command spam.",
  ],
  [
    "screen",
    "Melee screen",
    "Provide supported melee units and a ranged army.",
    "Melee screening does not commandeer the ranged group.",
  ],
  [
    "siege",
    "Siege protection",
    "Provide a supported siege unit with an escort and visible enemies.",
    "Escort follows its assigned role; siege is not sent unsupported by conflicting controllers.",
  ],
  [
    "limits",
    "Creator restrictions",
    "Disable fallback and reduce response allowance before repeating a disruption.",
    "No prohibited pivot or spending above its allowance.",
  ],
  [
    "late-game",
    "Imperial and post-Imperial",
    "Run a protected development scenario through the selected milestones.",
    "All age transitions complete; post-Imperial begins only after its goals.",
  ],
] as const;
export function nativeKitFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  const probes = {
    "Workshop Load Probe": probe(
      "Load",
      rule(["(true)"], [
        '(chat-local-to-self "Workshop: load probe started.")',
        "(disable-self)",
      ]),
    ),
    "Workshop Allocation Probe": probe(
      "Allocation",
      rule(
        ["(true)"],
        [
          "(set-strategic-number sn-food-gatherer-percentage 50)",
          "(set-strategic-number sn-wood-gatherer-percentage 50)",
          "(set-strategic-number sn-gold-gatherer-percentage 0)",
          "(set-strategic-number sn-stone-gatherer-percentage 0)",
          "(disable-self)",
        ],
      ),
    ),
    "Workshop Placement Probe": probe(
      "Placement",
      rule(
        [
          "(building-type-count town-center > 0)",
          "(building-type-count-total house < 3)",
          "(can-build house)",
          "(up-pending-objects c: house < 1)",
        ],
        [
          "(up-set-placement-data my-player-number -1 c: -10)",
          "(up-build place-control 0 c: house)",
        ],
      ),
    ),
    "Workshop Observation Probe": probe(
      "Observation",
      rule(
        ["(true)"],
        [
          "(set-strategic-number sn-focus-player-number 2)",
          "(enable-timer 1 3)",
          "(disable-self)",
        ],
      ) +
        rule(
          ["(timer-triggered 1)"],
          [
            "(up-reset-search 1 1 1 1)",
            "(up-find-remote c: archer c: 1)",
            "(up-get-search-state 100)",
            "(disable-timer 1)",
            "(enable-timer 1 3)",
          ],
        ) +
        rule(
          ["(goal 102 1)"],
          [
            '(chat-local-to-self "Workshop: a recently seen archer was found.")',
            "(set-goal 102 0)",
          ],
        ),
    ),
    "Workshop Control Probe": probe(
      "Control",
      rule(
        ["(true)"],
        [
          "(set-strategic-number sn-number-attack-groups 0)",
          "(set-strategic-number sn-number-explore-groups 0)",
          "(set-strategic-number sn-enable-patrol-attack 0)",
          "(enable-timer 1 5)",
          "(disable-self)",
        ],
      ) +
        rule(
          ["(timer-triggered 1)"],
          [
            "(up-reset-search 1 1 1 1)",
            "(up-find-local c: archer c: 8)",
            "(up-get-point position-center 100)",
            "(up-target-point 100 action-move formation-line stance-defensive)",
            "(disable-timer 1)",
            "(enable-timer 1 5)",
          ],
        ),
    ),
  };
  for (const [name, text] of Object.entries(probes)) {
    files[`probes/${name}.ai`] = "";
    files[`probes/${name}.per`] = text;
  }
  files["BASELINE.csv"] = csv([
    ["run_id", "setup", "expected", "status", "record_file", "notes"],
    ["baseline", "Unmodified single-player 1v1; play at least 15 minutes with recording enabled, save, reload and open the recording.", "Game runs, save reloads and recording opens.", "NOT RUN", "", ""],
  ]);
  files["PROBES.csv"] = csv([
    ["run_id", "ai_name", "setup", "expected", "status", "record_file", "notes"],
    ...nativeProbeChecks.map(([id, name, setup, expected]) =>
      [`probe-${id}`, name, setup, expected, "NOT RUN", "", ""]),
  ]);
  files["SCENARIOS.csv"] = csv([
    ["run_id", "preset", "id", "title", "setup", "expected", "status", "record_file", "notes"],
    ...["Britons", "Portuguese"].flatMap((civ) => nativeScenarios
      .filter(([id]) => civ === "Portuguese" || id !== "castle-loss")
      .map(([id, title, setup, expected]) =>
        [`${civ.toLowerCase()}-${id}`, civ, id, title, setup, expected, "NOT RUN", "", ""])),
  ]);
  files["MATCHES.csv"] = csv([
    ["run_id", "preset", "requested_seed", "actual_seed", "status", "match_outcome", "record_file", "notes"],
    ...["Britons", "Portuguese"].flatMap((civ) =>
      [1001, 1002, 1003, 1004, 1005].map((seed) =>
        [`${civ.toLowerCase()}-seed-${seed}`, civ, seed, "", "NOT RUN", "", "", ""])),
  ]);
  files["run-record.json"] = JSON.stringify(
    {
      status: "NOT RUN",
      runId: "",
      testType: "",
      platform: "",
      osVersion: "",
      gameBuild: "",
      workshopCommit: "",
      preset: "",
      projectVersion: "",
      projectFile: "",
      projectSha256: "",
      scriptFile: "",
      scriptSha256: "",
      verifiedAiFolder: "",
      scenarioFile: "",
      interventionGameTime: "",
      map: "Arabia",
      requestedSeed: "",
      actualSeed: "",
      resources: "standard",
      startingAge: "Dark",
      population: 200,
      speed: "normal",
      victory: "conquest",
      difficulty: "extreme",
      revealMap: "normal",
      cheats: false,
      opponent: "",
      replay: "",
      save: "",
      errorLog: "",
      expected: "",
      actual: "",
      matchOutcome: "",
      errors: [],
      observations: [],
    },
    null,
    2,
  );
  files["START-HERE.txt"] =
    `AI WORKSHOP NATIVE TEST KIT
STATUS: NOT RUN — no game build is certified. Windows acceptance is still required.

START SMALL
1. Check the ordinary game first. Run an unmodified single-player 1v1 for at least 15 minutes with recording enabled. Save, reload, then open the recording. Record this in BASELINE.csv.
2. Keep this kit and your results outside the game installation. Keep the exact exported project JSON and matching .ai/.per files. Record the platform, OS version and game build shown by the game.
3. Find the AI installation location supported by your installed game/platform. Do not assume the Windows location applies to Mac or that an external Steam drive contains user mods. Verify the location through the game and platform documentation; record it. Use unique bot names and preserve existing saves/mods. If no supported AI installation route is available, record BLOCKED and stop at this stage.
4. Install the paired Workshop Load Probe.ai and .per using that route, then start it through the normal single-player/scenario menus. A missing AI in the selection list suggests a discovery/path problem; an error naming a script line is a parser problem. Save the exact message. The probe should report "Workshop: load probe started." once to its own local chat. If that output cannot be inspected, record the observation limitation; do not infer success from silence.

CAPABILITIES AND PRESETS
5. Run each remaining probe separately using PROBES.csv. These are tiny command tests, not complete opponents. The probe AI controls player 1; player 2 is the enemy. Set up the scenario through the game's own tools. Placement is a preference: the native engine may expand its search. Record what happened. Stop dependent tests after a failure or unsupported setup, and retain the error/save evidence.
6. Load each full preset with its matching civilization: Britons, then Portuguese. Use Arabia, standard resources, Dark Age start, 200 population, normal speed, conquest, normal visibility, no cheats and Extreme AI difficulty. First check initialization with no script errors (the load rows in SCENARIOS.csv), then protected progression through Imperial and post-Imperial (late-game rows). Only continue to disruption/match testing once these checks pass.
7. Run the other SCENARIOS.csv rows in controlled scenarios. Save before each disruption, record its game time and what changed, then observe recovery. Each preset has its own rows; castle-loss applies to Portuguese. Preserve completed research, creator limits and exclusive unit ownership. The ranged scenario includes retreat and regrouping. Repeat separate interventions in separate records; do not combine builder death and foundation loss into one ambiguous result.
8. Run the five requested Arabia seeds per preset in MATCHES.csv against the standard DE AI. Record the actual seed and all settings, including opponent civilization, difficulty and starting resources. If the requested seed cannot be set, record that limitation. A win/loss is separate from a functional pass/fail. Reuse the actual seeds and settings for comparisons.

RECORD AND RETURN
For each baseline, probe, scenario or match, copy run-record.json to a uniquely named file such as britons-raid-mac-01.json. Put that filename in the CSV record_file column. Fill runId/testType, platform/OS/build, project/export version and exact files (or hashes), settings, intervention, expected/actual behavior, errors and replay/save paths. Correct template settings to what you actually used; leave irrelevant fields blank. Keep Mac and Windows runs in separate result folders; Mac success does not verify Windows.

Use NOT RUN, PASS, FAIL, BLOCKED or NOT APPLICABLE. PASS needs observed expected behavior. FAIL means an observed defect, such as a parser error, prohibited spending/action, recoverable step that stays stalled, command conflict or adaptation loop. BLOCKED means a prerequisite or scenario setup prevents a meaningful check; explain it. NOT APPLICABLE needs a reason. Unperformed rows start as NOT RUN. Append new rows/records for repeats; preserve the earlier results.

Return the completed CSVs, run records, exact projects/scripts, errors and relevant replays/saves. The browser decision preview is not a game simulation. No native capability is verified by a compiler/build/browser pass alone.

Command reference: https://airef.github.io/commands/commands-index.html
DUC guide: https://airef.github.io/resources/articles/enmipho-intro-to-duc.html
Mac platform support: https://www.feralinteractive.com/en/support/mac/ageofempires2/
`;
  return files;
}
