# Design QA — Archive Research

final result: passed

## Comparison target and evidence

- Selected visual truth: `docs/design/reference.png` (the user's chosen Research Desk mockup).
- Implementation: http://127.0.0.1:3000/.
- Desktop capture: `docs/design/desktop.png`.
- Full-view comparison: `docs/design/comparison.png`, reference left and implementation right in one image.
- Focused results comparison: `docs/design/results-comparison.png`, reference left and implementation right.
- Mobile capture: `docs/design/mobile.png`.
- Desktop source/browser dimensions: 1487 × 1058 physical pixels; browser viewport 1487 × 1058 CSS pixels, 1:1 density. No density rescaling was needed. The browser screenshot is content-only, without browser chrome.
- Mobile viewport: 375 × 812 CSS pixels, full-page capture for the expanded evidence state.
- State: canonical YouTube video lookup, two real watch-page records, Search selected. Live capture dates differ from the illustrative dates in the mock. The mobile capture additionally shows the evidence-details interaction that the desktop mock leaves collapsed.

## Comparison history

### Iteration 1 — blocked

Initial comparison showed actionable P2 differences:
- Result rows were 126px tall, shifting the manual sources and footer below their intended positions.
- Sidebar/main-content alignment was 10px too far left and result columns did not align with the reference.
- Result/manual links lost underlining through CSS defaults.
- Headline font metrics made the text visibly wider than the target.

Applied fixes: 100px desktop result rows; tighter list margin; 240px sidebar; rebalanced grid columns; explicit link underlines; Times serif headline with matched scale; rectangular YouTube indicator icon; adjusted footer rhythm. Post-fix evidence is in the full-view and focused comparison files above.

### Iteration 2 — passed

No actionable P0/P1/P2 mismatches remain.

## Required fidelity surfaces

- **Fonts and typography:** large bold serif headline with Times-family metrics matches the selected editorial direction; Arial interface type, source labels, date hierarchy, and underlined action links retain the reference's legibility. No external font dependency. The real URL is editable and may truncate within the input on small screens.
- **Spacing and layout:** sidebar, input/action proportions, two aligned result rows, manual links, and footer match the reference's major geometry. Collapsed provenance and advanced search preserve prior functionality without crowding the default composition. Mobile switches to top navigation and stacked form/results with no horizontal overflow.
- **Colours and tokens:** warm off-white base, warm grey sidebar, charcoal text, restrained blue primary action/links, pale blue active navigation, and quiet dividers. Status words accompany icons and colour.
- **Asset fidelity:** this reference contains standard interface icons and no photographic/raster content to generate. Installed Lucide Layers, Landmark, YouTube, Search, History, and external-link icons provide the matching stroke style. No emoji, placeholder imagery, custom SVG illustrations, or fake playable-media assets were introduced.
- **Copy and content:** main headline, subtitle, source labels, manual-search heading, and local-history footer follow the selected visual. Dynamic real results replace illustrative values; the UI explicitly distinguishes a watch-page capture from preserved video playback. Additional History/Sources screens and advanced options preserve the existing app's functionality.

## Interaction verification

- Enter canonical YouTube URL, submit, and receive live results from both automatic providers.
- Expand provider details, inspect queried URL/check time, and toggle review status.
- Open History and verify target-specific review progress.
- Open Sources, filter Ghostarchive, and inspect the `.org` search link with the canonical URL encoded.
- Open report panel, switch to JSON, parse the displayed report, and verify target/source status.
- Check Search, History, and Sources at 375px: document width equals viewport width; no overflow.
- Check browser console: no errors in the verification session.
- TypeScript, production build, and 19 automated service/history/normalisation tests pass.

## Follow-up polish (P3)

- Standard library icons differ slightly from the illustrative mock's individual strokes.
- Live source/date text and the additional advanced-options/import links create minor copy/spacing differences from the illustrative screenshot.
- Large source catalogues and external providers remain subject to access restrictions and changing availability; this visual pass does not claim a complete catalogue audit.

## Implementation checklist

- [x] Resolve the selected visual target.
- [x] Implement the responsive Search/History/Sources interface.
- [x] Preserve local history, backup/import, source filtering, report formats, and target-specific review state.
- [x] Compare desktop full view and focused results region; fix P2 drift.
- [x] Verify mobile layout, core interactions, and console health.
- [x] Pass tests and production build before release.
