# Archival Research Workspace — Improvement Plan

Planning baseline: 7 November 2026. This is a proposed roadmap, not a claim that these features are implemented.

## Product goal

Help a researcher recover known sources, discover related material, assess what was actually preserved, and save a traceable evidence collection. Support conversion-practices research through optional project vocabularies and tags while keeping the core product useful for any archival subject.

Primary workflow: choose project → enter URL, identifier, or query → inspect results → verify evidence → save and annotate → export.

## Current baseline

- React/Vite app with 41 directory entries, including aggregators and specialist tools; these are not 41 verified archive integrations.
- Automatic archive-record checks for Wayback Machine and Arquivo.pt only, across all dates.
- Manual external searches for other sources, including YouTube recovery tools.
- Recent URLs, view preference, and a global checklist stored in browser localStorage.
- Markdown, text, and JSON report exports; automatic lookup detail currently appears in JSON.
- Nine automated tests cover lookup handling and video-link generation.

Known gaps: equivalent YouTube URLs are not normalised for automatic lookups; no playable-video verification; progress leaks between URLs; no synced research library; service URLs and capabilities have not been fully audited; directory-style layout exposes too many equally weighted options.

## Phase 1 — Reliable search and honest results (first release)

1. Introduce a shared input parser for web URLs, YouTube video URLs and IDs, playlist links, channel links, domains, and text queries. Text queries must enter a discovery flow rather than being silently converted to HTTPS URLs.
2. Normalise recognised YouTube links to a video ID and canonical watch URL. Check a small documented set of URL variants; preserve both submitted input and actual queried URLs. Deduplicate equivalent video links.
3. Scope review progress to a search target and project. Existing global marks cannot be safely assigned to a specific URL: preserve them separately as legacy data rather than applying them to every target.
4. Separate availability from manual review. Availability: not checked, checking, found, not found, error, unsupported. Review: unreviewed, relevant, irrelevant, needs follow-up. API errors must never become not-found results.
5. Separate evidence types: archive record, archived page, metadata, thumbnail/image, transcript/subtitles, document file, and playable media. A watch-page snapshot must not count as a recovered video.
6. Audit all directory entries. Verify domains, search parameters, content coverage, API support, access restrictions, and last verification date. Remove or mark retired services. Label homepage-only links and aggregators explicitly.
7. Add cancellation, bounded timeouts, retries for transient failures, rate-limit handling, and a short-lived cache. Expose check time and the reason a check could not complete.

Release gate: standard, short, Shorts, live, and embed forms resolve to one video identity; checked progress for one target never changes another; known-positive, known-negative, timeout, rate-limit, malformed-response, and cancellation cases produce correct states. No unsupported source appears automatically checked.

## Phase 2 — Clearer interface and visual design

Design direction: a quiet research desk with warm off-white surfaces, charcoal text, restrained blue actions, and optional dark mode. Use a consistent icon library, readable typography, fewer gradients and badges, and more space between primary tasks. These are proposed defaults to validate in mockups before implementation.

Navigation:
- Search: start a lookup or discover sources.
- Projects: research context, vocabulary, and saved searches.
- Library: saved evidence with filters and annotations.
- History: previous runs, timestamps, and outcomes.
- Sources: full service directory and capability information.

Search screen:
- One prominent input with examples for URL, video ID, domain, and phrase.
- Detected input type, editable project, and one clear primary action.
- Advanced options such as dates, language, and source selection collapsed initially.
- Explain date semantics per provider; never imply that a nearest-date result is an exact-day match.
- Detect YouTube input and prioritise relevant video tools without claiming the remaining sources were searched.

Results screen:
- Show useful results first, followed by unavailable checks and manual tools.
- Filters for material type, provider, capture date, availability, and review status.
- Result rows show title, source, evidence type, capture date, original URL, verification status, and save action.
- A detail panel contains provenance, notes, matched URL, check time, and original/archive links. Do not rely on external sites allowing iframe embedding.
- Support compact list and thumbnail grid where appropriate. Clearly identify fallback thumbnails and unavailable previews.
- Keep manual source browsing separate from confirmed findings; do not equate provider count with result count.

Accessibility and responsiveness:
- Keyboard navigation, visible focus, labelled controls, readable contrast, text alongside status colours, accessible progress announcements, and reduced-motion support.
- Desktop split view; stacked detail view on small screens; no horizontal scrolling at 375px for the core workflow.
- Consistent loading, empty, partial-success, failure, and offline states.

