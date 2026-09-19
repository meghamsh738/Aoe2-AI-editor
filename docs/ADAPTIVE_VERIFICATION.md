# Adaptive editor verification

Native DE status: **UNVERIFIED / NOT RUN**. No game build, replay or Windows runtime result is available in this macOS workspace. Release acceptance remains open until the Windows scenario matrix is completed and reviewed.

## Automated and browser evidence

Final checks: `npm test` **43/43 passed**; `npm run build` passed; `npm run test:browser` and `npm run test:adaptive-browser` passed; both preset exports and the standalone kit regenerated successfully. The build emits only the existing upstream Zod annotation warnings.

The automated suite covers version parsing, original-project preservation, actual exported source maps, observed versus queued completion, memory resets, trigger timing, spending ceilings, cooldown re-entry, stale sightings, capped response requests, placement retries, inactive alternatives, catalog availability and native command signatures. The signature checks include the independent Windows probes.

The real Chromium workflows exercise both presets, guided and advanced edits, actual JSON/ZIP downloads and contents, invalid imports and export blocking, undo/redo, reload, damaged-draft recovery, version-1 upgrade copies, and every section at 390px width. Browser console and page errors are checked. The version-1 workflow runs separately to catch regressions.

Screenshot evidence is under `design-review/builds/adaptive-editor/`; the `legacy` subfolder records the preserved version-1 editor in this build. Desktop, placement and full mobile screenshots were visually inspected. The forest navigation and white editor panels extend the original design, with phase tabs, response cards, policy diagrams and a persistent native-status notice. The inspector follows the editor at narrower widths. Mobile navigation scrolls horizontally; the document itself does not overflow.

## Final review

A separate reviewer checked the editor/persistence and native policy logic. Findings fixed during this milestone include unsaved dropdown defaults, diagnostic jumps, unavailable milestone choices, non-expiring cooldown state, response ordering, repeated placement deadlines, denied production/research progression, and inactive pivot branches. Presets were also checked for prerequisite buildings and available support units.

The preview interprets the same native rule representation used by the emitter. It tracks policy state only. Engine-dependent searches, object health, terrain and costs are unknown unless explicitly supplied; it never creates simulated units or assumes native actions succeeded.

## Manual acceptance still required

Use `examples/adaptive/Workshop-Windows-Test-Kit.zip`, then each preset ZIP. Run independent probes first, the ten recorded-seed matches second, and the controlled disruptions. Record build/settings/actual seed, project, script errors, save/replay and observed recovery. A loss is not automatically a functional failure; prohibited spending/actions, parser errors, persistent stalls or competing commands are failures. Unsupported strict geometry and advanced micro remain explicit limitations in the design notes.
