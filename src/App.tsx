import { useEffect, useMemo, useRef, useState } from "react";
import {
  Layers,
  Search,
  History,
  Link as LinkIcon,
  Video,
  Youtube,
  X,
  ExternalLink,
  Landmark,
  CheckCircle2,
  Database,
  Loader2,
  AlertCircle,
  ArrowRight,
  Download,
  Upload,
  Check,
  Copy,
  ChevronDown,
  Globe,
  FileText,
} from "lucide-react";
import { archives, categories, ArchiveService } from "./data/archives";
import {
  automaticArchiveIds,
  checkTargetAvailability,
  Availability,
} from "./services/availability";
import {
  parseTarget,
  reviewedForTarget,
  toggleReviewed,
} from "./services/targets";
import { readHistoryBackup, mergeReviewed } from "./services/history";

type Page = "search" | "history" | "sources";
type Results = Record<string, Availability>;
type ReportFormat = "markdown" | "text" | "json";
const keys = {
  checked: "webarchive_checked_by_target_v2",
  recent: "webarchive_recent_urls",
  legacy: "webarchive_checked",
  view: "webarchive_view_mode",
};
function load<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
function download(
  content: string,
  filename: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function captureDate(timestamp?: string) {
  if (!timestamp || !/^\d{14}$/.test(timestamp)) return "Date unavailable";
  const d = new Date(
    `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}T${timestamp.slice(8, 10)}:${timestamp.slice(10, 12)}:${timestamp.slice(12, 14)}Z`,
  );
  return Number.isNaN(d.getTime())
    ? "Date unavailable"
    : d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
}
function SourceIcon({ id, size = 34 }: { id: string; size?: number }) {
  return id === "wayback" ? (
    <Landmark size={size} strokeWidth={1.6} />
  ) : (
    <Layers size={size} strokeWidth={1.6} />
  );
}
function resultLabel(result?: Availability) {
  if (!result) return "Not checked";
  if (result.status === "found")
    return result.evidenceType === "watch-page"
      ? "Watch page found"
      : "Archive record found";
  return result.status === "checking"
    ? "Checking archive…"
    : result.status === "not-found"
      ? "No snapshot found"
      : "Could not check";
}

export default function App() {
  const [page, setPage] = useState<Page>("search");
  const [input, setInput] = useState("");
  const target = useMemo(() => parseTarget(input), [input]);
  const valid = Boolean(target.canonicalUrl);
  const [recent, setRecent] = useState<string[]>(() => {
    const value = load<unknown>(keys.recent, []);
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string")
      : [];
  });
  const [reviewed, setReviewed] = useState<Record<string, string[]>>(() => {
    const value = load<unknown>(keys.checked, {});
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, string[]>)
      : {};
  });
  const [legacy, setLegacy] = useState<string[]>(() => {
    const value = load<unknown>(keys.legacy, []);
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string")
      : [];
  });
  const [lookups, setLookups] = useState<Record<string, Results>>({});
  const results = lookups[target.key] || {};
  const checked = useMemo(
    () => reviewedForTarget(reviewed, target.key),
    [reviewed, target.key],
  );
  const checking = Object.values(results).some((r) => r.status === "checking");
  const controller = useRef<AbortController | null>(null);
  const [notice, setNotice] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [manualDate, setManualDate] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [category, setCategory] = useState("all");
  const [historyFilter, setHistoryFilter] = useState("");
  const [compact, setCompact] = useState(
    () => load<string>(keys.view, "detailed") === "compact",
  );
  const [showReport, setShowReport] = useState(false);
  const [reportFormat, setReportFormat] = useState<ReportFormat>("markdown");
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!save(keys.checked, reviewed))
      setNotice(
        "Browser storage is full or unavailable. Export a backup to keep your progress.",
      );
  }, [reviewed]);
  useEffect(() => {
    if (!save(keys.recent, recent))
      setNotice("History could not be saved in this browser. Export a backup.");
  }, [recent]);
  useEffect(() => {
    save(keys.legacy, legacy);
  }, [legacy]);
  useEffect(() => {
    save(keys.view, compact ? "compact" : "detailed");
  }, [compact]);
  useEffect(() => {
    setExpanded(null);
    return () => {
      controller.current?.abort();
    };
  }, [target.key]);
  // Cancelled requests must not leave a permanently disabled Check button on revisiting a target.
  useEffect(() => {
    setLookups((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([key, rows]) => [
          key,
          Object.fromEntries(
            Object.entries(rows).map(([id, row]) => [
              id,
              row.status === "checking"
                ? {
                    ...row,
                    status: "error" as const,
                    message: "Check cancelled. Run the lookup again.",
                  }
                : row,
            ]),
          ),
        ]),
      ),
    );
  }, [target.key]);

  const remember = (url: string) =>
    setRecent((prev) =>
      [
        url,
        ...prev.filter((u) => parseTarget(u).key !== parseTarget(url).key),
      ].slice(0, 1000),
    );
  const runCheck = async () => {
    if (!valid || checking) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const key = target.key;
    const variants = target.variants;
    remember(target.canonicalUrl);
    setNotice("");
    setLookups((prev) => ({
      ...prev,
      [key]: Object.fromEntries(
        automaticArchiveIds.map((id) => [
          id,
          { status: "checking", message: "Checking archive…" },
        ]),
      ),
    }));
    await Promise.all(
      automaticArchiveIds.map(async (id) => {
        const result = await checkTargetAvailability(
          id,
          variants,
          request.signal,
        );
        if (!request.signal.aborted)
          setLookups((prev) => ({
            ...prev,
            [key]: { ...prev[key], [id]: result },
          }));
      }),
    );
  };
  const toggle = (id: string) => {
    if (valid) {
      setReviewed((prev) => toggleReviewed(prev, target.key, id));
      remember(target.canonicalUrl);
    }
  };
  const exportBackup = () => {
    download(
      JSON.stringify(
        {
          format: "archive-research-history",
          version: 1,
          exportedAt: new Date().toISOString(),
          recentUrls: recent,
          checkedByTarget: reviewed,
          legacyChecked: legacy,
        },
        null,
        2,
      ),
      `archive-research-history-${new Date().toISOString().slice(0, 10)}.json`,
    );
    setNotice(
      "History backup downloaded. Import it on another browser or device.",
    );
  };
  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 5000000)
        throw new Error("History backup must be smaller than 5 MB.");
      const backup = readHistoryBackup(JSON.parse(await file.text()));
      setReviewed((prev) => mergeReviewed(prev, backup.checkedByTarget));
      setRecent((prev) =>
        [...new Set([...prev, ...backup.recentUrls])].slice(0, 1000),
      );
      setLegacy((prev) => [...new Set([...prev, ...backup.legacyChecked])]);
      setNotice(
        `Imported ${backup.recentUrls.length} history entries. Existing review marks were preserved.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not import the history backup.",
      );
    }
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Copied to clipboard.");
    } catch {
      setNotice(
        "Clipboard access is unavailable. You can download a report instead.",
      );
    }
  };
  const filteredSources = archives.filter(
    (a) =>
      (category === "all" || a.category === category) &&
      `${a.name} ${a.country} ${a.description}`
        .toLowerCase()
        .includes(sourceFilter.toLowerCase()),
  );
  const reportRows = filteredSources.map((a) => ({
    source: a.name,
    originalUrl: input,
    canonicalUrl: target.canonicalUrl,
    searchUrl: valid
      ? a.searchUrl(target.canonicalUrl, manualDate || undefined)
      : a.homepage,
    reviewed: checked.has(a.id),
    availability: results[a.id] || {
      status: automaticArchiveIds.some((id) => id === a.id)
        ? "not-checked"
        : "manual",
    },
  }));
  const report =
    reportFormat === "json"
      ? JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            target: target.canonicalUrl,
            manualSearchDate: manualDate || null,
            results: reportRows,
          },
          null,
          2,
        )
      : [
          reportFormat === "markdown"
            ? "# Archive Research Report"
            : "ARCHIVE RESEARCH REPORT",
          `URL: ${target.canonicalUrl}`,
          "Automatic checks cover all dates. A watch-page record does not verify video playback.",
          "",
          ...reportRows.map(
            (row) =>
              `${row.reviewed ? "[x]" : "[ ]"} ${row.source}\nStatus: ${row.availability.status}\n${row.searchUrl}${"snapshotUrl" in row.availability && row.availability.snapshotUrl ? `\nSnapshot: ${row.availability.snapshotUrl}` : ""}`,
          ),
        ].join("\n\n");
  const foundCount = Object.values(results).filter(
    (r) => r.status === "found",
  ).length;
  const hasResults = Object.keys(results).length > 0;
  const videoTarget = target.kind.startsWith("youtube");
  const manualIds = videoTarget
    ? ["ghost-archive", "filmot", "archivarix-tube"]
    : ["ghost-archive", "archive-it", "archivarix-echo"];
  const manualSources = manualIds.map((id) =>
    archives.find((a) => a.id === id)!,
  );
  const label =
    target.kind === "youtube-video"
      ? "YouTube video"
      : target.kind === "youtube-playlist"
        ? "YouTube playlist"
        : target.kind === "youtube-channel"
          ? "YouTube channel"
          : "Web URL";
  const navigate = (next: Page) => {
    setPage(next);
    setNotice("");
    window.scrollTo({ top: 0 });
  };
  const revisit = (url: string) => {
    setInput(url);
    navigate("search");
  };
  const renderSource = (archive: ArchiveService) => (
    <article
      className={`source-row ${compact ? "is-compact" : ""}`}
      key={archive.id}
    >
      <div className="source-identity">
        <Globe size={23} strokeWidth={1.5} />
        <div>
          <h3>{archive.name}</h3>
          <span className="source-country">
            {archive.country} ·{" "}
            {automaticArchiveIds.some((id) => id === archive.id)
              ? "Automatic lookup"
              : "Manual lookup"}
          </span>
          {!compact && (
            <>
              <p>{archive.description}</p>
              {archive.instructions && (
                <p className="source-instructions">{archive.instructions}</p>
              )}
            </>
          )}
        </div>
      </div>
      <div className="source-actions">
        {valid && (
          <button
            className={`review-button ${checked.has(archive.id) ? "is-reviewed" : ""}`}
            aria-pressed={checked.has(archive.id)}
            onClick={() => toggle(archive.id)}
          >
            <Check size={15} />
            {checked.has(archive.id) ? "Reviewed" : "Mark reviewed"}
          </button>
        )}
        <a
          href={
            valid
              ? archive.searchUrl(target.canonicalUrl, manualDate || undefined)
              : archive.homepage
          }
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            if (valid) remember(target.canonicalUrl);
          }}
        >
          {archive.linkLabel || (valid ? "Open search" : "Visit source")}
          <ExternalLink size={16} />
        </a>
        {valid && (
          <button
            className="icon-button"
            aria-label={`Copy ${archive.name} search URL`}
            onClick={() =>
              void copy(
                archive.searchUrl(target.canonicalUrl, manualDate || undefined),
              )
            }
          >
            <Copy size={16} />
          </button>
        )}
      </div>
    </article>
  );

  return (
    <div className="research-app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Main navigation">
        <a
          className="brand"
          href="#search"
          onClick={(e) => {
            e.preventDefault();
            navigate("search");
          }}
        >
          <Layers size={37} strokeWidth={1.5} />
          <span>
            <strong>
              Archive <br />
              Research
            </strong>
            <small>Research Desk</small>
          </span>
        </a>
        <nav>
          {(
            [
              { id: "search", text: "Search", Icon: Search },
              { id: "history", text: "History", Icon: History },
              { id: "sources", text: "Sources", Icon: Layers },
            ] as const
          ).map(({ id, text, Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              aria-current={page === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={27} strokeWidth={1.6} />
              <span>{text}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main id="main" className={`workspace page-${page}`}>
        {page === "search" && (
          <>
            <header className="page-heading">
              <h1>Find what the web remembers</h1>
              <p>
                Look up web pages, documents, and videos in major web archives.
              </p>
            </header>
            <form
              className="lookup-form"
              onSubmit={(e) => {
                e.preventDefault();
                void runCheck();
              }}
            >
              <div className="input-wrap">
                <LinkIcon size={27} strokeWidth={1.6} />
                <input
                  ref={inputRef}
                  aria-label="URL to search"
                  placeholder="Paste a URL or YouTube video ID"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
                {input && (
                  <button
                    type="button"
                    className="clear-input"
                    aria-label="Clear URL"
                    onClick={() => {
                      setInput("");
                      inputRef.current?.focus();
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                className="primary-button"
                type="submit"
                disabled={!valid || checking}
              >
                {checking ? (
                  <>
                    <Loader2 className="spin" size={23} />
                    Checking…
                  </>
                ) : (
                  "Check archives"
                )}
              </button>
            </form>
            <div className="input-context">
              {valid ? (
                <>
                  {videoTarget ? (
                    <Youtube size={29} strokeWidth={1.6} />
                  ) : (
                    <Globe size={27} strokeWidth={1.6} />
                  )}
                  <span>
                    Detected: <strong>{label}</strong>
                  </span>
                </>
              ) : (
                <span>
                  {input
                    ? target.kind === "query"
                      ? "Enter a URL or video ID. Keyword discovery is not supported yet."
                      : "Enter a valid web URL or YouTube video ID."
                    : "Try a website address, document link, or YouTube video ID."}
                </span>
              )}
            </div>
            <section
              className="results-section"
              aria-labelledby="results-heading"
            >
              <div className="section-heading">
                <h2 id="results-heading">Archive results</h2>
                <p role="status" aria-live="polite">
                  {checking
                    ? `${foundCount} ${foundCount === 1 ? "match" : "matches"} found · checking archives…`
                    : hasResults
                      ? `${foundCount} ${foundCount === 1 ? "match" : "matches"} found`
                      : "Check a URL to find preserved copies."}
                </p>
              </div>
              <div className="result-list">
                {automaticArchiveIds.map((id) => {
                  const result = results[id];
                  const archive = archives.find((a) => a.id === id)!;
                  const open = expanded === id;
                  return (
                    <div className="result-item" key={id}>
                      <div className="result-row">
                        <button
                          className="provider-name"
                          aria-expanded={open}
                          aria-controls={`details-${id}`}
                          onClick={() => setExpanded(open ? null : id)}
                        >
                          <SourceIcon id={id} />
                          <span>
                            {id === "wayback"
                              ? "Wayback Machine"
                              : "Arquivo.pt"}
                          </span>
                        </button>
                        <div className="capture-date">
                          <span>
                            {result?.status === "found"
                              ? "Captured"
                              : "Availability"}
                          </span>
                          <strong>
                            {result?.status === "found"
                              ? captureDate(result.timestamp)
                              : result?.status === "checking"
                                ? "Checking…"
                                : "All dates"}
                          </strong>
                        </div>
                        <div
                          className={`result-state state-${result?.status || "idle"}`}
                        >
                          {result?.status === "found" ? (
                            <CheckCircle2 size={28} strokeWidth={1.8} />
                          ) : result?.status === "checking" ? (
                            <Loader2 className="spin" size={25} />
                          ) : result?.status === "error" ? (
                            <AlertCircle size={25} />
                          ) : (
                            <span className="state-dot" aria-hidden="true" />
                          )}
                          <span>{resultLabel(result)}</span>
                        </div>
                        <div className="result-action">
                          {result?.snapshotUrl ? (
                            <a
                              href={result.snapshotUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View snapshot
                              <ExternalLink size={20} />
                            </a>
                          ) : valid ? (
                            <a
                              href={archive.searchUrl(target.canonicalUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Search manually
                              <ExternalLink size={18} />
                            </a>
                          ) : (
                            <span>Awaiting URL</span>
                          )}
                        </div>
                      </div>
                      {result?.status === "error" && (
                        <p className="result-error">{result.message}</p>
                      )}
                      {open && (
                        <div className="result-details" id={`details-${id}`}>
                          <p>
                            <strong>
                              {result?.status === "found"
                                ? "Archive evidence"
                                : "Lookup details"}
                            </strong>
                          </p>
                          <p>
                            {result?.message ||
                              "This provider has not been checked for the current URL."}
                          </p>
                          {result?.queriedUrl && (
                            <p>
                              Queried URL:{" "}
                              <span className="break-url">
                                {result.queriedUrl}
                              </span>
                            </p>
                          )}
                          {result?.checkedAt && (
                            <p>
                              Checked:{" "}
                              {new Date(result.checkedAt).toLocaleString(
                                "en-GB",
                              )}
                            </p>
                          )}
                          {result?.attemptedUrls && (
                            <p>
                              {result.attemptedUrls.length} URL{" "}
                              {result.attemptedUrls.length === 1
                                ? "form"
                                : "forms"}{" "}
                              checked.
                            </p>
                          )}
                          <p>Opening a result does not mark it reviewed.</p>
                          <button
                            disabled={!valid}
                            className={`review-button ${checked.has(id) ? "is-reviewed" : ""}`}
                            aria-pressed={checked.has(id)}
                            onClick={() => toggle(id)}
                          >
                            <Check size={16} />
                            {checked.has(id) ? "Reviewed" : "Mark reviewed"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="evidence-note">
                {videoTarget
                  ? "Video file not verified."
                  : "An archive record confirms a capture, not the completeness of its contents."}
              </p>
              {hasResults && !checking && foundCount === 0 && (
                <p className="lookup-explanation">
                  No confirmed copies were returned by these two services. Other
                  archives may still hold this URL.
                </p>
              )}
            </section>
            <section
              className="manual-section"
              aria-labelledby="manual-heading"
            >
              <h2 id="manual-heading">Search manually</h2>
              <div className="manual-links">
                <span>Try additional archives for this URL:</span>
                {manualSources.map((archive) =>
                  valid ? (
                    <a
                      key={archive.id}
                      href={archive.searchUrl(
                        target.canonicalUrl,
                        manualDate || undefined,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => remember(target.canonicalUrl)}
                    >
                      <ExternalLink size={19} />
                      {archive.name}
                    </a>
                  ) : (
                    <a
                      key={archive.id}
                      href={archive.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={19} />
                      {archive.name}
                    </a>
                  ),
                )}
              </div>
              <details className="advanced-options">
                <summary>
                  More sources & search options
                  <ChevronDown size={15} />
                </summary>
                <div>
                  <label>
                    Preferred date for manual searches
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                    />
                  </label>
                  <p>
                    Automatic checks cover all dates. Manual date support varies
                    by source and may return the nearest capture.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => navigate("sources")}
                  >
                    Browse all {archives.length} sources
                    <ArrowRight size={16} />
                  </button>
                </div>
              </details>
            </section>
          </>
        )}
        {page === "history" && (
          <>
            <header className="page-heading">
              <h1>Your research trail</h1>
              <p>Return to previous targets and pick up where you left off.</p>
            </header>
            <div className="page-toolbar">
              <div className="filter-input">
                <Search size={20} />
                <input
                  aria-label="Filter history"
                  placeholder="Find a URL or video…"
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                />
              </div>
              <button className="secondary-button" onClick={exportBackup}>
                <Download size={18} />
                Export backup
              </button>
              <button
                className="secondary-button"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={18} />
                Import backup
              </button>
            </div>
            <p className="muted">
              {recent.length} saved {recent.length === 1 ? "target" : "targets"}{" "}
              · Stored in this browser. Import a backup to move history from
              localhost or another device.
            </p>
            {legacy.length > 0 && (
              <p className="information-note">
                {legacy.length} earlier global checklist marks are preserved in
                backups. Their original targets are unknown, so they are kept
                separate.
              </p>
            )}
            <div className="history-list">
              {recent
                .filter((url) =>
                  url.toLowerCase().includes(historyFilter.toLowerCase()),
                )
                .map((url) => {
                  const item = parseTarget(url);
                  const count = reviewedForTarget(reviewed, item.key).size;
                  return (
                    <article className="history-row" key={url}>
                      <span className="history-icon">
                        {item.kind.startsWith("youtube") ? (
                          <Video size={25} />
                        ) : (
                          <FileText size={25} />
                        )}
                      </span>
                      <button
                        className="history-target"
                        onClick={() => revisit(url)}
                      >
                        <strong>{url.replace(/^https?:\/\//, "")}</strong>
                        <span>
                          {item.kind.replace(/-/g, " ")} · {count}{" "}
                          {count === 1 ? "source" : "sources"} reviewed
                        </span>
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Remove ${url} from recent history`}
                        onClick={() =>
                          setRecent((prev) => prev.filter((u) => u !== url))
                        }
                      >
                        <X size={19} />
                      </button>
                    </article>
                  );
                })}
            </div>
            {recent.length === 0 && (
              <div className="empty-state">
                <History size={34} strokeWidth={1.4} />
                <h2>A place for your next discovery</h2>
                <p>Checked targets and reviewed sources will appear here.</p>
                <button
                  className="text-button"
                  onClick={() => navigate("search")}
                >
                  Start a lookup
                  <ArrowRight size={17} />
                </button>
              </div>
            )}
            {recent.length > 0 &&
              recent.filter((url) =>
                url.toLowerCase().includes(historyFilter.toLowerCase()),
              ).length === 0 && (
                <p className="empty-state">
                  No history entries match this filter.
                </p>
              )}
          </>
        )}
        {page === "sources" && (
          <>
            <header className="page-heading">
              <h1>Follow the sources</h1>
              <p>
                Explore {archives.length} archive and research tools. Two
                support automatic lookups.
              </p>
            </header>
            {valid && (
              <div className="current-target">
                <LinkIcon size={19} />
                <span>
                  Searching for <strong>{target.canonicalUrl}</strong>
                </span>
                <button
                  className="text-button"
                  onClick={() => navigate("search")}
                >
                  Change URL
                </button>
              </div>
            )}
            <div className="page-toolbar">
              <div className="filter-input">
                <Search size={20} />
                <input
                  aria-label="Filter sources"
                  placeholder="Filter sources or countries…"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                />
              </div>
              <select
                aria-label="Source category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option value={cat.id} key={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <button
                className="secondary-button"
                aria-pressed={compact}
                onClick={() => setCompact((v) => !v)}
              >
                {compact ? "Detailed view" : "Compact view"}
              </button>
            </div>
            <div className="source-subtoolbar">
              <p>
                {filteredSources.length} sources · {checked.size} reviewed for
                this target
              </p>
              <button
                disabled={!valid}
                className="text-button"
                onClick={() => setShowReport((v) => !v)}
              >
                Export report
                <Download size={16} />
              </button>
              <button
                disabled={!valid}
                className="text-button"
                onClick={() =>
                  void copy(
                    filteredSources
                      .map(
                        (a) =>
                          `${a.name}: ${a.searchUrl(target.canonicalUrl, manualDate || undefined)}`,
                      )
                      .join("\n"),
                  )
                }
              >
                Copy links
                <Copy size={16} />
              </button>
            </div>
            {showReport && valid && (
              <section className="report-panel" aria-label="Export report">
                <div className="report-toolbar">
                  <h2>Export report</h2>
                  <select
                    aria-label="Report format"
                    value={reportFormat}
                    onChange={(e) =>
                      setReportFormat(e.target.value as ReportFormat)
                    }
                  >
                    <option value="markdown">Markdown</option>
                    <option value="text">Plain text</option>
                    <option value="json">JSON</option>
                  </select>
                  <button
                    className="text-button"
                    onClick={() => void copy(report)}
                  >
                    Copy
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      download(
                        report,
                        `archive-research-report.${reportFormat === "markdown" ? "md" : reportFormat === "json" ? "json" : "txt"}`,
                        reportFormat === "json"
                          ? "application/json"
                          : "text/plain",
                      )
                    }
                  >
                    Download
                  </button>
                </div>
                <pre>{report}</pre>
              </section>
            )}
            <div className="source-list">
              {filteredSources.map(renderSource)}
            </div>
            {filteredSources.length === 0 && (
              <p className="empty-state">No sources match these filters.</p>
            )}
            <p className="catalogue-note">
              A listed service is a search lead, not a confirmed match. Access
              and coverage vary; the full directory has not been independently
              verified.
            </p>
          </>
        )}
        <footer className="workspace-footer">
          <Database size={24} strokeWidth={1.5} />
          <span>
            History saved in this browser ·{" "}
            <button className="inline-link" onClick={exportBackup}>
              Export backup
            </button>
          </span>
          {page !== "history" && (
            <button
              className="footer-import"
              onClick={() => {
                navigate("history");
              }}
            >
              Import history
            </button>
          )}
        </footer>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="visually-hidden"
          aria-label="Import history backup"
          onChange={(e) => {
            void importBackup(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={17} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