Release gate: validate search, review, save, and return-to-result flows at mobile and desktop widths. Produce and select a visual mockup before implementing the redesign; verify the implementation against it.

## Phase 3 — Durable projects, library, and history

Proposed deployment: GitHub for source control, Vercel for the app and short API tasks, Supabase for sign-in and structured records. Final plan, account, region, and cost choices remain deployment decisions; no resources have been created.

Core records:
- Project: title, description, vocabulary, tags, membership.
- Research target: original input, canonical identity, input type.
- Search run: target, provider scope, query, date settings, timestamps.
- Provider check: status, error, queried URL, checked time, returned evidence.
- Evidence item: original and archive URLs, material type, title, creator, capture/publication/access dates, provider, saved file reference, and checksum when a file is stored.
- Annotation: quotation, page number or media timestamp, researcher note, tags, review status, and linked entities.

Requirements:
- Private collections by default with per-project permissions.
- Optional sign-in while retaining a useful local mode.
- Explicit import of existing local history with deduplication; deployment is a different browser origin, so do not promise automatic localhost migration.
- Autosave indicators, conflict-safe updates, export/import, and backup/restore procedure.
- Store metadata and links first. Decide separately where large files and videos belong; the app database must not become the only preservation copy.

Release gate: saved evidence survives reload and sign-in on another device; accounts cannot read each other's private projects; import/export preserves provenance and annotations; local mode remains understandable when sync is unavailable.

## Phase 4 — Research discovery across material types

1. Add keyword, exact-phrase, title, organisation, domain, and identifier searches, using provider-specific capabilities. Every connector has its own scope and testable result semantics.
2. Provide editable vocabulary sets, aliases, historical organisation names, languages, and date ranges. Conversion-practices terminology is one optional preset, never a hard-coded classification system.
3. Add document workflows: PDF/RTF/document discovery, text extraction, OCR for scans, source quotations with page references, and links to cited organisations or publications.
4. Add video workflows: titles/channels, available transcripts, searchable captions, timestamped excerpts, thumbnails, and separate evidence of actual media preservation. Integrate third parties only through supported access methods; otherwise keep the manual handoff.
5. Add image workflows: file URL/name, nearby captions, OCR, and reverse-image search handoffs. Similarity results are leads, not proof of common origin or identity.
6. Add domain exploration with bounded crawl scope, file-type filters, and snapshot comparison to find removed downloads and changes over time.
7. Add batch lookup with a queue, progress, cancel/resume, deduplication, and provider-specific request budgets.

Release gate: each discovery result identifies its provider, query, evidence type, and limitations; extracted text links back to the source page or timestamp; snippets and inferred relationships require researcher review.

## Phase 5 — Evidence analysis and collaboration

- Link organisations, people, domains, publications, events, and media with a cited basis for each relationship.
- Show capture timelines and document revisions while keeping publication date, archive date, and access date distinct.
- Compare text across snapshots; retain the quoted source and context.
- Save structured citations and export CSV, JSON, Markdown, and citation formats suitable for reference managers; include automatic-check details consistently.
- Add team roles and an activity log only after private single-user workflows are stable.
- Add optional scheduled rechecks for saved targets as a later feature, with user-controlled scope and notifications.

Release gate: a researcher can export a finding, its supporting source, annotations, and retrieval history without depending on the live application. Entity matches and topic labels never silently become factual claims.

## Recommended implementation order

First deliver Phase 1 together with the focused search/results portion of Phase 2. Next add Phase 3 so research work is retained. Expand Phase 4 connector by connector, then introduce Phase 5 analysis features.

Avoid beginning with an exhaustive all-archives search, automated scraping of every service, large video downloads, or automatic subject classification. Each would add complexity before the result model and evidence workflow are reliable.

## First implementation milestone

- Unified YouTube input parsing and canonicalisation.
- Progress scoped per target with explicit legacy-data migration.
- Provider capability audit and accurate manual/automatic labels.
- Clear distinction between archived web pages and preserved media.
- Redesigned search/results mockup and implementation after visual selection.
- Regression tests and browser verification for the full lookup → inspect → mark → revisit flow.

No implementation or deployment is included in this planning change.
