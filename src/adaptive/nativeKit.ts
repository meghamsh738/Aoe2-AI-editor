/** Original, deliberately small probes. Passing these is not full-bot certification. */
const rule = (conditions: string[], actions: string[]) =>
  `(defrule\n${conditions.map((x) => `    ${x}`).join("\n")}\n=>\n${actions.map((x) => `    ${x}`).join("\n")}\n)\n`;
const probe = (name: string, body: string) =>
  `; AI Workshop: ${name}\n; Native DE status: UNVERIFIED. Run only in the documented test scenario.\n${body}`;
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
  files["SCENARIOS.csv"] =
    "id,title,setup,expected,result,notes\n" +
    nativeScenarios
      .map(
        (row) =>
          row.map((cell) => JSON.stringify(cell)).join(",") + ",NOT RUN,",
      )
      .join("\n");
  files["MATCHES.csv"] =
    "preset,requested_seed,actual_seed,game_build,opponent,result,replay,script_errors,notes\n" +
    ["Britons", "Portuguese"]
      .flatMap((civ) =>
        [1001, 1002, 1003, 1004, 1005].map(
          (seed) => `${civ},${seed},,,,NOT RUN,,,`,
        ),
      )
      .join("\n");
  files["run-record.json"] = JSON.stringify(
    {
      status: "NOT RUN",
      gameBuild: "",
      workshopCommit: "",
      preset: "",
      projectSha256: "",
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
      errors: [],
      observations: [],
      scenarios: nativeScenarios.map(([id]) => ({
        id,
        result: "NOT RUN",
        notes: "",
      })),
    },
    null,
    2,
  );
  files["START-HERE.txt"] =
    `AI WORKSHOP WINDOWS TEST KIT\nSTATUS: NOT RUN — no game build is certified.\n\n1. Keep the exported project and matching .ai/.per together. Record the Workshop commit and DE build from the game UI. Back up same-name files before copying into your game AI folder (commonly resources/_common/ai inside the DE installation; Steam: Manage > Browse local files). Do not overwrite other bots. Restart DE if the bot does not appear.\n2. Probes are independent AIs, not opponents capable of playing a match. Run separately in a controlled scenario as player 1. Use player 2 for the enemy. Start with the Allocation probe and inspect gathering. For Placement, supply a town center, villagers and wood. Expect a preferred rear location, not exact tiles: the native engine can expand its placement search.\n3. Observation: place player-2 archers initially outside sight, reveal them, then remove sight. A positive chat report must follow actual sighting; allow the documented short memory window. This probe never explores by itself.\n4. Control: give player 1 eight archers in a small controlled scenario; they should move toward map center. This is a command probe, not proof of full micro quality or fairness.\n5. Run the full presets separately on Arabia with normal visibility, no cheats, standard resources, Dark Age start, 200 population, normal speed and conquest victory. Select the matching civilization. Use Extreme AI difficulty to keep engine settings fixed. Run both presets against the standard DE AI on five requested seeds in MATCHES.csv; record the actual seed shown by the game. Reuse identical seeds and opponent settings between builds.\n6. Run the disruptions in SCENARIOS.csv in controlled scenarios. Make a baseline save before each intervention. Record what was actually observed, including any unsupported scenario setup, instead of checking a pass based on the editor preview.\n7. Preserve replay/save files, native error text and the exact project JSON. Fill run-record.json and both CSVs; return these with observations. A defeat is not automatically a functional failure. A parser error, forbidden action, stalled recoverable step, repeated ownership conflict or spending violation is a failure.\n\nThe browser decision preview does not simulate DE pathfinding, combat, economy or timing. All native functionality remains UNVERIFIED until these runs are completed and reviewed.\n\nCommand reference: https://airef.github.io/commands/commands-details.html\nDUC guide: https://airef.github.io/resources/articles/enmipho-intro-to-duc.html\n`;
  return files;
}
