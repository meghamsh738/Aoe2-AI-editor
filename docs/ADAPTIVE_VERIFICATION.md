# Adaptive editor verification

Native DE status: **UNVERIFIED / NOT RUN**. No game build, replay or Windows runtime result is available in this macOS workspace. Release acceptance remains open until the Windows scenario matrix is completed and reviewed.

## Automated and browser evidence

### 2026-10-30 first manual game package

Current user download: [`examples/first-test/AI-Workshop-First-Test.zip`](../examples/first-test/AI-Workshop-First-Test.zip). Instructions: [`FIRST_GAME_TEST.md`](FIRST_GAME_TEST.md). The user will run the game; all native results remain **NOT RUN**.

- Source is the checked readiness state `8caa310`; remote readiness/default branches were refreshed before packaging and still pointed to `8caa310` / `a5e9bb7`. The new packet contains three matching native AI pairs, two editable projects, two source maps, a README, a blank results form and a hash manifest (13 entries). The dated Britons and Portuguese names distinguish the test from existing bots. Only each name/comment changed; native rule bodies and preset settings match the readiness source. The optional load probe is copied unchanged from its kit.
- Read-only inspection confirmed official Steam app 813780 installed at `/Volumes/Coding Projects/SteamLibrary/steamapps/common/AoE2DE`, with `Age Of Empires II.app` and `AgeOfEmpires2Data`. Steam content build ID was `25464371`; this is not the in-game DE version. The Mac game's user directories already contain `resources/_common/ai` under `~/Library/Application Support/Feral Interactive/Age Of Empires II/VFS/User/Games/Age of Empires 2 DE/`, for profile `0` and one long numbered Steam profile. Both AI folders were empty. Instructions use the Steam-profile user folder; actual game recognition is still awaiting the user test.
- The installed `Docs/All/TC CP Strategy Builder.doc` describes matching empty `.ai` / script `.per` companions. The current [official update](https://www.ageofempires.com/news/age-of-empires-ii-definitive-edition-update-185872/) notes automatically created external-AI folders, but does not establish a Mac path. [Feral's Mac FAQ](https://www.feralinteractive.com/en/support/mac/ageofempires2/#faqs/mods_steam) documents subscribed mods only. The exact user path is therefore based on local files, with its recognition explicitly treated as a test. No installed files, AIs, saves, settings or game processes were changed.
- `npm run export:first-test` verifies current preset/kit archives against source, pinned native hashes, name-only changes, project parse/recompile agreement, archive paths/companions and saved bytes before promoting the packet. A separate saved-ZIP inspection verified every manifest hash, both source maps, both project imports/recompilations, README equality and 13 expected entries. `npm test` passed 44/44; `npm run build:pages` passed with the two existing Zod annotation warnings. Runtime is Node 26.2.0 / npm 11.13.0. There are no editor changes requiring a new browser run.
- Next user action: install the six dated files, run one ordinary Britons and one Portuguese single-player match, and return setup/version/error screenshots plus saves/recordings and 10/20-minute observations. Use the tiny load probe only to separate a full-script load error from discovery problems. Longer recovery/micro/seed-matrix tests follow after initial loading/development evidence.

Package SHA-256: `b141616a97bbe660a5d202e2bef23911507df06882e2593401cea9173fef14d7` (44,816 bytes). No new merge, public deployment, Site update or outgoing correspondence was performed.

### 2026-10-23 pre-native readiness checkpoint

Scope remains Britons and Portuguese, Arabia-style land 1v1, standard resources, Dark Age start and 200 population. Both full-age presets, compiler and editor exist; native loading, progression, placement, adaptation and micro remain unverified. Public Pages remains release `a5e9bb7`; these readiness changes are on `codex/pre-native-readiness`, pending review/approval for merge and deployment.

- Fixed version-2 imports between 100 KB and 200 KB through the version-1 editor. Routing now allows the v2 parser to apply its limit; the v1 parser retains its 100 KB limit. Invalid/future files do not replace the saved draft, and the original v1 project remains separate.
- Added a minimal load probe, baseline/probe CSVs and separate scenario rows per applicable preset. The existing four capability probes and ten seed matches remain. All native records start NOT RUN. A separate run record captures platform/OS/build, exact project/script, settings, intervention, expected/actual behavior, errors and replay/save references. Match outcome is separate from functional status.
- Added a short export checklist and staged instructions: unmodified game, load probe, capabilities, preset loading/progression, disruptions, seed matches. The guide requires a verified platform-specific AI location and separates Mac from Windows evidence. No installer or game control was added.
- Existing native compiler rules and preset projects are unchanged by this pass. Static inspection does not establish their runtime correctness.

Checks: `npm test` **44/44 passed**; `npm run build:pages` passed with the same two non-fatal Zod annotation warnings; both browser scripts passed on `http://127.0.0.1:4173/Aoe2-AI-editor/`. Runtime: Node 26.2.0, npm 11.13.0, headless Chromium via Playwright 1.63.0. Browser plugin not available; the existing Playwright workflows ran in the background.

The extended browser regression opens a 120 KB v2 project from the legacy editor, verifies undo/redo and reload, saves matching JSON, rejects an oversized v1 file and a future version, and preserves the v1 draft. Both workflows exercise actual downloads, invalid input, history, saved-draft recovery and mobile navigation. Desktop 1536x1024, legacy 1280x800 and mobile 390x844 checks passed with no document overflow or console/page errors. The export checklist and mobile layout were visually inspected.

`npm run export:adaptive` regenerated both bot ZIPs and the standalone kit. A separate archive inspection compared every filename and decoded file against the current compiler/kit output and the adjacent project JSON: both 21-file bot ZIPs and the 16-file standalone kit matched. The exported native scripts, projects and source maps also matched release `a5e9bb7` byte for byte. Evidence and SHA-256 hashes are in `/Users/meghamsh/Documents/Codex/2026-09-19/new-chat-2/outputs/pre-native-readiness-evidence/export-integrity.json`; screenshots are in that folder's `adaptive/` and `legacy/` subfolders (outside the repository). The public Pages route and its existing JS/CSS returned HTTP 200 on 2026-10-23; no new deployment was made.

An independent read-only review found no blocking issues in import routing, saved-v1 preservation, kit records/probes/instructions, export onboarding or browser regressions. This review did not run the game and supplies no native acceptance evidence.

### Earlier adaptive implementation evidence

At the earlier adaptive implementation checkpoint: `npm test` **43/43 passed**; `npm run build` passed; both browser workflows passed; both preset exports and the standalone kit regenerated successfully.

The automated suite covers version parsing, original-project preservation, actual exported source maps, observed versus queued completion, memory resets, trigger timing, spending ceilings, cooldown re-entry, stale sightings, capped response requests, placement retries, inactive alternatives, catalog availability and native command signatures. The signature checks include the independent Windows probes.

The real Chromium workflows exercise both presets, guided and advanced edits, actual JSON/ZIP downloads and contents, invalid imports and export blocking, undo/redo, reload, damaged-draft recovery, version-1 upgrade copies, and every section at 390px width. Browser console and page errors are checked. The version-1 workflow runs separately to catch regressions.

Screenshot evidence is under `design-review/builds/adaptive-editor/`; the `legacy` subfolder records the preserved version-1 editor in this build. Desktop, placement and full mobile screenshots were visually inspected. The forest navigation and white editor panels extend the original design, with phase tabs, response cards, policy diagrams and a persistent native-status notice. The inspector follows the editor at narrower widths. Mobile navigation scrolls horizontally; the document itself does not overflow.

## Earlier adaptive implementation review

A separate reviewer checked the editor/persistence and native policy logic. Findings fixed during this milestone include unsaved dropdown defaults, diagnostic jumps, unavailable milestone choices, non-expiring cooldown state, response ordering, repeated placement deadlines, denied production/research progression, and inactive pivot branches. Presets were also checked for prerequisite buildings and available support units.

The preview interprets the same native rule representation used by the emitter. It tracks policy state only. Engine-dependent searches, object health, terrain and costs are unknown unless explicitly supplied; it never creates simulated units or assumes native actions succeeded.

## Manual acceptance still required

Use `examples/adaptive/Workshop-Windows-Test-Kit.zip` or the kit inside either preset ZIP. Read START-HERE.txt and run the staged baseline, load, capability, preset progression, disruption and ten requested-seed checks. Record each platform separately. Save the exact build/settings/actual seed, project/script, error text, save/replay and observed recovery. A loss is not automatically a functional failure; prohibited spending/actions, parser errors, persistent recoverable stalls or competing commands are failures. If a supported AI install route or scenario setup cannot be established, record BLOCKED with the exact reason rather than assuming success. Unsupported strict geometry and advanced micro remain explicit limitations in the design notes. No game was launched, controlled or modified in the readiness pass.

Focused re-review confirmed the five repaired native paths and priority/predecessor ordering. The remaining conditional question about Portuguese Imperial prerequisites is resolved by the [official World's Edge advancement guide](https://www.ageofempires.com/learn-to-play/advancing-to-the-next-age-xbox/): one Castle is an alternative to two Castle-age buildings. Portuguese already builds its Castle before requesting Imperial. No additional prerequisite building is needed for that preset.
