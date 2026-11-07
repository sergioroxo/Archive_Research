# Deployment and history

The app is linked to `surviving-sogice/archive-research` on Vercel.

Production URL: https://archive-research.vercel.app

- Framework: Vite / React.
- Build command: `npm run build`.
- Output: `dist`.
- Node: 22.x, declared in package.json.
- No database or cloud history sync is configured yet.
- GitHub source: https://github.com/sergioroxo/Archive_Research. Vercel is connected to this repository with `main` as its production branch. Pushing `main` triggers production deployment; the CLI remains available for manual releases.

## Validate and release

Run `npm test`, `npm run typecheck`, and `npm run build` before deployment. With the Vercel CLI installed and signed in, run `vercel project inspect` to verify the linked project, then `vercel deploy --prod --scope surviving-sogice` from this directory. Verify the returned production URL after deployment.

The `.vercel` directory and environment files are ignored. Never commit them or include them in a history backup. The app requires no API secrets for its current two direct archive lookups.

## Move local history to the hosted app

Browser storage is scoped to the site address. Localhost history does not automatically move to the Vercel site.

1. Open the old app at http://localhost:3000/ in the same browser that contains the history.
2. Choose **Download history backup**.
3. Open the hosted app and choose **Import history backup**.
4. Select the downloaded JSON file. Existing target review marks are merged rather than replaced.

The backup contains recent URLs, target-specific review marks, and earlier global checklist marks. Earlier global marks remain separate because their original target is unknown. A report export is not a complete history backup.

A backup is a local file. Importing it does not upload it to Vercel or a database. History remains browser-local until a future authenticated sync integration is implemented.

## Current lookup limits

Automatic checks query Wayback availability and Arquivo.pt URL history, across all dates. YouTube inputs are canonicalised; up to four documented URL forms are checked sequentially per service. Provider errors stop further variants for that provider. Positive and negative responses are cached in memory for five minutes. A found watch page is not a verified video file. Ghostarchive and other directory entries are manual external lookups.

## Follow-up work

The wider source directory still needs a full service-by-service capability audit. Git-based auto-deploy, authenticated project sync, evidence files, OCR, transcripts, and the visual redesign are separate follow-up phases from IMPROVEMENT_PLAN.md.
