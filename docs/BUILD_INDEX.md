# Build index

| Version | Branch / implementation commit | Status | Evidence | Validation |
|---|---|---|---|---|
| First editor | `codex/ai-workshop-mvp` / `8ae8d6a` | Review-ready experimental editor; native game gate open | `design-review/builds/first-editor/desktop.png`, `laptop.png`, `mobile.png`, `export.png` | Build, 11 unit tests, real-browser workflow and download checks pass; production dependency audit clean |

Authoritative root: `/Users/meghamsh/Documents/Codex/2026-09-19/new-chat-2/outputs/aoe2-ai-workshop`.

Local checkpoint only; no GitHub remote or push. No Drive publication yet. This is a new project, separate from the user's hotkey editor. Browser preview runs from the authoritative root at `http://127.0.0.1:5173`.

Design reference: `docs/concept.png` (built-in Image Gen). Detailed comparison, deliberate differences and verification methods: `docs/VERIFICATION.md`. Prompt: `docs/CONCEPT_PROMPT.md`.

Next gate: manual native DE test on Windows using `examples/Greenwood Archers.zip`, recording game build and match settings. Do not claim gameplay compatibility until tested.

Review fixes: `a2a3080` preserves damaged browser drafts with downloadable recovery and makes the policy test start with the attack cooldown unelapsed. Eleven unit tests and the browser workflow, including damaged-draft recovery across reload, pass. The primary-screen screenshots remain representative of this fix commit (recovery notice appears only when a damaged draft exists).
