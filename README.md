# Adaptive AoE II AI Workshop

A local browser editor for native Age of Empires II: Definitive Edition AI scripts. Design build outcomes, phase economies, recovery rules, placement policies and army behaviour without writing scripts. No account, backend or external AI runtime.

**Experimental: native DE behaviour is unverified.** Browser and compiler checks do not establish that an exported bot works in-game. Windows acceptance testing remains required.

## Run

Use Node 22.12+ and run:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Use `npm run build` for production, `npm test` for automated checks, and `npm run export:adaptive` to regenerate both presets and the Windows kit.

## Design a bot

1. Start with Britons ranged development or Portuguese fast-Castle Organ Guns. Both cover Dark Age through a post-Imperial strategy phase.
2. Edit phase targets and ordered build outcomes. Add bounded recovery responses and permitted alternatives.
3. Choose placement policies and supported micro settings. Unsupported strict placement constraints block export.
4. Use Testing for hypothetical decision previews. These interpret compiler rules; they do not simulate the game, terrain or combat.
5. Save editable JSON or export a ZIP containing native files, source links, the project and Windows test kit.

The supported target is Arabia-style land 1v1, standard resources, Dark Age start and 200 population. The Portuguese preset is Phosphoru-inspired, not a reproduction of a specific match. Exact wall layouts, freeform blueprints, projectile dodging, advanced monk control and arbitrary script imports are outside this release.

## Compatibility and local recovery

The original version-1 editor and compiler remain available. Upgrade explicitly creates a version-2 copy and preserves the original draft. Unknown future versions are rejected. Each editor has separate local history and draft storage; damaged drafts can be downloaded before replacement. Keep JSON downloads as portable backups: clearing browser storage removes local drafts.

## Verification

`npm test` checks model validation, native command signatures, shared-rule previews, recovery and export contracts. With the development server running, `npm run test:browser` and `npm run test:adaptive-browser` check real browser editing, downloads, imports, history, recovery and responsive layouts.

The generated Windows kit contains independent command probes, controlled disruption instructions and five requested Arabia seeds per preset. Return the exact game build, exported project, settings and actual seed, script errors, replay/save and observations. All native results start as NOT RUN; there is no claimed win-rate target.

## Code and evidence

- `packages/compiler/v2/`: versioned model, reviewed narrow catalog, shared native rule representation, compiler and decision-preview interpreter.
- `packages/compiler/`: preserved version-1 compiler and policy adapter.
- `src/adaptive/`: authoring, persistence, previews and test-kit generation.
- [Design and native limitations](docs/ADAPTIVE_DESIGN.md)
- [Build index](docs/BUILD_INDEX.md)
- `examples/adaptive/`: generated projects, bot ZIPs and Windows kit.

Command references come from [AIREf](https://airef.github.io/). Rehoboam, Immortal and Barbarian were evaluated as references, but no reusable licensed component was verified and no donor code was copied. Dependencies are locked in package-lock.json.

Age of Empires II belongs to Microsoft. This independent editor is not affiliated with or endorsed by Microsoft.
