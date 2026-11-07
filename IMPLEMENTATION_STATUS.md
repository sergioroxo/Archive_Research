# Implementation status — 7 November 2026

## Delivered in this pass

- A shared target parser recognises web URLs, YouTube videos (including bare IDs), playlists, and channels. Unsupported text is identified as a query instead of being treated as a URL.
- YouTube aliases share a canonical watch URL and progress key. Automatic availability checks try a bounded list of up to four equivalent URL forms, stop on service errors, and cache valid responses for five minutes in session memory.
- Review progress is scoped per target and persists locally. Earlier global checklist data is preserved separately because its target cannot be reconstructed.
- Lookup results distinguish archived watch-page records from verified video files. No playable-video verification is claimed.
- Ghostarchive uses its verified `.org` search endpoint. Obsolete Google/Bing cache links were replaced with explicitly labelled live-web reference searches.
- History backup and import support moving recent URLs and per-target progress between site origins/browsers. Imports merge existing marks and validate the backup structure.
- Vercel project `surviving-sogice/archive-research` is configured, linked, and deployed at https://archive-research.vercel.app.
- Automated coverage: 19 passing tests for link handling, input normalisation, progress isolation, archive responses, cancellation, and backup/import behaviour. TypeScript and production build pass.

## Verified in the browser

- A YouTube target's review mark does not appear on an unrelated URL.
- Short, canonical, Shorts, and bare-ID forms share the video target's mark.
- Review state survives reload.
- History backup downloads and imports successfully with an explicit success message.
- The Vercel production site loads and Arquivo.pt returns a watch-page record for a public test video. External service performance can vary; timeout/error states remain distinct from missing evidence.

## Remaining work

- The selected Research Desk design is implemented with working Search, History, and Sources views; responsive and visual verification is recorded in design-qa.md.
- Source-by-source capability review is still incomplete; the directory must not be described as 41 automatic or fully validated integrations.
- Cloud sync, sign-in, private projects, evidence libraries, keyword discovery, document extraction, OCR, transcript ingestion, relationship analysis, and batch processing remain later phases.
- GitHub source is sergioroxo/Archive_Research. Vercel is connected to its main branch for automatic deployments.

The wider roadmap remains in IMPROVEMENT_PLAN.md. This pass delivers functional reliability and Vercel hosting, not the entire five-phase roadmap.

## Additional automatic source

Common Crawl is now an automatic provider. It checks up to three recent crawl indexes, labels index evidence separately, stops on service errors, and never treats an incomplete check as a global absence. Archive-It remains manual because its cross-collection CDX endpoint is temporarily blocked; no documented public Ghostarchive lookup API was found.

The live-web search group now includes Google, Bing, and DuckDuckGo. These are explicitly not historical-cache checks. The catalogue contains 42 tools, of which three support automatic checks. The expanded regression suite has 27 passing tests.
