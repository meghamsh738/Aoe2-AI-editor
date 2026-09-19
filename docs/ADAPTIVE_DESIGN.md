# Adaptive Workshop v2

Status: experimental implementation; native DE behaviour unverified. No Windows game run is available in this macOS workspace. The Windows kit is the acceptance handoff, not evidence of a completed native test.

## Authoring and compatibility

The v2 browser workspace uses strict, data-only projects and keeps an independent draft/history from the original v1 Feudal editor. Opening v1 routes to its unchanged native compiler. Upgrading creates a copy; returning to v1 restores the original workspace. Unknown future versions are rejected. Invalid input must not overwrite the last structurally valid draft. Corrupt storage is backed up before any replacement and can be downloaded.

The default surface offers Britons and Portuguese presets, phase targets, ordered outcomes, response cards, placement policies and micro profiles. Advanced controls edit supported native behaviours, not arbitrary scripts. The Portuguese preset is Phosphoru-inspired, not an exact replay recreation. The policy diagrams illustrate intentions; they do not render actual random-map terrain.

## Native acceptance contract

Support targets Arabia-style 1v1, standard resources, Dark Age start, 200 population, normal visibility and conquest victory. Tests use fixed Extreme difficulty to avoid varying engine behaviour. Post-Imperial is a strategy phase within Imperial. A native order request is distinct from observed completion.

Native resources already spent on queued units and foundations are not available to spend again. Custom response allowances must additionally account for the session's issued requests. Creator restrictions override response preferences. Unknown observations cannot be treated as positive evidence.

The browser's decision preview is not a game simulator. It cannot certify pathfinding, placement safety, combat quality, timing or fairness of the game engine. It must consume the same policy representation as the native emitter for supported decisions.

## Reuse decision

The users are creators of native DE AI bots who want control without script programming. Three established AIs were considered during planning:

- Rehoboam ([author topic](https://forums.aiscripters.com/viewtopic.php?f=8&t=4012)): candidate for ranged micro comparison. No verified source license or isolated reusable component was obtained.
- Immortal ([author topic](https://forums.aiscripters.com/viewtopic.php?f=8&t=4156)): candidate for broader combat and late-game comparison. No verified source license or isolated reusable component was obtained.
- Barbarian ([author topic](https://forums.aiscripters.com/viewtopic.php?f=8&t=2522)): historical comparison candidate. Current DE compatibility and reuse permission were not established.

Author pages were inaccessible through the research tool. Download availability and community rankings do not establish permission, compatibility or a separable micro architecture. No donor code is copied or loaded. Use original native-command implementations unless a donor passes license, source, dependency-isolation and native-test checks. Compatible source-sharing obligations are acceptable to the user. No plugin DLLs, injected control, external AI models or network services are added.

Command references: [AIREf](https://airef.github.io/commands/commands-details.html), [DUC introduction](https://airef.github.io/resources/articles/enmipho-intro-to-duc.html). Native APIs were checked against command signatures during implementation. In particular, controlled placement can expand its search zone on failure, and remote unit searches have sighting constraints. These are engine limitations, not guarantees that can be strengthened by a UI label.

## Test handoff

Run `npm run export:adaptive` to regenerate editable presets, native ZIPs and the Windows test kit under `examples/adaptive`. Each full bot ZIP also includes the kit. It supplies four independent command probes, 16 controlled scenarios, ten requested seed runs (five per civilization), and a blank structured run record. All results begin as NOT RUN.

Return the exact exported project, DE build, actual map seed/settings, script errors, replay/save and observed outcomes. Distinguish functional failure from match defeat. A generated export and passing browser tests are not native certification.

## Enforced native boundaries

The pinned catalog intentionally covers only the two supported civilizations and exposed identifiers. Runtime cost queries use the game's civilization-adjusted costs; decision previews require explicit hypothetical costs and availability instead of inventing them. The command-signature fixture records its source and digest. No exact DE build has been certified.

Placement supports native anchors and signed forward/back offsets, with ordered retries. Inter-building spacing, lateral offsets and strict geometry cannot be guaranteed and block export. Resource-threat detection at a specific deposit is unavailable; the supplied disabled template explains this limitation and the town-raid response is the supported alternative. Builder/foundation-loss responses infer interrupted progress rather than identifying a particular dead villager.

Micro selects observed target classes. Closest, weakest and highest-threat ordering are rejected until a reliable implementation exists. Retreat uses a sampled controlled unit's health, not a group average. The siege controller currently protects siege by regrouping it near home when approved targets are absent; advanced escort positioning is not certified. All behaviour requires native testing.

The editor exposes advanced controls with validation. A setting that exceeds the supported native command contract blocks export rather than silently relaxing the creator's requirement. Decision previews expose unknown native observations and do not fabricate successful searches, placement or combat.

Civilization availability was independently checked against the narrow factual subset in [aoe2techtree revision b9d494d](https://github.com/SiegeEngineers/aoe2techtree/blob/b9d494df6921d4080df69b22f9dbb7a4d1dcd9f0/data/data.json). The test fixture records that exact revision; it does not redistribute artwork or infer availability from names. Generic unique-research aliases still require native verification.

The optional Portuguese archer branch is disabled by default. Its training step has an editable `whileBuildingMissing: castle` guard, so it stops requesting archers when a completed castle returns. Existing archers remain available. Recovery activation is based on inferred stalled development; it does not claim to identify a particular destroyed castle from hidden information.
