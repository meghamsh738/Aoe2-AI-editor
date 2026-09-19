# First editor design

Reference: concept.png, built-in Image Gen, 1536 × 1024. Workbench with forest sidebar, neutral off-white workspace, white form panels, dark ink, green actions. No game artwork. Typography: system sans, heading 36px, panel titles 21px, body 16px, toolbar 14px. Sidebar 232px, toolbar 90px, content padding 34px, inspector 340px, 28px gutters. Border #d9dfe0, 8px radii. Resource colors coral, green, amber, slate.

Navigation: Economy, Buildings, Army, Strategy, Testing, Export. Toolbar: Bot name, Britons · Land skirmish, Undo, Redo, Open, Save project, Export bot. Economy copy follows concept; dynamic values reflect the actual project. Core controls are native text, inputs, buttons, and Lucide outline icons. Omit fabricated OS window chrome. All other sections reuse the form panel and inspector system. Mobile: toolbar wraps, horizontal navigation, single-column forms and inspector. No image assets in the product.

Intentional semantic refinements: saving for Feudal begins at completed villager threshold, not queued count. Policy explanations describe target allocations, not guaranteed economic efficiency. Game-test status is always unperformed in this release. Unsupported rules/advanced code are not exposed as fake controls.

Acceptance: edits affect compiler output; strict import and cross-field validation; undo/redo; local persistence; project download; native ZIP; testable compiler; responsive keyboard-accessible UI. Actual game execution is a separate unperformed gate.
