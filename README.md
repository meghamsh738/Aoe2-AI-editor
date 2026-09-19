# AI Workshop — first editor

A local-first visual strategy editor for Age of Empires II: Definitive Edition. React + TypeScript UI with a separate pure TypeScript behavior compiler. No account, backend, AI API, or runtime model is required.

**Status: experimental. Native game compatibility and gameplay have not been tested.** The source and editor are usable; the final gameplay acceptance gate needs a Windows DE installation.

## Run

Node 22.12+ recommended. From this folder:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. To build: `npm run build`. To test: `npm test`. To create the sample export: `npm run export:sample`.

## First workflow

1. Edit Dark and Feudal Age villagers and resource allocations.
2. Adjust housing, farm and range targets, archer count, and attack timing.
3. Use Testing to check project conflicts and hypothetical policy gates.
4. Save project downloads editable JSON; Open validates and restores it. Undo also reverses imports.
5. Export downloads a ZIP with matching `.ai` / `.per` files, project JSON, rule-to-setting source map, and installation notes.

The browser saves the current structurally valid project on this device. Invalid input does not replace the previous valid draft. Keep a downloaded project as a portable backup. Clearing browser storage deletes local drafts. No telemetry or third-party requests are made by the production app.

## Supported profile and limitations

Britons, 1v1 land skirmish (e.g. Arabia), standard resources, Dark Age start, 200 population. The bot remains in Feudal Age. Set the civilization and match settings in-game.

Includes resource allocations, villager maintenance, housing, camps, mill, farms, Feudal advancement, barracks/ranges, archers, and timer-limited attacks. Native AI routines perform gathering, construction placement, scouting and combat. They require game testing. There are no upgrades, later ages, naval strategies, custom reactions, arbitrary script imports, game simulation or installer.

The policy test evaluates four gates independently under user-provided assumptions. It is not a script interpreter or a game engine. It does not predict economic efficiency, spend order, pathfinding or wins. Attack threshold counts all existing archers, including attacking ones; it is not an exact wave size. Housing has a 25-second request cooldown, not a completed-foundation guarantee. Feudal research request state waits for age completion; cancellation recovery is a future limitation.

## Code map

- `packages/compiler/model.ts`: versioned project and strict validation.
- `packages/compiler/index.ts`: behavior rules, native emitter, source map, export file contract.
- `packages/compiler/policy.ts`: explicitly limited hypothetical policy checker.
- `src/`: editor, persistence/history, import and ZIP download.
- `tests/`: compiler/input/export/policy regression checks.
- `examples/`: ready-to-open sample project and experimental native export.
- `docs/BUILD_INDEX.md`: build and browser evidence.

## Research and reuse decision

Inspected on 2026-09-19:

- [AoE2DE_AIBuilder](https://github.com/JackkelDragon/AoE2DE_AIBuilder): MIT Python form generator, last push January 2023. Useful form-to-script precedent; campaign-oriented, not a random-map foundation. Not a dependency.
- [aoe2-aiscript](https://github.com/Jvinniec/aoe2-aiscript): GPL-3.0 VS Code / TypeScript tooling, last push March 2022. Useful typed-command precedent; experimental error detection and license coupling make direct incorporation unsuitable for this MVP. No code or catalog copied.
- [aoe2techtree](https://github.com/SiegeEngineers/aoe2techtree): MIT web application, last push September 2026. Useful future versioned game-data adapter. Artwork has separate rights; neither artwork nor bulk data is redistributed here.
- [AIREf](https://airef.github.io/): checked command signatures, queued versus completed counts, strategic-number behavior, and timers. Reference only, not bundled documentation.
- [React](https://react.dev/learn), [Vite](https://vite.dev/guide/), [fflate](https://github.com/101arrowz/fflate), and [Zod](https://zod.dev/): standard dependencies; versions are locked in package-lock.json.

The compiler is an original narrow implementation. Public availability was not treated as permission to copy other AI scripts. Input is strictly validated; names cannot become file paths or script statements; no custom-code execution or filesystem installation is exposed. Dependency audit is a useful check, not a security certification.

## Next native acceptance gate

Use the included installation notes. Record exact DE build, map/seed, settings, opening duration, errors, and observed gathering/housing/age advancement/archer production/attacks. Check loss replacement. Do not label exports compatible until this passes. Expand civilization/unit catalog and reactions after this evidence.

Age of Empires II belongs to Microsoft. This independent editor is not affiliated with or endorsed by Microsoft.
