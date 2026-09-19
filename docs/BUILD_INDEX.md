# Build index

Current build: **Adaptive Workshop v2**, implementation commit `bbef3f1`, branch `codex/adaptive-workshop`. Experimental editor ready for Windows acceptance testing; native DE behaviour remains **UNVERIFIED**.

| Version | Branch / implementation commit | Status | Evidence | Validation |
|---|---|---|---|---|
| Adaptive Workshop v2 | `codex/adaptive-workshop` / `bbef3f1` | Experimental implementation; Windows acceptance open | `design-review/builds/adaptive-editor/` (including legacy regression views) | 43 automated tests, production build, both browser workflows and regenerated preset ZIPs pass |
| First editor | `codex/ai-workshop-mvp` / `8ae8d6a` | Review-ready experimental editor; native game gate open | `design-review/builds/first-editor/desktop.png`, `laptop.png`, `mobile.png`, `export.png` | Build, 11 unit tests, real-browser workflow and download checks pass; production dependency audit clean |

Authoritative root: `/Users/meghamsh/Documents/Codex/2026-09-19/new-chat-2/outputs/aoe2-ai-workshop`.

The original first-editor build was published to https://github.com/meghamsh738/Aoe2-AI-editor on branch `codex/ai-workshop-mvp`. Remote was empty before the first push. HTTPS uses the existing GitHub CLI login because SSH authentication was unavailable. No Drive publication yet. This is a new project, separate from the user's hotkey editor. Browser preview runs from the authoritative root at `http://127.0.0.1:5173`.

Design reference: `docs/concept.png` (built-in Image Gen). Detailed comparison, deliberate differences and verification methods: `docs/VERIFICATION.md`. Prompt: `docs/CONCEPT_PROMPT.md`.

Current gate: use `examples/adaptive/Workshop-Windows-Test-Kit.zip` and both preset ZIPs in `examples/adaptive/`. Run the probes, ten requested seed matches and targeted disruptions. Record exact game build, settings, actual seed, exported project, errors and replay/save. Native compatibility is not established by the passing editor checks. Detailed evidence and limitations: `docs/ADAPTIVE_VERIFICATION.md` and `docs/ADAPTIVE_DESIGN.md`.

Review fixes: `a2a3080` preserves damaged browser drafts with downloadable recovery and makes the policy test start with the attack cooldown unelapsed. Eleven unit tests and the browser workflow, including damaged-draft recovery across reload, pass. The primary-screen screenshots remain representative of this fix commit (recovery notice appears only when a damaged draft exists).
