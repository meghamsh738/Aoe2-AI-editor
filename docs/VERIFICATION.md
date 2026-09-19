# First editor verification

## Functional checks

- `npm run build`: TypeScript + production bundle pass. Two harmless upstream Zod annotation warnings are stripped by the bundler.
- `npm test`: 10 passing tests. Covers strict schema, unsafe names, numeric bounds, semantic conflicts, queued/completed counts, age guards, attack cooldown, rule source maps, independent policy gates and archive contents.
- `node scripts/browser-check.mjs`: real browser edits, undo/redo, project download, valid and invalid imports, actual ZIP download and decompression, invalid export blocking, reload persistence, every mobile section, and page-error check pass.
- `npm audit --omit=dev --audit-level=high`: no reported production vulnerabilities.
- IAB background checks: editing, source updates, undo, policy readiness, imports and reload persistence passed. IAB's download event timed out; headless Playwright was used to verify the real ZIP and produce reproducible screenshots. Full-page mobile IAB capture had stitching artifacts; headless capture replaced it.
- Native AoE II DE execution: NOT PERFORMED. No certified game build. The exported sample is experimental.

## Visual comparison and copy ledger

Compared `docs/concept.png` and `design-review/builds/first-editor/desktop.png` with view_image, at the concept's native 1536 × 1024 size. Also inspected 1280 × 800 laptop and 390 × 844 mobile viewport, plus full mobile document and export view.

| Check | Evidence and outcome |
|---|---|
| Composition | Same 232px forest rail, white toolbar, form column and 372px inspector. Fixed inspector width after first render. |
| Palette | Neutral off-white canvas, white panels, forest rail, green actions and coral/green resource bar; no photographic assets or gradients introduced. |
| Typography | Sans-serif hierarchy, 36px page title, 21px panel titles, 14–16px controls and explanatory text. Platform font rendering differs slightly from the generated image. |
| Controls and spacing | Matching age tabs, numeric inputs, 8px panel corners. Fixed villager control's horizontal desktop label placement. Native spinners render per browser. |
| Copy | Navigation, toolbar actions, headings and core descriptions preserved. Intentional refinements clarify completed villagers, research completion, true archer targets and cooldown semantics; no strategic strength claims copied from the concept. |
| Iconography | Consistent Lucide outline family for navigation/actions. Economy and warning icons use outline variants instead of the generated filled versions. |
| Responsive layout | Rail becomes scrollable horizontal navigation; toolbar wraps; resources become two columns; inspector follows content. All six sections measured with no document overflow at 390px. |
| Assets | No Microsoft game art or screenshot-as-UI. Concept is a design reference only. Generated OS window buttons intentionally omitted from the web app. |

The implemented design was visually checked against the concept and faithfully preserves the workbench layout and design system with the explicit semantic, icon and browser-native differences above. No clipped form content or accidental horizontal document overflow remains. This is visual verification, not pixel-identical certification or user design approval.

## Remaining scope limits

One civilization/profile; Feudal-only archers; no native game test, executable installer, cloud publishing, custom rules, later ages or unit upgrades. Policy testing is a limited predicate checker, not a game simulator. See README for native acceptance steps.
